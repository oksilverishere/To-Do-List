import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ToDo } from '../to-do/entities/to-do.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const DUPLICATE_TITLE_MESSAGE = 'This category title has been already exists!';

const NOTHING_TO_UPDATE_MESSAGE = 'send at least a title or a bio';

const NOT_FOUND_MESSAGE = 'category not found';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * `userId` comes from the verified token, never from the request body, so a
   * caller cannot create a category belonging to somebody else.
   */
  async create(
    createCategoryDto: CreateCategoryDto,
    userId: string,
  ): Promise<Category> {
    const existing = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.userId = :userId', { userId })
      .andWhere('category.title = :title', { title: createCategoryDto.title })
      .getOne();

    // Checked up front for the readable message; the catch below covers two
    // requests passing this check at the same instant.
    if (existing) {
      throw new BadRequestException(DUPLICATE_TITLE_MESSAGE);
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      userId,
    });

    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      // Postgres unique violation: 23505.
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException(DUPLICATE_TITLE_MESSAGE);
      }

      throw error;
    }
  }

  /**
   * Changes the title and/or bio of one of the caller's own categories.
   * Omitted fields keep their value; sending neither is a 400. The id comes
   * from the URL and the owner from the token, so somebody else's category
   * simply looks missing.
   */
  async editCategory(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    userId: string,
  ): Promise<Category> {
    const { title, bio } = updateCategoryDto;

    if (title === undefined && bio === undefined) {
      throw new BadRequestException(NOTHING_TO_UPDATE_MESSAGE);
    }

    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .andWhere('category.userId = :userId', { userId })
      .getOne();

    if (!category) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    // Only a real title change can collide with another row; the unique
    // index is on (userId, title), so the check stays inside this user.
    if (title !== undefined && title !== category.title) {
      const existing = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.userId = :userId', { userId })
        .andWhere('category.title = :title', { title })
        .andWhere('category.id != :id', { id })
        .getOne();

      if (existing) {
        throw new BadRequestException(DUPLICATE_TITLE_MESSAGE);
      }
    }

    if (title !== undefined) {
      category.title = title;
    }
    if (bio !== undefined) {
      category.bio = bio;
    }

    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      // Postgres unique violation: 23505.
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException(DUPLICATE_TITLE_MESSAGE);
      }

      throw error;
    }
  }

  /** Every category owned by the caller, oldest first. */
  async findAll(userId: string): Promise<Category[]> {
    return this.categoryRepository
      .createQueryBuilder('category')
      .where('category.userId = :userId', { userId })
      .orderBy('category.createdAt', 'ASC')
      .getMany();
  }

  /** One of the caller's own categories; somebody else's looks missing. */
  async findOne(id: string, userId: string): Promise<Category> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .andWhere('category.userId = :userId', { userId })
      .getOne();

    if (!category) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return category;
  }

  update(id: number, updateCategoryDto: UpdateCategoryDto) {
    return `This action updates a #${id} category`;
  }

  /**
   * Deletes one of the caller's own categories together with every to-do
   * inside it, in one transaction. The FK now also has `ON DELETE CASCADE`
   * as a DB-level guarantee; doing it explicitly keeps the route correct
   * even before the schema sync picks that up.
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :id', { id })
      .andWhere('category.userId = :userId', { userId })
      .getOne();

    if (!category) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    await this.categoryRepository.manager.transaction(async (manager) => {
      // The to-dos first — the old FK only set their categoryId to NULL.
      await manager.delete(ToDo, { categoryId: id, userId });
      await manager.delete(Category, { id, userId });
    });

    return { message: 'category and its to-dos deleted successfully' };
  }
}