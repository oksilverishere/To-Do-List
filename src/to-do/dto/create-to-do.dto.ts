import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TodoPriority } from '../enums';

export class CreateToDoDto {
    @ApiProperty({
        description: 'Title of the task',
        example: 'Finish NestJS module',
        minLength: 2,
        maxLength: 100,
    })
    @IsString({ message: 'title must be text' })
    @IsNotEmpty({ message: 'title is required' })
    @MinLength(2, { message: 'title too short (min 2 chars)' })
    @MaxLength(100, { message: 'title too long (max 100 chars)' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    title: string;

    @ApiProperty({
        description: 'Detailed description or bio of the task',
        example: 'Write DTOs and configure Swagger documentation',
        maxLength: 500,
    })
    @IsString({ message: 'bio must be text' })
    @IsNotEmpty({ message: 'bio is required' })
    @MaxLength(500, { message: 'bio too long (max 500 chars)' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    bio: string;

    @ApiPropertyOptional({
        description: 'Task priority level',
        enum: TodoPriority,
        default: TodoPriority.MEDIUM,
        example: TodoPriority.MEDIUM,
    })
    @IsOptional()
    @IsEnum(TodoPriority, {
        message: `priority must be one of: ${Object.values(TodoPriority).join(', ')}`,
    })
    priority?: TodoPriority;

    @ApiProperty({
        description:
            'Category the todo belongs to — required, and it must be one of your own categories',
        example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    })
    @IsNotEmpty({ message: 'categoryId is required' })
    @IsUUID('4', { message: 'categoryId must be valid UUIDv4' })
    categoryId: string;
}
