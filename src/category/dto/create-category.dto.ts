import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
    @ApiProperty({
        description:
            'Category title. Unique within the caller\'s own account — the same title can exist for a different user.',
        example: 'programming',
        minLength: 2,
        maxLength: 50,
    })
    @IsString({ message: 'title must be text' })
    @IsNotEmpty({ message: 'title is required' })
    @MinLength(2, { message: 'title too short (min 2 chars)' })
    @MaxLength(50, { message: 'title too long (max 50 chars)' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    title: string;

    @ApiProperty({
        description: 'Short description of the category',
        example: 'this category for programming learnings',
        maxLength: 500,
    })
    @IsString({ message: 'bio must be text' })
    @IsNotEmpty({ message: 'bio is required' })
    @MaxLength(500, { message: 'bio too long (max 500 chars)' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    bio: string;
}