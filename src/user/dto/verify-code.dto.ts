import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyCodeDto {
    @ApiProperty({
        description: 'The account the code was sent to',
        example: 'ahm5dn5hh5s@gmail.com',
    })
    @IsEmail({}, { message: 'email must be a valid email address' })
    @IsNotEmpty({ message: 'email is required' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email: string;

    @ApiProperty({
        description: 'The 6-digit code received by email',
        example: '483920',
    })
    @IsString({ message: 'code must be string' })
    @IsNotEmpty({ message: 'code is required' })
    @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
    code: string;

    @ApiProperty({
        description: 'New password',
        example: 'NewSecretPass456',
        minLength: 8,
        maxLength: 255,
    })
    @IsString({ message: 'newPassword must be string' })
    @IsNotEmpty({ message: 'newPassword is required' })
    @MinLength(8, { message: 'newPassword must be at least 8 characters long' })
    @MaxLength(255, { message: 'newPassword cannot exceed 255 characters' })
    newPassword: string;

    @ApiProperty({
        description: 'Repeat the new password — must match newPassword',
        example: 'NewSecretPass456',
        minLength: 8,
        maxLength: 255,
    })
    @IsString({ message: 'confirmPassword must be string' })
    @IsNotEmpty({ message: 'confirmPassword is required' })
    @MinLength(8, { message: 'confirmPassword must be at least 8 characters long' })
    @MaxLength(255, { message: 'confirmPassword cannot exceed 255 characters' })
    confirmPassword: string;
}
