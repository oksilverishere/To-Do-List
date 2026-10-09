import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        description: 'Current account password',
        example: 'SecretPass123',
        minLength: 8,
        maxLength: 255,
    })
    @IsString({ message: 'oldPassword must be string' })
    @IsNotEmpty({ message: 'oldPassword is required' })
    @MinLength(8, { message: 'oldPassword must be at least 8 characters long' })
    @MaxLength(255, { message: 'oldPassword cannot exceed 255 characters' })
    oldPassword: string;

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
