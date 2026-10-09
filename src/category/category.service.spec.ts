import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';

describe('CategoryService', () => {
  let service: CategoryService;

  const userId = 'a0e0d0c0-0000-4000-8000-000000000000';

  const dto = {
    title: 'programming',
    bio: 'this category for programming learnings',
  };

  const categoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const queryBuilder = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    categoryRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    categoryRepository.create.mockImplementation((category) => category);
    categoryRepository.save.mockImplementation(async (category) => ({
      ...category,
      id: 'generated-by-the-db',
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    // No existing category by default.
    queryBuilder.getOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('takes the owner from the argument, not the payload', async () => {
      await service.create(dto, userId);

      const created = categoryRepository.create.mock.calls[0][0];

      expect(created.userId).toBe(userId);
    });

    it('overrides a spoofed userId in the payload', async () => {
      // The global ValidationPipe already rejects unknown fields, but the
      // service must not depend on that: userId is applied after the spread.
      await service.create({ ...dto, userId: 'someone-else' } as never, userId);

      expect(categoryRepository.create.mock.calls[0][0].userId).toBe(userId);
    });

    it('stores the title and bio', async () => {
      await service.create(dto, userId);

      const created = categoryRepository.create.mock.calls[0][0];

      expect(created.title).toBe(dto.title);
      expect(created.bio).toBe(dto.bio);
    });

    it('scopes the duplicate check to the caller', async () => {
      // The same title belonging to a *different* user must not block this one.
      queryBuilder.getOne.mockResolvedValue(null);

      await service.create(dto, userId);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'category.userId = :userId',
        { userId },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.title = :title',
        { title: dto.title },
      );
    });

    it('returns the saved category, id included', async () => {
      const result = await service.create(dto, userId);

      expect(result.id).toBe('generated-by-the-db');
      expect(result.userId).toBe(userId);
    });

    it('rejects a title the caller already has', async () => {
      queryBuilder.getOne.mockResolvedValue({ id: 'already-there' });

      await expect(service.create(dto, userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('never writes to the database when the title is taken', async () => {
      queryBuilder.getOne.mockResolvedValue({ id: 'already-there' });

      await expect(service.create(dto, userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(categoryRepository.save).not.toHaveBeenCalled();
    });

    it('still rejects if the unique index fires between check and insert', async () => {
      categoryRepository.save.mockRejectedValueOnce(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(service.create(dto, userId)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rethrows unrelated database errors untouched', async () => {
      const boom = new Error('connection terminated');
      categoryRepository.save.mockRejectedValueOnce(boom);

      await expect(service.create(dto, userId)).rejects.toThrow(
        'connection terminated',
      );
    });
  });
});