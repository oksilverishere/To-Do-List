import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsIn,
    IsNotEmpty,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserByAdminDto {
    @ApiProperty({
        description: 'Username',
        example: 'S_I_L_V_E_R',
        minLength: 3,
        maxLength: 30,
    })
    @IsString({ message: 'userName must be string' })
    @IsNotEmpty({ message: 'userName is required' })
    @MinLength(3, { message: 'userName must have at least 3 characters' })
    @MaxLength(30, { message: 'userName cannot exceed 30 characters' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    userName: string;

    @ApiProperty({
        description: 'User email address',
        example: 'ahm5dn5hh5s@gmail.com',
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

    @ApiProperty({
        description: 'Role for the new account. Only `user` and `admin` are allowed.',
        example: 'user',
        enum: ['user', 'admin'],
    })
    @IsIn(['user', 'admin'], { message: 'role must be either user or admin' })
    @IsNotEmpty({ message: 'role is required' })
    role: 'user' | 'admin';
}
