import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';

/**
 * Shape returned by `GET /user/me`.
 *
 * Unlike `UserResponseDto`, this also carries the `avatarUrl` and `role`, so a
 * refreshed browser can rebuild the whole session from the cookie alone. The
 * password hash is never included.
 */
export class MeResponseDto {
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

    @ApiProperty({
        description: 'Profile image URL, null when none was uploaded',
        example: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
        nullable: true,
    })
    avatarUrl: string | null;

    @ApiProperty({
        description: 'Account role',
        enum: UserRole,
        example: UserRole.USER,
    })
    role: UserRole;
}
