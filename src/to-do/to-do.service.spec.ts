import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ToDoService } from './to-do.service';
import { ToDo } from './entities/to-do.entity';
import { Category } from '../category/entities/category.entity';

describe('ToDoService', () => {
  let service: ToDoService;

  const toDoRepository = {};
  const categoryRepository = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToDoService,
        {
          provide: getRepositoryToken(ToDo),
          useValue: toDoRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<ToDoService>(ToDoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
