import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiNotFoundResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.interfaces';
import { Public } from '../auth/public.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardSignInDto } from './dto/dashboard-sign-in.dto';
import { SignInResponseDto } from '../user/dto/sign-in-response.dto';
import { CreateUserByAdminDto } from './dto/create-user-by-admin.dto';
import { EditUserByAdminDto } from './dto/edit-user-by-admin.dto';
import { SearchUsersDto } from './dto/search-users.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post('sign-in')
  // The global JwtAuthGuard is deny-by-default, so the login route opts out.
  @Public()
  // POST defaults to 201, but signing in creates nothing — 200 is the honest code.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dashboard sign in',
    description:
      'Admin-only login. Checks the email and password against the stored bcrypt hash, then issues a JWT. The token is returned in the body and set automatically as an httpOnly cookie named `access_token`. Non-admin accounts are rejected.',
  })
  @ApiOkResponse({
    description:
      'Credentials are valid and the account is an admin. Sets the `access_token` cookie and returns the user plus the token.',
    type: SignInResponseDto,
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiBadRequestResponse({
    description: 'The payload failed validation.',
  })
  @ApiUnauthorizedResponse({
    description: `The email or password is wrong, or the account is not an admin (${NOT_ALLOWED_MESSAGE}).`,
  })
  async signIn(
    @Body() signInDto: DashboardSignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponseDto> {
    const { user, accessToken } = await this.dashboardService.signIn(signInDto);

    // httpOnly so JS (and therefore XSS) cannot read it. The body copy stays
    // for clients that do not handle cookies.
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60,
    });

    return { user, accessToken };
  }

  @Post('newUser')
  // No @Public() -> the global JwtAuthGuard requires a valid token, and the
  // service additionally checks that the caller is an admin.
  @ApiOperation({
    summary: 'Add a new user (admin only)',
    description:
      'Creates a new account with userName, email, password and role. All four are required. The role must be `user` or `admin`. The password is bcrypt-hashed before it is stored and the hash is never returned.',
  })
  @ApiCreatedResponse({
    description: 'The created user, without the password hash.',
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiBadRequestResponse({
    description:
      'The payload failed validation, the role is not user/admin, or the email / userName already exists.',
  })
  @ApiUnauthorizedResponse({
    description: 'No valid token, or the caller is not an admin.',
  })
  createUser(
    @Body() createUserByAdminDto: CreateUserByAdminDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return this.dashboardService.createUser(admin.id, createUserByAdminDto);
  }

  @Get('search')
  // No @Public() -> requires a valid token, and the service checks it is an admin.
  @ApiOperation({
    summary: 'List / search users (admin only)',
    description:
      'Returns all users. `search` filters the list case-insensitively and `searchBy` picks the field (`all` = name + email + role, `name`, `role`). The sort is automatic: `name` groups 0-1, then a-z, then A-Z; `role` lists user before admin. Both params are optional — send none to simply see everyone, oldest first.',
  })
  @ApiOkResponse({
    description: 'The matching users, without password hashes.',
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiBadRequestResponse({
    description: 'A param has a value outside its allowed list.',
  })
  @ApiUnauthorizedResponse({
    description: `No valid token, or the caller is not an admin (${NOT_ALLOWED_MESSAGE}).`,
  })
  getUsers(@CurrentUser() admin: AuthUser, @Query() query: SearchUsersDto) {
    return this.dashboardService.getUsers(admin.id, query);
  }

  @Get('users/count')
  // No @Public() -> requires a valid token, and the service checks it is an admin.
  @ApiOperation({
    summary: 'Count users (admin only)',
    description:
      'Returns how many accounts with the role `user` exist on the site. Admins are not counted.',
  })
  @ApiOkResponse({
    description: 'The count of normal users, e.g. `{ "count": 12 }`.',
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiUnauthorizedResponse({
    description: `No valid token, or the caller is not an admin (${NOT_ALLOWED_MESSAGE}).`,
  })
  countUsers(@CurrentUser() admin: AuthUser) {
    return this.dashboardService.countUsers(admin.id);
  }

  @Get('users/:id')
  // No @Public() -> requires a valid token, and the service checks it is an admin.
  @ApiOperation({
    summary: 'Get user by id (admin only)',
    description:
      'Returns one account by its id, whatever its role (user, admin, editor or viewer). The password hash is never returned.',
  })
  @ApiOkResponse({
    description: 'The user, without the password hash.',
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiUnauthorizedResponse({
    description: `No valid token, or the caller is not an admin (${NOT_ALLOWED_MESSAGE}).`,
  })
  @ApiNotFoundResponse({
    description: 'No user has that id.',
  })
  getUserById(
    @CurrentUser() admin: AuthUser,
    // Every :id route uses ParseUUIDPipe, so a bad id is a 400 not a 500.
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dashboardService.getUserById(admin.id, id);
  }

  @Patch('users/:id')
  // No @Public() -> requires a valid token, and the service checks it is an admin.
  @ApiOperation({
    summary: 'Edit a user (admin only)',
    description:
      'Updates any account by id. Send one or more of userName, email, password, role — whatever is sent is changed, the rest is kept. The password is bcrypt-hashed before it is stored. The role must be `user` or `admin`.',
  })
  @ApiOkResponse({
    description: 'The updated user, without the password hash.',
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiBadRequestResponse({
    description:
      'The payload failed validation, nothing was sent, the role is not user/admin, or the email / userName already exists.',
  })
  @ApiUnauthorizedResponse({
    description: `No valid token, or the caller is not an admin (${NOT_ALLOWED_MESSAGE}).`,
  })
  @ApiNotFoundResponse({
    description: 'No user has that id.',
  })
  editUser(
    @CurrentUser() admin: AuthUser,
    // Every :id route uses ParseUUIDPipe, so a bad id is a 400 not a 500.
    @Param('id', ParseUUIDPipe) id: string,
    @Body() editUserByAdminDto: EditUserByAdminDto,
  ) {
    return this.dashboardService.editUser(admin.id, id, editUserByAdminDto);
  }

  @Delete('users/:id')
  // No @Public() -> requires a valid token, and the service checks it is an admin.
  @ApiOperation({
    summary: 'Delete a user (super admin only)',
    description:
      'Deletes any account by id, whatever its role — but only the super admin can call this, and the super admin account itself can never be deleted. The user\'s categories and to-dos are removed too (`ON DELETE CASCADE`).',
  })
  @ApiOkResponse({
    description: 'The user was deleted, e.g. `{ "message": "user deleted successfully" }`.',
  })
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiBadRequestResponse({
    description: 'The target is the super admin account — it cannot be deleted.',
  })
  @ApiUnauthorizedResponse({
    description: `No valid token, or the caller is not the super admin (${NOT_ALLOWED_MESSAGE}).`,
  })
  @ApiNotFoundResponse({
    description: 'No user has that id.',
  })
  deleteUser(
    @CurrentUser() admin: AuthUser,
    // Every :id route uses ParseUUIDPipe, so a bad id is a 400 not a 500.
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dashboardService.deleteUser(admin.id, id);
  }
}
