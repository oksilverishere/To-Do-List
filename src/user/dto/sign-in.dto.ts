import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignInDto {
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