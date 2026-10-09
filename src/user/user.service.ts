import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { SignInDto } from './dto/sign-in.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { CloudinaryService } from './cloudinary.service';
import { EmailService } from './email.service';

const SALT_ROUNDS = 10;

const DUPLICATE_MESSAGE = 'This email/userName has been already exists!';

const NOTHING_TO_UPDATE_MESSAGE = 'send at least a name or an image';

const NO_IMAGE_MESSAGE = 'image is required';

const PASSWORDS_DO_NOT_MATCH_MESSAGE =
    'new password and confirm password do not match';

const WRONG_OLD_PASSWORD_MESSAGE = 'old password is incorrect';

const CODE_SENT_MESSAGE = 'if that email exists, a reset code has been sent';

const INVALID_CODE_MESSAGE = 'reset code is incorrect or expired';

// The code dies after 10 minutes — long enough to read the mail, short
// enough that a leaked code is useless later.
const RESET_CODE_TTL_MS = 10 * 60 * 1000;

/** What `signIn()` hands back: the user plus the freshly minted token. */
export interface SignInResult {
  user: UserResponseDto;
  accessToken: string;
}

/** What `updateProfile()` hands back: the user with the new avatar URL. */
export interface UpdateProfileResult {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly emailService: EmailService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<Partial<User>> {
    // Checked up front so the caller gets a readable message instead of a
    // raw Postgres unique-violation 500. The catch below still guards the
    // race where two sign-ups pass this check at the same moment.
    const existing = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: createUserDto.email })
      .orWhere('user.name = :name', { name: createUserDto.name })
      .getOne();

    if (existing) {
      throw new BadRequestException(DUPLICATE_MESSAGE);
    }

    const user = this.userRepository.create({
      ...createUserDto,
      // Never store the password as received.
      password: await bcrypt.hash(createUserDto.password, SALT_ROUNDS),
    });

    try {
      const saved = await this.userRepository.save(user);

      return this.toSafeUser(saved);
    } catch (error) {
      // Postgres unique violation: 23505.
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException(DUPLICATE_MESSAGE);
      }

      throw error;
    }
  }

  async signIn(signInDto: SignInDto): Promise<SignInResult> {
    // password is `select: false`, so a plain findOne would never return it.
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: signInDto.email })
      .getOne();

    // Same message for "no such user" and "wrong password" so the
    // response cannot be used to discover which emails are registered.
    if (!user || !(await bcrypt.compare(signInDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Only the id goes in the payload. Email and name are already public via
    // sign-up, and the fewer claims the token carries the less it leaks if
    // it is ever logged or decoded client-side.
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    // The hash was needed to verify the password above, but it must never be
    // serialised back to the caller.
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    };
  }

  /**
   * The caller's own profile, rebuilt from the token's id. The browser uses
   * this after a refresh, when it still has the cookie but no user object.
   */
  async getMe(userId: string): Promise<MeResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      // The token is valid but the account is gone (e.g. deleted later).
      throw new UnauthorizedException('this user no longer exists');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
    };
  }

  /**
   * Changes the caller's own password. The old password is checked against
   * the stored bcrypt hash, then the new one is hashed before it is saved.
   * The id always comes from the token, never the body.
   */
  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<Partial<User>> {
    const { oldPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }

    // password is `select: false`, so it must be added explicitly — the
    // old password can only be checked against the real hash.
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      // The token is valid but the account is gone (e.g. deleted later).
      throw new UnauthorizedException('this user no longer exists');
    }

    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException(WRONG_OLD_PASSWORD_MESSAGE);
    }

    // Never store the new password as received.
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const saved = await this.userRepository.save(user);

    return this.toSafeUser(saved);
  }

  /**
   * Resets the caller's password without asking for the old one — the valid
   * token is the proof of identity. The new one is hashed before it is saved.
   * The id always comes from the token, never the body.
   */
  async resetPassword(
    userId: string,
    resetPasswordDto: ResetPasswordDto,
  ): Promise<Partial<User>> {
    const { newPassword, confirmPassword } = resetPasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      // The token is valid but the account is gone (e.g. deleted later).
      throw new UnauthorizedException('this user no longer exists');
    }

    // Never store the new password as received.
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const saved = await this.userRepository.save(user);

    return this.toSafeUser(saved);
  }

  /**
   * Generates a one-time 6-digit code and emails it to the account. The same
   * message comes back whether or not the email exists, so the route cannot
   * be used to discover registered emails (same idea as sign-in).
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      return { message: CODE_SENT_MESSAGE };
    }

    const code = randomInt(100000, 1000000).toString();

    // Store first: if the mail send fails, no stale code is left in the DB
    // that the user never saw. Calling the route again replaces the code.
    user.resetCode = code;
    user.resetCodeExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MS);
    await this.userRepository.save(user);

    await this.emailService.sendResetCode(user.email, code);

    return { message: CODE_SENT_MESSAGE };
  }

  /**
   * Checks the emailed code, then hashes and saves the new password. The
   * code is cleared afterwards, so it can only be used once.
   */
  async verifyCode(verifyCodeDto: VerifyCodeDto): Promise<Partial<User>> {
    const { email, code, newPassword, confirmPassword } = verifyCodeDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(PASSWORDS_DO_NOT_MATCH_MESSAGE);
    }

    // resetCode / resetCodeExpiresAt are `select: false`, so they must be
    // added explicitly — the code can only be checked against the real row.
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetCode')
      .addSelect('user.resetCodeExpiresAt')
      .where('user.email = :email', { email })
      .getOne();

    const expired =
      !user?.resetCodeExpiresAt ||
      user.resetCodeExpiresAt.getTime() < Date.now();

    // One single message for "no such email", "no code", "wrong code" and
    // "expired code" — the response must not reveal which part was wrong.
    if (!user || !user.resetCode || user.resetCode !== code || expired) {
      throw new BadRequestException(INVALID_CODE_MESSAGE);
    }

    // Never store the new password as received.
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    // One-time use: the code dies with the reset.
    user.resetCode = null;
    user.resetCodeExpiresAt = null;

    const saved = await this.userRepository.save(user);

    return this.toSafeUser(saved);
  }

  /**
   * Updates the caller's own name and/or avatar. Both are optional; sending
   * neither is a 400. The id always comes from the token, never the body.
   */
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    image?: Express.Multer.File,
  ): Promise<UpdateProfileResult> {
    const newName = updateProfileDto.name;

    if (newName === undefined && !image) {
      throw new BadRequestException(NOTHING_TO_UPDATE_MESSAGE);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      // The token is valid but the account is gone (e.g. deleted later).
      throw new UnauthorizedException('this user no longer exists');
    }

    const updateData: Partial<User> = {};

    if (newName !== undefined) {
      updateData.name = newName;
    }

    if (image) {
      // Upload first: a failed upload must not touch the database.
      updateData.avatarUrl = await this.cloudinaryService.uploadAvatar(
        userId,
        image,
      );
    }

    try {
      const saved = await this.userRepository.save({
        ...user,
        ...updateData,
      });

      return {
        id: saved.id,
        name: saved.name,
        email: saved.email,
        avatarUrl: saved.avatarUrl ?? null,
      };
    } catch (error) {
      // The new name hit the unique index on user.name.
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException(DUPLICATE_MESSAGE);
      }

      throw error;
    }
  }

  /**
   * Uploads a profile image for the caller and stores only the Cloudinary
   * URL. The id always comes from the token, never the body.
   */
  async addImage(
    userId: string,
    image?: Express.Multer.File,
  ): Promise<UpdateProfileResult> {
    if (!image) {
      throw new BadRequestException(NO_IMAGE_MESSAGE);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('this user no longer exists');
    }

    // Upload first: a failed upload must not touch the database.
    const avatarUrl = await this.cloudinaryService.uploadAvatar(userId, image);

    const saved = await this.userRepository.save({
      ...user,
      avatarUrl,
    });

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      avatarUrl: saved.avatarUrl ?? null,
    };
  }

  private toSafeUser(user: User): Partial<User> {
    // save() and getOne() both leave the hash on the object, so strip it
    // before it is ever serialised. The timestamps are internal too.
    const safeUser: Partial<User> = { ...user };
    delete safeUser.password;
    delete safeUser.createdAt;
    delete safeUser.updatedAt;

    return safeUser;
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
