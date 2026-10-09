import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Body for `PATCH /user/profile`.
 *
 * Everything is optional: the same route updates the name, the image, or both.
 * The image does not live here because a file arrives as multipart data and is
 * handled by multer (FileInterceptor), not by the ValidationPipe.
 */
export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: 'New username. Omit it to keep the current one.',
        example: 'Silver',
        minLength: 1,
        maxLength: 30,
    })
    @IsOptional()
    @IsString({ message: 'name must be text' })
    @MinLength(1, { message: 'name too short (min 1 char)' })
    @MaxLength(30, { message: 'name too long (max 30 chars)' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    name?: string;
}
