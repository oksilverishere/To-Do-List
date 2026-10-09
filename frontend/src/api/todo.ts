import { api } from '../lib/axios'
import type {
  ChangeStatusResult,
  CreateTodoBody,
  MessageResult,
  SearchTodoParams,
  Todo,
  TodoDetail,
  TodoEditResult,
  TodoStatus,
  UpdateTodoBody,
} from '../types/api'

export const createTodo = (body: CreateTodoBody) =>
  api.post<Todo>('/to-do/newTodo', body).then((r) => r.data)

export const listCategoryTodos = (categoryId: string) =>
  api.get<Todo[]>(`/to-do/category/${categoryId}`).then((r) => r.data)

export const searchTodos = (params: SearchTodoParams) =>
  api.get<Todo[]>('/to-do/search', { params }).then((r) => r.data)

export const getTodo = (id: string) =>
  api.get<TodoDetail>(`/to-do/${id}`).then((r) => r.data)

export const editTodo = (id: string, body: UpdateTodoBody) =>
  api.patch<TodoEditResult>(`/to-do/editTodo/${id}`, body).then((r) => r.data)

export const changeTodoStatus = (id: string, status: TodoStatus) =>
  api
    .patch<ChangeStatusResult>(`/to-do/changeStatus/${id}`, { status })
    .then((r) => r.data)

export const deleteTodo = (id: string) =>
  api.delete<MessageResult>(`/to-do/deleteTodo/${id}`).then((r) => r.data)
