import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

describe('CategoryController', () => {
  let controller: CategoryController;

  const mockCategoryService = {
    create: jest.fn(),
  };

  const dto = {
    title: 'programming',
    bio: 'this category for programming learnings',
  };

  const user = {
    id: 'a0e0d0c0-0000-4000-8000-000000000000',
    email: 'ahm5dn5hh5s@gmail.com',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the authenticated user id to the service', () => {
    controller.create(dto, user);

    expect(mockCategoryService.create).toHaveBeenCalledWith(dto, user.id);
  });

  it('always passes the token user id, never one read from the payload', () => {
    controller.create({ ...dto, userId: 'someone-else' } as never, user);

    expect(mockCategoryService.create).toHaveBeenCalledWith(
      expect.anything(),
      user.id,
    );
  });
});