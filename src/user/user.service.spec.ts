import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserService } from './user.service';
import { CloudinaryService } from './cloudinary.service';
import { EmailService } from './email.service';
import { User } from './entities/user.entity';

describe('UserService', () => {
  let service: UserService;

  const TEST_SECRET = 'test-secret-not-used-for-anything-real';

  const userRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const cloudinaryService = {
    uploadAvatar: jest.fn(),
  };

  const emailService = {
    sendResetCode: jest.fn(),
  };

  // Stands in for the query builder chain used by create() and signIn().
  const queryBuilder = {
    addSelect: jest.fn(),
    where: jest.fn(),
    orWhere: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(() => {
    queryBuilder.addSelect.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.orWhere.mockReturnValue(queryBuilder);
    userRepository.createQueryBuilder.mockReturnValue(queryBuilder);
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: CloudinaryService,
          useValue: cloudinaryService,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
        {
          // The real JwtService, so the token in these tests is genuinely
          // signed and can be verified. Mirrors app.module.ts: a secret plus
          // an explicit expiry. Without expiresIn the token has no `exp` and
          // never expires.
          provide: JwtService,
          useValue: new JwtService({
            secret: TEST_SECRET,
            signOptions: { expiresIn: '1h' },
          }),
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = {
      name: 'silver_dev',
      email: 'user@example.com',
      password: 'SecretPass123',
    };

    beforeEach(() => {
      userRepository.create.mockImplementation((user) => user);
      userRepository.save.mockImplementation(async (user) => user);
      // No existing user by default; individual tests override this.
      queryBuilder.getOne.mockResolvedValue(null);
    });

    it('stores a bcrypt hash instead of the plain password', async () => {
      await service.create(dto);

      const stored = userRepository.create.mock.calls[0][0];

      expect(stored.password).not.toBe(dto.password);
      expect(stored.password).toMatch(/^\$2[aby]\$\d{2}\$/);
      await expect(bcrypt.compare(dto.password, stored.password)).resolves.toBe(
        true,
      );
    });

    it('does not leak the password hash in the response', async () => {
      const result = await service.create(dto);

      expect(result.password).toBeUndefined();
    });

    it('returns the other created fields', async () => {
      const result = await service.create(dto);

      expect(result.name).toBe(dto.name);
      expect(result.email).toBe(dto.email);
    });

    describe('when the email or username is taken', () => {
      beforeEach(() => {
        queryBuilder.getOne.mockResolvedValue({ id: 'already-taken' });
      });

      it('rejects with the duplicate message', async () => {
        await expect(service.create(dto)).rejects.toThrow(
          'This email/userName has been already exists!',
        );
      });

      it('is a BadRequest, not an Internal Server Error', async () => {
        await expect(service.create(dto)).rejects.toBeInstanceOf(
          BadRequestException,
        );
      });

      it('checks both the email and the name', async () => {
        await expect(service.create(dto)).rejects.toBeInstanceOf(
          BadRequestException,
        );

        expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
          email: dto.email,
        });
        expect(queryBuilder.orWhere).toHaveBeenCalledWith('user.name = :name', {
          name: dto.name,
        });
      });

      it('never writes to the database', async () => {
        await expect(service.create(dto)).rejects.toBeInstanceOf(
          BadRequestException,
        );

        expect(userRepository.save).not.toHaveBeenCalled();
      });
    });

    it('still rejects if the unique index fires between the check and the insert', async () => {
      // The pre-check passed, but Postgres reports a unique violation —
      // this is the race where two sign-ups arrive at the same instant.
      userRepository.save.mockRejectedValueOnce(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(service.create(dto)).rejects.toThrow(
        'This email/userName has been already exists!',
      );
    });

    it('rethrows unrelated database errors untouched', async () => {
      const boom = new Error('connection terminated');
      userRepository.save.mockRejectedValueOnce(boom);

      await expect(service.create(dto)).rejects.toThrow('connection terminated');
    });
  });

  describe('signIn', () => {
    const dto = {
      email: 'ahm5dn5hh5s@gmail.com',
      password: 'SecretPass123',
    };

    async function givenStoredUser(password: string) {
      queryBuilder.getOne.mockResolvedValue({
        id: 'a0e0d0c0-0000-4000-8000-000000000000',
        name: 'Silver',
        email: dto.email,
        password,
      });
    }

    it('selects the password column, which is `select: false` on the entity', async () => {
      await givenStoredUser(await bcrypt.hash(dto.password, 10));

      await service.signIn(dto);

      expect(userRepository.createQueryBuilder).toHaveBeenCalled();
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
    });

    it('returns the user when the password matches the stored hash', async () => {
      await givenStoredUser(await bcrypt.hash(dto.password, 10));

      const result = await service.signIn(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.user.name).toBe('Silver');
    });

    it('returns exactly id, name and email on the user', async () => {
      await givenStoredUser(await bcrypt.hash(dto.password, 10));

      const { user } = await service.signIn(dto);

      expect(Object.keys(user).sort()).toEqual(['email', 'id', 'name']);
    });

    it('never returns the password hash, only uses it to verify', async () => {
      const hash = await bcrypt.hash(dto.password, 10);
      await givenStoredUser(hash);

      const result = await service.signIn(dto);

      expect(result.user).not.toHaveProperty('password');
      expect(JSON.stringify(result)).not.toContain('$2b$');
    });

    it('does not leak the timestamps or relation arrays', async () => {
      queryBuilder.getOne.mockResolvedValue({
        id: 'a0e0d0c0-0000-4000-8000-000000000000',
        name: 'Silver',
        email: dto.email,
        password: await bcrypt.hash(dto.password, 10),
        createdAt: new Date(),
        updatedAt: new Date(),
        todos: [{ id: 'should-not-appear' }],
        categories: [{ id: 'should-not-appear' }],
      });

      const { user } = await service.signIn(dto);

      expect(user).not.toHaveProperty('createdAt');
      expect(user).not.toHaveProperty('todos');
    });

    describe('token', () => {
      it('issues a signed JWT', async () => {
        await givenStoredUser(await bcrypt.hash(dto.password, 10));

        const { accessToken } = await service.signIn(dto);

        expect(typeof accessToken).toBe('string');
        expect(accessToken.split('.')).toHaveLength(3);
      });

      it('verifies against the signing secret, so it is not a forgery', async () => {
        await givenStoredUser(await bcrypt.hash(dto.password, 10));

        const { accessToken } = await service.signIn(dto);
        const claims = jwt.verify(accessToken, TEST_SECRET) as jwt.JwtPayload;

        expect(claims.sub).toBe('a0e0d0c0-0000-4000-8000-000000000000');
        expect(claims.email).toBe(dto.email);
      });

      it('carries no password and no secret material', async () => {
        await givenStoredUser(await bcrypt.hash(dto.password, 10));

        const { accessToken } = await service.signIn(dto);
        const claims = jwt.decode(accessToken) as jwt.JwtPayload;

        expect(Object.keys(claims).sort()).toEqual(['email', 'exp', 'iat', 'sub']);
        expect(JSON.stringify(claims)).not.toContain('$2b$');
      });

      it('cannot be verified with the wrong secret', async () => {
        await givenStoredUser(await bcrypt.hash(dto.password, 10));

        const { accessToken } = await service.signIn(dto);

        expect(() => jwt.verify(accessToken, 'not-the-secret')).toThrow();
      });

      it('is not issued when the credentials are wrong', async () => {
        await givenStoredUser(await bcrypt.hash('SomeOtherPass123', 10));

        await expect(service.signIn(dto)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      });
    });

    it('throws Unauthorized when the password does not match', async () => {
      await givenStoredUser(await bcrypt.hash('SomeOtherPass123', 10));

      await expect(service.signIn(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized when no such user exists', async () => {
      queryBuilder.getOne.mockResolvedValue(null);

      await expect(service.signIn(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('does not reveal which of the two failed', async () => {
      queryBuilder.getOne.mockResolvedValue(null);
      const unknownUser = await service.signIn(dto).catch((e) => e.message);

      await givenStoredUser(await bcrypt.hash('SomeOtherPass123', 10));
      const wrongPassword = await service.signIn(dto).catch((e) => e.message);

      expect(unknownUser).toBe(wrongPassword);
    });
  });

  describe('updateProfile', () => {
    const userId = 'a0e0d0c0-0000-4000-8000-000000000000';

    const storedUser = {
      id: userId,
      name: 'Silver',
      email: 'ahm5dn5hh5s@gmail.com',
      password: 'not-selected-by-default',
      avatarUrl: null,
    };

    const fakeImage = {
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake'),
    } as Express.Multer.File;

    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(storedUser);
      userRepository.save.mockImplementation(async (user) => user);
      cloudinaryService.uploadAvatar.mockResolvedValue(
        'https://res.cloudinary.com/demo/image/upload/av.jpg',
      );
    });

    it('rejects when neither a name nor an image is sent', async () => {
      await expect(service.updateProfile(userId, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('rejects when the user behind the token no longer exists', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile(userId, { name: 'NewName' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates only the name when no image is sent', async () => {
      const result = await service.updateProfile(userId, { name: 'NewName' });

      expect(result.name).toBe('NewName');
      expect(cloudinaryService.uploadAvatar).not.toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('uploads the image and stores only its URL', async () => {
      const result = await service.updateProfile(
        userId,
        {},
        fakeImage,
      );

      expect(cloudinaryService.uploadAvatar).toHaveBeenCalledWith(
        userId,
        fakeImage,
      );
      expect(result.avatarUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/av.jpg',
      );
    });

    it('updates the name and the image in one call', async () => {
      const result = await service.updateProfile(
        userId,
        { name: 'NewName' },
        fakeImage,
      );

      expect(result.name).toBe('NewName');
      expect(result.avatarUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/av.jpg',
      );
    });

    it('returns only the public fields', async () => {
      const result = await service.updateProfile(userId, { name: 'NewName' });

      expect(Object.keys(result).sort()).toEqual([
        'avatarUrl',
        'email',
        'id',
        'name',
      ]);
      expect(result).not.toHaveProperty('password');
    });

    it('turns a name collision into the duplicate message', async () => {
      userRepository.save.mockRejectedValueOnce(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(
        service.updateProfile(userId, { name: 'TakenName' }),
      ).rejects.toThrow('This email/userName has been already exists!');
    });

    it('rethrows unrelated database errors untouched', async () => {
      userRepository.save.mockRejectedValueOnce(
        new Error('connection terminated'),
      );

      await expect(
        service.updateProfile(userId, { name: 'NewName' }),
      ).rejects.toThrow('connection terminated');
    });
  });

  describe('addImage', () => {
    const userId = 'a0e0d0c0-0000-4000-8000-000000000000';

    const storedUser = {
      id: userId,
      name: 'Silver',
      email: 'ahm5dn5hh5s@gmail.com',
      password: 'not-selected-by-default',
      avatarUrl: null,
    };

    const fakeImage = {
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('fake'),
    } as Express.Multer.File;

    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(storedUser);
      userRepository.save.mockImplementation(async (user) => user);
      cloudinaryService.uploadAvatar.mockResolvedValue(
        'https://res.cloudinary.com/demo/image/upload/av.jpg',
      );
    });

    it('rejects when no image is sent', async () => {
      await expect(service.addImage(userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('rejects when the user behind the token no longer exists', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.addImage(userId, fakeImage)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(cloudinaryService.uploadAvatar).not.toHaveBeenCalled();
    });

    it('uploads the image and stores only its URL', async () => {
      const result = await service.addImage(userId, fakeImage);

      expect(cloudinaryService.uploadAvatar).toHaveBeenCalledWith(
        userId,
        fakeImage,
      );
      expect(result.avatarUrl).toBe(
        'https://res.cloudinary.com/demo/image/upload/av.jpg',
      );
    });

    it('keeps the other profile fields untouched', async () => {
      const result = await service.addImage(userId, fakeImage);

      expect(result.name).toBe('Silver');
      expect(result.email).toBe('ahm5dn5hh5s@gmail.com');
      expect(result.id).toBe(userId);
    });

    it('does not touch the database when the upload fails', async () => {
      cloudinaryService.uploadAvatar.mockRejectedValueOnce(
        new BadRequestException('could not upload the image'),
      );

      await expect(
        service.addImage(userId, fakeImage),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
