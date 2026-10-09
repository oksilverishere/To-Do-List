import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** Same rules as `SignInDto`, but with the admin account's Swagger examples. */
export class DashboardSignInDto {
    @ApiProperty({
        description: 'Admin email address',
        example: 'ahm5dn5hh5s@gmail.com',
    })
    @IsEmail({}, { message: 'email must be a valid email address' })
    @IsNotEmpty({ message: 'email is required' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email: string;

    @ApiProperty({
        description: 'Admin password',
        example: 'admin@12211221',
        minLength: 8,
    })
    @IsString({ message: 'password must be string' })
    @IsNotEmpty({ message: 'password is required' })
    @MinLength(8, { message: 'password must be at least 8 characters long' })
    password: string;
}
