import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../user/entities/user.entity';
import { SignInResponseDto } from '../user/dto/sign-in-response.dto';
import { UserRole } from '../user/enums/user-role.enum';
import { DashboardSignInDto } from './dto/dashboard-sign-in.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { EditUserByAdminDto } from './dto/edit-user-by-admin.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { NOT_ALLOWED_MESSAGE } from '../auth/auth.constants';

const DUPLICATE_MESSAGE = 'This email/userName has been already exists!';

const NOTHING_TO_UPDATE_MESSAGE =
    'send at least a userName, an email, a password or a role';

const SUPER_ADMIN_PROTECTED_MESSAGE = 'the super admin account cannot be deleted';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Admin creates a new user. The caller's id comes from the token and is
   * checked to be an admin; the role is limited to `user`/`admin` by the DTO.
   */
  async createUser(
    adminId: string,
    dto: CreateUserByAdminDto,
  ): Promise<Partial<User>> {
    await this.assertAdmin(adminId);

    // Readable message instead of a raw Postgres 23505; the catch below
    // still guards the race where two creates pass this check at once.
    const existing = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :email', { email: dto.email })
      .orWhere('user.name = :name', { name: dto.userName })
      .getOne();

    if (existing) {
      throw new BadRequestException(DUPLICATE_MESSAGE);
    }

    const user = this.userRepository.create({
      name: dto.userName,
      email: dto.email,
      role: dto.role as UserRole,
      password: await bcrypt.hash(dto.password, 10),
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

  /**
   * Lists users for the dashboard search bar. Admin only.
   * `search` is case-insensitive and matches name/email/role (`searchBy`
   * picks which). The sort is fixed, not chosen: names group 0-1, then a-z,
   * then A-Z; roles group user before admin, then the rest by name.
   */
  async getUsers(
    adminId: string,
    query: SearchUsersDto,
  ): Promise<Partial<User>[]> {
    await this.assertAdmin(adminId);

    const qb = this.userRepository.createQueryBuilder('user');

    const search = query.search ?? '';

    if (search !== '') {
      // ILIKE = case-insensitive match, %...% = contains.
      // CAL && ::text: `user.role::text` breaks because TypeORM cannot quote
      // the raw alias in that form (USER is a reserved word) — CAST is safe.
      if (query.searchBy === 'name') {
        qb.andWhere('user.name ILIKE :search', { search: `%${search}%` });
      } else if (query.searchBy === 'role') {
        qb.andWhere('CAST(user.role AS TEXT) ILIKE :search', {
          search: `%${search}%`,
        });
      } else {
        // `all` (the default): one of the three fields matches.
        qb.andWhere(
          '(user.name ILIKE :search OR user.email ILIKE :search OR CAST(user.role AS TEXT) ILIKE :search)',
          { search: `%${search}%` },
        );
      }
    }

    if (query.searchBy === 'name') {
      // 0-1 first, then a-z, then A-Z; within each group alphabetical.
      qb.orderBy(
        `CASE
           WHEN user.name ~ '^[0-9]' THEN 0
           WHEN user.name ~ '^[a-z]' THEN 1
           WHEN user.name ~ '^[A-Z]' THEN 2
           ELSE 3
         END`,
        'ASC',
      ).addOrderBy('LOWER(user.name)', 'ASC');
    } else if (query.searchBy === 'role') {
      // user first, then admin, then anything else (editor/viewer/superAdmin).
      qb.orderBy(
        `CASE user.role WHEN 'user' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END`,
        'ASC',
      ).addOrderBy('LOWER(user.name)', 'ASC');
    } else {
      // `all` or no filter: oldest account first, same as the list routes.
      qb.orderBy('user.createdAt', 'ASC');
    }

    const users = await qb.getMany();

    return users.map((user) => this.toSafeUser(user));
  }

  /** Any account's email / password / userName / role can be edited. Admin only. */
  async editUser(
    adminId: string,
    userId: string,
    dto: EditUserByAdminDto,
  ): Promise<Partial<User>> {
    await this.assertAdmin(adminId);

    if (Object.keys(dto).length === 0) {
      throw new BadRequestException(NOTHING_TO_UPDATE_MESSAGE);
    }

    // password is `select: false`, so it must be added explicitly — the new
    // hash replaces the old one on the same row.
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('this user no longer exists');
    }

    // Readable message instead of a raw Postgres 23505; the catch below
    // still guards the race where two edits pass this check at once.
    if (dto.email !== undefined || dto.userName !== undefined) {
      const existing = await this.userRepository
        .createQueryBuilder('user')
        .where('user.email = :email', {
          email: dto.email ?? user.email,
        })
        .orWhere('user.name = :name', { name: dto.userName ?? user.name })
        .getOne();

      if (existing && existing.id !== user.id) {
        throw new BadRequestException(DUPLICATE_MESSAGE);
      }
    }

    if (dto.userName !== undefined) {
      user.name = dto.userName;
    }

    if (dto.email !== undefined) {
      user.email = dto.email;
    }

    if (dto.role !== undefined) {
      user.role = dto.role as UserRole;
    }

    if (dto.password !== undefined) {
      // Never store the new password as received.
      user.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const saved = await this.userRepository.save(user);

      return this.toSafeUser(saved);
    } catch (error) {
      // The new email / name hit a unique index.
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException(DUPLICATE_MESSAGE);
      }

      throw error;
    }
  }

  /**
   * Deletes any account by id — but only the super admin may call it, and a
   * super admin account can never be deleted by anyone, including him.
   */
  async deleteUser(superAdminId: string, userId: string): Promise<{ message: string }> {
    const caller = await this.userRepository.findOne({ where: { id: superAdminId } });

    if (!caller || caller.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException(NOT_ALLOWED_MESSAGE);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('this user no longer exists');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException(SUPER_ADMIN_PROTECTED_MESSAGE);
    }

    await this.userRepository.remove(user);

    return { message: 'user deleted successfully' };
  }

  /** Returns any account by its id, whatever its role. Admin only. */
  async getUserById(adminId: string, userId: string): Promise<Partial<User>> {
    await this.assertAdmin(adminId);

    // password is `select: false`, so it is never loaded and never returned.
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('this user no longer exists');
    }

    return this.toSafeUser(user);
  }

  /** Counts the accounts with role `user` — admins are not included. */
  async countUsers(adminId: string): Promise<{ count: number }> {
    await this.assertAdmin(adminId);

    const count = await this.userRepository.count({
      where: { role: UserRole.USER },
    });

    return { count };
  }

  async signIn(signInDto: DashboardSignInDto): Promise<SignInResponseDto> {
    // password is `select: false`, so it must be added explicitly.
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email: signInDto.email })
      .getOne();

    if (!user || !(await bcrypt.compare(signInDto.password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // The dashboard is admin-only: a normal user may sign in to the API,
    // but never here.
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new UnauthorizedException(NOT_ALLOWED_MESSAGE);
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
    };
  }

  /** Every dashboard action is admin-only; the super admin passes too. */
  private async assertAdmin(adminId: string): Promise<void> {
    const admin = await this.userRepository.findOne({ where: { id: adminId } });

    if (
      !admin ||
      (admin.role !== UserRole.ADMIN && admin.role !== UserRole.SUPER_ADMIN)
    ) {
      throw new UnauthorizedException(NOT_ALLOWED_MESSAGE);
    }
  }

  /**
   * Strips everything internal from a user before it is serialised: the
   * password hash and the `createdAt` / `updatedAt` timestamps.
   */
  private toSafeUser(user: User): Partial<User> {
    const safeUser: Partial<User> = { ...user };
    delete safeUser.password;
    delete safeUser.createdAt;
    delete safeUser.updatedAt;

    return safeUser;
  }
}
