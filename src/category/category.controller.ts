import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.interfaces';

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post('newCategory')
  // No @Public(), so the global JwtAuthGuard protects this route.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Create a category',
    description:
      'Creates a category owned by the caller. The owner is taken from the access token, never from the request body. The title is unique within the caller\'s own account.',
  })
  @ApiCreatedResponse({
    description: 'The category was created.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The payload failed validation, or this title already exists for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.create(createCategoryDto, user.id);
  }

  @Patch('editCategory/:id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // ParseUUIDPipe rejects a non-uuid :id with a 400 before the service runs
  // (a raw +id on a uuid would just be NaN).
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Edit a category',
    description:
      'Changes the title and/or bio of one of the caller\'s own categories. Both fields are optional, but send at least one; omitted fields keep their value. The owner comes from the access token.',
  })
  @ApiOkResponse({
    description: 'The category was updated.',
    type: CategoryResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Nothing was sent, the payload failed validation, or this title already exists for this user.',
  })
  @ApiNotFoundResponse({
    description: 'No such category for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  editCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.editCategory(id, updateCategoryDto, user.id);
  }

  @Get()
  // No @Public(), so the global JwtAuthGuard protects this route.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Get all categories',
    description:
      'Returns every category owned by the caller. The owner comes from the access token, so the list only ever contains your own categories.',
  })
  @ApiOkResponse({
    description: "The caller's categories, oldest first.",
    type: CategoryResponseDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  findAll(@CurrentUser() user: AuthUser): Promise<CategoryResponseDto[]> {
    return this.categoryService.findAll(user.id);
  }

  @Get(':id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // ParseUUIDPipe rejects a non-uuid :id with a 400 before the service runs.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Get category by id',
    description:
      "Returns one of the caller's own categories by its id. Somebody else's category simply looks missing.",
  })
  @ApiOkResponse({
    description: 'The category.',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No such category for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id, user.id);
  }

  @Delete('deleteCategory/:id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // ParseUUIDPipe rejects a non-uuid :id with a 400 before the service runs.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Delete a category',
    description:
      "Deletes one of the caller's own categories together with every to-do inside it. The owner comes from the access token.",
  })
  @ApiOkResponse({
    description: 'The category and its to-dos were deleted.',
  })
  @ApiNotFoundResponse({
    description: 'No such category for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  removeCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string }> {
    return this.categoryService.remove(id, user.id);
  }
}