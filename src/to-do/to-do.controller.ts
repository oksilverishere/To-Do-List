import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { ToDoService } from './to-do.service';
import { CreateToDoDto } from './dto/create-to-do.dto';
import { UpdateToDoDto } from './dto/update-to-do.dto';
import { ChangeStatusDto, ChangeStatusResponseDto } from './dto/change-status.dto';
import { SearchToDoDto } from './dto/search-to-do.dto';
import {
  TodoByIdResponseDto,
  TodoEditResponseDto,
  TodoListResponseDto,
  TodoResponseDto,
} from './dto/todo-response.dto';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from '../auth/auth.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.interfaces';

@ApiTags('to-do')
@Controller('to-do')
export class ToDoController {
  constructor(private readonly toDoService: ToDoService) {}

  @Post('newTodo')
  // No @Public(), so the global JwtAuthGuard protects this route.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Create a to-do',
    description:
      'Creates a to-do inside one of the caller\'s own categories. Only title, bio, categoryId and priority are accepted (status is never sent — it starts as pending). The category is required and the owner is taken from the access token, never from the request body.',
  })
  @ApiCreatedResponse({
    description: 'The to-do was created.',
    type: TodoResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The payload failed validation.',
  })
  @ApiNotFoundResponse({
    description: 'No such category for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  create(
    @Body() createToDoDto: CreateToDoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TodoResponseDto> {
    return this.toDoService.create(createToDoDto, user.id);
  }

  @Patch('editTodo/:id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // ParseUUIDPipe rejects a non-uuid :id with a 400 before the service runs.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Edit a to-do',
    description:
      'Changes the fields that were sent on one of the caller\'s own to-dos; omitted fields keep their value. Only title, bio and priority can be edited — not the status and not the category.',
  })
  @ApiOkResponse({
    description: 'The to-do was updated.',
    type: TodoEditResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Nothing was sent, the payload failed validation, or the value is not allowed.',
  })
  @ApiNotFoundResponse({
    description: 'No such to-do for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateToDoDto: UpdateToDoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TodoEditResponseDto> {
    return this.toDoService.update(id, updateToDoDto, user.id);
  }

  @Patch('changeStatus/:id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // The status lives only here — create/edit cannot touch it.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Change the status of a to-do',
    description:
      "Switches the status of one of the caller's own to-dos between pending and done.",
  })
  @ApiOkResponse({
    description: 'The status was changed.',
    type: ChangeStatusResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The payload failed validation.',
  })
  @ApiNotFoundResponse({
    description: 'No such to-do for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStatusDto: ChangeStatusDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeStatusResponseDto> {
    return this.toDoService.changeStatus(id, changeStatusDto.status, user.id);
  }

  @Delete('deleteTodo/:id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // Deletes the to-do only — the category it lives in stays.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Delete a to-do',
    description:
      "Deletes one of the caller's own to-dos. The category is NOT deleted with it.",
  })
  @ApiOkResponse({
    description: 'The to-do was deleted.',
  })
  @ApiNotFoundResponse({
    description: 'No such to-do for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string }> {
    return this.toDoService.remove(id, user.id);
  }

  @Get('category/:categoryId')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // Registered before @Get(':id') so "category" is never parsed as a uuid.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Get all to-dos of a category',
    description:
      "Returns every to-do inside one of the caller's own categories, oldest first.",
  })
  @ApiOkResponse({
    description: "The category's to-dos.",
    type: TodoListResponseDto,
    isArray: true,
  })
  @ApiNotFoundResponse({
    description: 'No such category for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  findAll(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TodoListResponseDto[]> {
    return this.toDoService.findAll(categoryId, user.id);
  }

  @Get('search')
  // No @Public(), so the global JwtAuthGuard protects this route.
  // Registered before @Get(':id') so "search" is never parsed as a uuid.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Search your to-dos',
    description:
      "Filters the caller's own to-dos by name (partial, case-insensitive), status and/or priority — all optional, name is only the search text. Results are sorted by the fixed sortBy key (default name: 0-1, a-z, A-Z; priority: low, medium, high; status: pending, done). The sort direction is never up to the caller.",
  })
  @ApiOkResponse({
    description: 'The matching to-dos, in the fixed order of sortBy.',
    type: TodoListResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'A filter value failed validation.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  search(
    @Query() searchToDoDto: SearchToDoDto,
    @CurrentUser() user: AuthUser,
  ): Promise<TodoListResponseDto[]> {
    return this.toDoService.search(searchToDoDto, user.id);
  }

  @Get(':id')
  // No @Public(), so the global JwtAuthGuard protects this route.
  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @ApiOperation({
    summary: 'Get to-do by id',
    description:
      "Returns one of the caller's own to-dos by its id. Somebody else's to-do simply looks missing.",
  })
  @ApiOkResponse({
    description: 'The to-do.',
    type: TodoByIdResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No such to-do for this user.',
  })
  @ApiUnauthorizedResponse({
    description: NOT_ALLOWED_MESSAGE,
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TodoByIdResponseDto> {
    return this.toDoService.findOne(id, user.id);
  }
}
