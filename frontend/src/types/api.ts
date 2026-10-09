// Mirrors the response shapes from the NestJS backend.

export type UserRole = 'user' | 'admin' | 'editor' | 'viewer' | 'superAdmin'

export type TodoStatus = 'pending' | 'done'

export type TodoPriority = 'low' | 'medium' | 'high'

/** The minimal user returned by sign-in. */
export interface AuthUser {
  id: string
  name: string
  email: string
}

/** GET /user/me — the full session-ready profile. */
export interface Me {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: UserRole
}

/** POST /user/sign-in and /dashboard/sign-in. */
export interface SignInResponse {
  user: AuthUser
  accessToken: string
}

/** PATCH /user/profile and POST /user/image. */
export interface ProfileResult {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface Category {
  id: string
  title: string
  bio: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryBody {
  title: string
  bio: string
}

/** The card shape used by the list / category / search to-do routes. */
export interface Todo {
  id: string
  title: string
  bio: string
  status: TodoStatus
  priority: TodoPriority
}

/** GET /to-do/:id. */
export interface TodoDetail {
  title: string
  status: TodoStatus
  bio: string
  priority: TodoPriority
  categoryId: string | null
}

/** PATCH /to-do/editTodo/:id. */
export interface TodoEditResult {
  title: string
  bio: string
  status: TodoStatus
  priority: TodoPriority
}

export interface CreateTodoBody {
  title: string
  bio: string
  categoryId: string
  priority?: TodoPriority
}

export interface UpdateTodoBody {
  title?: string
  bio?: string
  priority?: TodoPriority
}

export interface SearchTodoParams {
  name?: string
  status?: TodoStatus
  priority?: TodoPriority
  sortBy?: 'name' | 'priority' | 'status'
}

export interface ChangeStatusResult {
  message: string
  status: TodoStatus
}

/** A user row as the dashboard exposes it (no password, no timestamps). */
export interface DashboardUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatarUrl: string | null
}

export interface CreateUserBody {
  userName: string
  email: string
  password: string
  role: 'user' | 'admin'
}

export interface EditUserBody {
  userName?: string
  email?: string
  password?: string
  role?: 'user' | 'admin'
}

export interface SearchUsersParams {
  search?: string
  searchBy?: 'all' | 'name' | 'role'
}

export interface CountResult {
  count: number
}

export interface MessageResult {
  message: string
}
