import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToDo } from './entities/to-do.entity';
import { Category } from '../category/entities/category.entity';
import { CreateToDoDto } from './dto/create-to-do.dto';
import { UpdateToDoDto } from './dto/update-to-do.dto';
import { SearchToDoDto } from './dto/search-to-do.dto';
import {
  TodoByIdResponseDto,
  TodoEditResponseDto,
  TodoListResponseDto,
} from './dto/todo-response.dto';
import { TodoPriority, TodoStatus } from './enums';

const NOTHING_TO_UPDATE_MESSAGE = 'send at least one field to update';

const TODO_NOT_FOUND_MESSAGE = 'todo not found';

const CATEGORY_NOT_FOUND_MESSAGE = 'category not found';

// Fixed sort orders — the caller picks the key, never the direction.
const PRIORITY_ORDER: Record<TodoPriority, number> = {
  [TodoPriority.LOW]: 0,
  [TodoPriority.MEDIUM]: 1,
  [TodoPriority.HIGH]: 2,
};

const STATUS_ORDER: Record<TodoStatus, number> = {
  [TodoStatus.PENDING]: 0,
  [TodoStatus.DONE]: 1,
};

/** 0-1 first, then a-z, then A-Z. */
function compareNames(a: string, b: string): number {
  const rank = (ch: string): number => {
    if (ch >= '0' && ch <= '9') return 0;
    if (ch >= 'a' && ch <= 'z') return 1;
    if (ch >= 'A' && ch <= 'Z') return 2;
    return 3;
  };

  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ra = rank(a[i]);
    const rb = rank(b[i]);
    if (ra !== rb) return ra - rb;
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return a.length - b.length;
}

@Injectable()
export class ToDoService {
  constructor(
    @InjectRepository(ToDo)
    private readonly toDoRepository: Repository<ToDo>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * The category must exist and belong to the caller — the owner always
   * comes from the token, so a body can never point at somebody else.
   */
  private async findOwnCategory(
    categoryId: string,
    userId: string,
  ): Promise<Category> {
    const category = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.id = :categoryId', { categoryId })
      .andWhere('category.userId = :userId', { userId })
      .getOne();

    if (!category) {
      throw new NotFoundException(CATEGORY_NOT_FOUND_MESSAGE);
    }

    return category;
  }

  /** Creates a todo inside one of the caller's own categories. */
  async create(createToDoDto: CreateToDoDto, userId: string): Promise<ToDo> {
    await this.findOwnCategory(createToDoDto.categoryId, userId);

    const toDo = this.toDoRepository.create({ ...createToDoDto, userId });

    return this.toDoRepository.save(toDo);
  }

  /** Every todo inside one of the caller's own categories, oldest first. */
  async findAll(
    categoryId: string,
    userId: string,
  ): Promise<TodoListResponseDto[]> {
    await this.findOwnCategory(categoryId, userId);

    const toDos = await this.toDoRepository
      .createQueryBuilder('todo')
      .where('todo.categoryId = :categoryId', { categoryId })
      .andWhere('todo.userId = :userId', { userId })
      .orderBy('todo.createdAt', 'ASC')
      .getMany();

    return toDos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      bio: todo.bio,
      priority: todo.priority,
    }));
  }

  /**
   * The caller's own todos, filtered by name/status/priority (all optional)
   * and sorted by one fixed key: name (default), priority or status.
   * The direction is never up to the caller.
   */
  async search(
    searchToDoDto: SearchToDoDto,
    userId: string,
  ): Promise<TodoListResponseDto[]> {
    const { name, status, priority, sortBy = 'name' } = searchToDoDto;

    const qb = this.toDoRepository
      .createQueryBuilder('todo')
      .where('todo.userId = :userId', { userId });

    if (name) {
      qb.andWhere('todo.title ILIKE :name', { name: `%${name}%` });
    }
    if (status) {
      qb.andWhere('todo.status = :status', { status });
    }
    if (priority) {
      qb.andWhere('todo.priority = :priority', { priority });
    }

    const toDos = await qb.getMany();

    toDos.sort((a, b) => {
      if (sortBy === 'priority') {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (sortBy === 'status') {
        return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      }
      return compareNames(a.title, b.title);
    });

    return toDos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      bio: todo.bio,
      priority: todo.priority,
    }));
  }

  /** Loads the raw todo row — used internally by update/remove/changeStatus. */
  private async findOwnTodo(id: string, userId: string): Promise<ToDo> {
    const toDo = await this.toDoRepository
      .createQueryBuilder('todo')
      .where('todo.id = :id', { id })
      .andWhere('todo.userId = :userId', { userId })
      .getOne();

    if (!toDo) {
      throw new NotFoundException(TODO_NOT_FOUND_MESSAGE);
    }

    return toDo;
  }

  /** One of the caller's own todos; somebody else's looks missing. */
  async findOne(id: string, userId: string): Promise<TodoByIdResponseDto> {
    const toDo = await this.findOwnTodo(id, userId);

    return {
      title: toDo.title,
      status: toDo.status,
      bio: toDo.bio,
      priority: toDo.priority,
      categoryId: toDo.categoryId,
    };
  }

  /**
   * Changes only the fields that were sent; omitted ones keep their value.
   * Only title, bio and priority can be edited.
   */
  async update(
    id: string,
    updateToDoDto: UpdateToDoDto,
    userId: string,
  ): Promise<TodoEditResponseDto> {
    const { title, bio, priority } = updateToDoDto;

    if (
      title === undefined &&
      bio === undefined &&
      priority === undefined
    ) {
      throw new BadRequestException(NOTHING_TO_UPDATE_MESSAGE);
    }

    const toDo = await this.findOwnTodo(id, userId);

    if (title !== undefined) {
      toDo.title = title;
    }
    if (bio !== undefined) {
      toDo.bio = bio;
    }
    if (priority !== undefined) {
      toDo.priority = priority;
    }

    const saved = await this.toDoRepository.save(toDo);

    return {
      title: saved.title,
      bio: saved.bio,
      status: saved.status,
      priority: saved.priority,
    };
  }

  /** Flips the status of one of the caller's own todos (pending ↔ done). */
  async changeStatus(
    id: string,
    status: TodoStatus,
    userId: string,
  ): Promise<{ message: string; status: TodoStatus }> {
    const toDo = await this.findOwnTodo(id, userId);

    toDo.status = status;
    await this.toDoRepository.save(toDo);

    return { message: 'todo status changed successfully', status };
  }

  /**
   * Deletes the todo only — the category it lives in stays untouched.
   * (The FK runs the other way: deleting a category takes its todos.)
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    // 404 first if the todo does not exist or is not the caller's.
    const toDo = await this.findOwnTodo(id, userId);

    await this.toDoRepository.delete({ id: toDo.id, userId });

    return { message: 'todo deleted successfully' };
  }
}
