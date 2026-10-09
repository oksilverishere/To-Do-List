import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/** Query params for `GET /dashboard/users` — everything is optional. */
export class SearchUsersDto {
    @ApiProperty({
        description: 'Text to search for. Matched against name, email and/or role depending on `searchBy`. Case-insensitive.',
        example: 'silver',
        required: false,
    })
    @IsString({ message: 'search must be string' })
    @IsOptional()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    search: string;

    @ApiProperty({
        description: 'Which field the search matches: `all` = name + email + role, `name` = name only, `role` = role only.',
        example: 'all',
        enum: ['all', 'name', 'role'],
        required: false,
    })
    @IsIn(['all', 'name', 'role'], { message: 'searchBy must be all, name or role' })
    @IsOptional()
    searchBy: 'all' | 'name' | 'role';
}
