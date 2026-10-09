import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
    @ApiProperty({
        description: 'Username',
        example: 'Silver',
        minLength: 3,
        maxLength: 30,
    })
    @IsString({ message: 'name must be string' })
    @IsNotEmpty({ message: 'name is required' })
    @MinLength(3, { message: 'name must have at least 3 characters' })
    @MaxLength(30, { message: 'name cannot exceed 30 characters' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    name: string;

    @ApiProperty({
        description: 'User email address',
        example: 'silverwillbeatyou@gmail.com',
    })
    @IsEmail({}, { message: 'email must be a valid email address' })
    @IsNotEmpty({ message: 'email is required' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email: string;

    @ApiProperty({
        description: 'Account password',
        example: 'SecretPass123',
        minLength: 8,
    })
    @IsString({ message: 'password must be string' })
    @IsNotEmpty({ message: 'password is required' })
    @MinLength(8, { message: 'password must be at least 8 characters long' })
    password: string;
}
