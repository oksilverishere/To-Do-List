import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.interfaces';
import { Public } from '../auth/public.decorator';
import { UserService, UpdateProfileResult } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SignInResponseDto } from './dto/sign-in-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Shared by the two routes that accept an image: caps it at 5 MB and
// rejects non-image files before multer buffers them.
const imageUploadInterceptor = FileInterceptor('image', {
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException('image must be jpeg, png, webp or gif'), false);
      return;
    }
    cb(null, true);
  },
});

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('sign-up')
  // JwtAuthGuard is global and deny-by-default, so this has to opt out.
  @Public()
  @ApiOperation({
    summary: 'Sign up',
    description:
      'Creates a new user. The password is bcrypt-hashed before it is stored and the hash is never returned.',
  })
  @ApiCreatedResponse({
    description: 'The created user, without the password hash.',
  })
  @ApiBadRequestResponse({
    description:
      'The payload failed validation, or the email / username has been already exists.',
  })
  signUp(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post('sign-in')
  @Public()
  // POST defaults to 201, but signing in creates nothing — 200 is the honest code.
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in',
    description:
      'Checks the email and password against the stored bcrypt hash, then issues a JWT. The token is returned in the body and set as an httpOnly cookie named `access_token`. The password is never returned.',
  })
  @ApiOkResponse({
    description:
      'Credentials are valid. Sets the `access_token` cookie and returns the user plus the token.',
    type: SignInResponseDto,
  })
  // Makes Swagger UI offer the cookie for sending on later requests.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiBadRequestResponse({
    description: 'The payload failed validation.',
  })
  @ApiUnauthorizedResponse({
    description: 'The email or password is wrong.',
  })
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponseDto> {
    const { user, accessToken } = await this.userService.signIn(signInDto);

    // httpOnly so JS (and therefore XSS) cannot read it. The body copy stays
    // for clients that do not handle cookies.
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      // Only sent over HTTPS once there is a real TLS terminator in front.
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60,
    });

    return { user, accessToken };
  }

  @Post('sign-out')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign out',
    description: 'Clears the `access_token` cookie from the client.',
  })
  @ApiOkResponse({
    description: 'Successfully signed out. Cookie cleared.',
  })
  signOut(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return { message: 'Signed out successfully' };
  }

  @Get('me')
  // No @Public(), so the global JwtAuthGuard protects it.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Get my profile',
    description:
      "Returns the caller's own account, taken from the access token. The browser uses it to restore the session after a page refresh. The password hash is never returned.",
  })
  @ApiOkResponse({
    description: 'The caller, without the password hash.',
    type: MeResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  getMe(@CurrentUser() user: AuthUser): Promise<MeResponseDto> {
    return this.userService.getMe(user.id);
  }

  @Patch('profile')
  // No @Public(), so the global JwtAuthGuard protects it.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  // Parses the multipart body: `image` lands on the @UploadedFile param,
  // everything else lands on @Body.
  @UseInterceptors(imageUploadInterceptor)
  @ApiOperation({
    summary: 'Update profile',
    description:
      'Updates the caller\'s own username, profile image, or both. Both are optional, but at least one must be sent. The image is uploaded to Cloudinary and only its URL is stored.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Both fields are optional, but send at least one.',
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'New username (max 30 chars). Omit to keep the current one.',
          example: 'Silver',
          maxLength: 30,
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'New profile image: jpeg, png, webp or gif, max 5 MB.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'The profile was updated. Returns the user with the new avatar URL.',
  })
  @ApiBadRequestResponse({
    description:
      'Nothing was sent, the name is invalid or already taken, or the image is not a jpeg/png/webp/gif or is bigger than 5 MB.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile()     image?: Express.Multer.File,
  ): Promise<UpdateProfileResult> {
    return this.userService.updateProfile(user.id, updateProfileDto, image);
  }

  @Post('image')
  // No @Public() -> requires a valid access token.
  // POST defaults to 201, but nothing new is created for the caller to
  // fetch later — 200 is the honest code.
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @UseInterceptors(imageUploadInterceptor)
  @ApiOperation({
    summary: 'Upload profile image',
    description:
      'Uploads a profile image for the caller. The file goes to Cloudinary and only its URL is stored. Replaces the previous image if one exists. The image field is required.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'The image file.',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'jpeg, png, webp or gif, max 5 MB.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'The image was uploaded. Returns the user with the new avatar URL.',
  })
  @ApiBadRequestResponse({
    description:
      'No image was sent, or it is not a jpeg/png/webp/gif or is bigger than 5 MB.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  uploadImage(
    @CurrentUser() user: AuthUser,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<UpdateProfileResult> {
    return this.userService.addImage(user.id, image);
  }

  @Patch('change-password')
  // No @Public() -> the global JwtAuthGuard requires a valid token.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Change password',
    description:
      'Changes the caller\'s own password. The old password is checked against the stored bcrypt hash, the new one must match the confirmation, and the new password is hashed before it is saved.',
  })
  @ApiOkResponse({
    description: 'The password was changed. Returns the user, without the password hash.',
  })
  @ApiBadRequestResponse({
    description:
      'The payload failed validation, or newPassword and confirmPassword do not match.',
  })
  @ApiUnauthorizedResponse({
    description:
      'No valid token, the old password is wrong, or the account no longer exists.',
  })
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.changePassword(user.id, changePasswordDto);
  }

  @Patch('reset-password')
  // No @Public() -> the global JwtAuthGuard requires a valid token. The
  // token is the proof of identity, so the old password is not asked for.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Resets the caller\'s own password without asking for the old one. The new password must match the confirmation and is bcrypt-hashed before it is saved.',
  })
  @ApiOkResponse({
    description: 'The password was reset. Returns the user, without the password hash.',
  })
  @ApiBadRequestResponse({
    description:
      'The payload failed validation, or newPassword and confirmPassword do not match.',
  })
  @ApiUnauthorizedResponse({
    description: 'No valid token, or the account no longer exists.',
  })
  resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.userService.resetPassword(user.id, resetPasswordDto);
  }

  @Post('forgot-password')
  // The whole point is to work without a token, so the guard must opt out.
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Forgot password',
    description:
      'Sends a 6-digit reset code to the given email. The same message is returned whether or not the account exists, so the route cannot be used to discover registered emails. Requesting again replaces the old code.',
  })
  @ApiOkResponse({
    description: 'A code was sent to the email (if it exists).',
  })
  @ApiBadRequestResponse({
    description: 'The payload failed validation.',
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.userService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-code')
  // Also public: the emailed code is the proof, no token yet.
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify reset code',
    description:
      'Checks the 6-digit code sent to the email, then sets the new password (bcrypt-hashed) and clears the code — it works only once and only within 10 minutes.',
  })
  @ApiOkResponse({
    description: 'The code was correct and the password was reset. Returns the user, without the password hash.',
  })
  @ApiBadRequestResponse({
    description:
      'The payload failed validation, newPassword and confirmPassword do not match, or the code is wrong, expired or already used.',
  })
  verifyCode(@Body() verifyCodeDto: VerifyCodeDto) {
    return this.userService.verifyCode(verifyCodeDto);
  }
}