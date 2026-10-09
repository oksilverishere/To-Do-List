import { ApiProperty } from '@nestjs/swagger';

/**
 * Shape returned by `POST /user/sign-in`.
 *
 * The password is deliberately absent — the bcrypt hash must never leave the
 * server. Sign-in still needs to *read* the hash to verify the password, which
 * it does with `bcrypt.compare` inside `UserService.signIn()`.
 */
export class UserResponseDto {
    @ApiProperty({
        description: 'User id',
        example: 'a0e0d0c0-0000-4000-8000-000000000000',
    })
    id: string;

    @ApiProperty({
        description: 'Username',
        example: 'Silver',
    })
    name: string;

    @ApiProperty({
        description: 'User email address',
        example: 'ahm5dn5hh5s@gmail.com',
    })
    email: string;
}