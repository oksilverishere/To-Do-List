import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateToDoDto } from './create-to-do.dto';

/** Editable fields only: title, bio and priority. Not the status, not the category. */
export class UpdateToDoDto extends PartialType(
    OmitType(CreateToDoDto, ['categoryId'] as const),
) {}
