import { Test, TestingModule } from '@nestjs/testing';
import { ACCESS_TOKEN_COOKIE } from '../auth/auth.constants';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    create: jest.fn(),
    signIn: jest.fn(),
    updateProfile: jest.fn(),
    addImage: jest.fn(),
  };

  // Stands in for the Express response that @Res({ passthrough: true }) gives.
  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  const signedIn = {
    user: {
      id: 'a0e0d0c0-0000-4000-8000-000000000000',
      name: 'Silver',
      email: 'ahm5dn5hh5s@gmail.com',
    },
    accessToken: 'header.payload.signature',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('signUp() delegates to the service', () => {
    const dto = {
      name: 'Silver',
      email: 'ahm5dn5hh5s@gmail.com',
      password: 'SecretPass123',
    };

    controller.signUp(dto);

    expect(mockUserService.create).toHaveBeenCalledWith(dto);
  });

  describe('signIn', () => {
    const dto = {
      email: 'ahm5dn5hh5s@gmail.com',
      password: 'SecretPass123',
    };

    beforeEach(() => {
      mockUserService.signIn.mockResolvedValue(signedIn);
    });

    it('delegates to the service', async () => {
      await controller.signIn(dto, mockResponse as never);

      expect(mockUserService.signIn).toHaveBeenCalledWith(dto);
    });

    it('sets the token as a cookie named access_token', async () => {
      await controller.signIn(dto, mockResponse as never);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE,
        signedIn.accessToken,
        expect.anything(),
      );
    });

    it('marks the cookie httpOnly so JS cannot read it', async () => {
      await controller.signIn(dto, mockResponse as never);

      const [, , options] = mockResponse.cookie.mock.calls[0];

      expect(options.httpOnly).toBe(true);
    });

    it('sets sameSite and a maxAge', async () => {
      await controller.signIn(dto, mockResponse as never);

      const [, , options] = mockResponse.cookie.mock.calls[0];

      expect(options.sameSite).toBe('lax');
      expect(options.maxAge).toBeGreaterThan(0);
    });

    it('returns the user and the token', async () => {
      const result = await controller.signIn(dto, mockResponse as never);

      expect(result).toEqual(signedIn);
    });
  });

  describe('signOut', () => {
    it('clears the access_token cookie', () => {
      controller.signOut(mockResponse as never);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        ACCESS_TOKEN_COOKIE,
        expect.anything(),
      );
    });

    it('uses the same cookie options sign-in set', () => {
      controller.signOut(mockResponse as never);

      const [, options] = mockResponse.clearCookie.mock.calls[0];

      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
    });
  });

  describe('updateProfile', () => {
    const authUser = {
      id: 'a0e0d0c0-0000-4000-8000-000000000000',
      email: 'ahm5dn5hh5s@gmail.com',
    };

    const updated = {
      id: authUser.id,
      name: 'Silver',
      email: authUser.email,
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/av.jpg',
    };

    beforeEach(() => {
      mockUserService.updateProfile.mockResolvedValue(updated);
    });

    it('delegates to the service with the id from the token', async () => {
      await controller.updateProfile({ name: 'Silver' }, authUser);

      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        authUser.id,
        { name: 'Silver' },
        undefined,
      );
    });

    it('forwards the uploaded image', async () => {
      const image = { buffer: Buffer.from('x') } as Express.Multer.File;

      await controller.updateProfile({}, authUser, image);

      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        authUser.id,
        {},
        image,
      );
    });

    it('returns the updated profile', async () => {
      const result = await controller.updateProfile({}, authUser);

      expect(result).toEqual(updated);
    });
  });

  describe('uploadImage', () => {
    const authUser = {
      id: 'a0e0d0c0-0000-4000-8000-000000000000',
      email: 'ahm5dn5hh5s@gmail.com',
    };

    const withAvatar = {
      id: authUser.id,
      name: 'Silver',
      email: authUser.email,
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/av.jpg',
    };

    beforeEach(() => {
      mockUserService.addImage.mockResolvedValue(withAvatar);
    });

    it('delegates to the service with the id from the token', async () => {
      const image = { buffer: Buffer.from('x') } as Express.Multer.File;

      await controller.uploadImage(authUser, image);

      expect(mockUserService.addImage).toHaveBeenCalledWith(authUser.id, image);
    });

    it('passes a missing file through so the service can reject it', async () => {
      await controller.uploadImage(authUser);

      expect(mockUserService.addImage).toHaveBeenCalledWith(
        authUser.id,
        undefined,
      );
    });

    it('returns the profile with the new avatar URL', async () => {
      const image = { buffer: Buffer.from('x') } as Express.Multer.File;

      const result = await controller.uploadImage(authUser, image);

      expect(result).toEqual(withAvatar);
    });
  });
});