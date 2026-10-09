import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class ForgotPasswordDto {
    @ApiProperty({
        description: 'The registered account email — a reset code is sent to it',
        example: 'ahm5dn5hh5s@gmail.com',
    })
    @IsEmail({}, { message: 'email must be a valid email address' })
    @IsNotEmpty({ message: 'email is required' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    email: string;
}
