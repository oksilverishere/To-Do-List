import { PartialType } from '@nestjs/swagger';
import { CreateUserByAdminDto } from './create-user-by-admin.dto';

/**
 * Edit a user from the dashboard: every field is optional, send one or more.
 * Same rules as `CreateUserByAdminDto` (role is still only `user`/`admin`),
 * just nothing is required — the service rejects an empty body.
 */
export class EditUserByAdminDto extends PartialType(CreateUserByAdminDto) {}
