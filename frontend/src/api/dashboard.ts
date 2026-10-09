import { api } from '../lib/axios'
import type {
  CountResult,
  CreateUserBody,
  DashboardUser,
  EditUserBody,
  MessageResult,
  SearchUsersParams,
  SignInResponse,
} from '../types/api'

export interface DashboardSignInBody {
  email: string
  password: string
}

export const dashboardSignIn = (body: DashboardSignInBody) =>
  api.post<SignInResponse>('/dashboard/sign-in', body).then((r) => r.data)

export const listUsers = (params: SearchUsersParams) =>
  api.get<DashboardUser[]>('/dashboard/search', { params }).then((r) => r.data)

export const createUser = (body: CreateUserBody) =>
  api.post<DashboardUser>('/dashboard/newUser', body).then((r) => r.data)

export const countUsers = () =>
  api.get<CountResult>('/dashboard/users/count').then((r) => r.data)

export const getUser = (id: string) =>
  api.get<DashboardUser>(`/dashboard/users/${id}`).then((r) => r.data)

export const editUser = (id: string, body: EditUserBody) =>
  api.patch<DashboardUser>(`/dashboard/users/${id}`, body).then((r) => r.data)

export const deleteUser = (id: string) =>
  api.delete<MessageResult>(`/dashboard/users/${id}`).then((r) => r.data)
