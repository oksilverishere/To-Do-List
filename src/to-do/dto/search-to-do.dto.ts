import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { TodoPriority, TodoStatus } from '../enums';

export class SearchToDoDto {
    @ApiPropertyOptional({
        description: 'Search inside the to-do title (partial, case-insensitive). Name means title.',
        example: 'nest',
        maxLength: 100,
    })
    @IsOptional()
    @IsString({ message: 'name must be text' })
    @MaxLength(100, { message: 'name too long (max 100 chars)' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    name?: string;

    @ApiPropertyOptional({
        description: 'Only to-dos with this status',
        enum: TodoStatus,
        example: TodoStatus.PENDING,
    })
    @IsOptional()
    @IsEnum(TodoStatus, {
        message: `status must be one of: ${Object.values(TodoStatus).join(', ')}`,
    })
    status?: TodoStatus;

    @ApiPropertyOptional({
        description: 'Only to-dos with this priority',
        enum: TodoPriority,
        example: TodoPriority.LOW,
    })
    @IsOptional()
    @IsEnum(TodoPriority, {
        message: `priority must be one of: ${Object.values(TodoPriority).join(', ')}`,
    })
    priority?: TodoPriority;

    @ApiPropertyOptional({
        description:
            'Fixed sort key: name (default — digits, then a-z, then A-Z), priority (low, medium, high) or status (pending, done). The order itself cannot be changed.',
        enum: ['name', 'priority', 'status'],
        default: 'name',
    })
    @IsOptional()
    @IsIn(['name', 'priority', 'status'], {
        message: 'sortBy must be one of: name, priority, status',
    })
    sortBy?: 'name' | 'priority' | 'status';
}
