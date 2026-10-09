import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

/**
 * Returned by `POST /user/sign-in`.
 *
 * The token is also set as an httpOnly cookie, so a browser client never has
 * to read it out of the body. The body copy exists for non-browser clients
 * that cannot use cookies.
 */
export class SignInResponseDto {
    @ApiProperty({
        description: 'The authenticated user. The password is never returned.',
        type: UserResponseDto,
    })
    user: UserResponseDto;

    @ApiProperty({
        description:
          'The signed JWT. Also set as an httpOnly cookie named access_token.',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMG…',
    })
    accessToken: string;
}