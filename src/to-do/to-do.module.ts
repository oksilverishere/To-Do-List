import { Module } from '@nestjs/common';
import { ToDoService } from './to-do.service';
import { ToDoController } from './to-do.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToDo } from './entities/to-do.entity';
import { Category } from '../category/entities/category.entity';

@Module({
  controllers: [ToDoController],
  providers: [ToDoService],
  imports: [TypeOrmModule.forFeature([ToDo, Category])],
})
export class ToDoModule {}
