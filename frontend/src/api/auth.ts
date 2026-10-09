import { api } from '../lib/axios'
import type { AuthUser, MessageResult, SignInResponse } from '../types/api'

export interface SignUpBody {
  name: string
  email: string
  password: string
}

export interface SignInBody {
  email: string
  password: string
}

export interface ForgotPasswordBody {
  email: string
}

export interface VerifyCodeBody {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}

export const signUp = (body: SignUpBody) =>
  api.post<AuthUser>('/user/sign-up', body).then((r) => r.data)

export const signIn = (body: SignInBody) =>
  api.post<SignInResponse>('/user/sign-in', body).then((r) => r.data)

export const signOut = () =>
  api.post<MessageResult>('/user/sign-out').then((r) => r.data)

export const forgotPassword = (body: ForgotPasswordBody) =>
  api.post<MessageResult>('/user/forgot-password', body).then((r) => r.data)

export const verifyCode = (body: VerifyCodeBody) =>
  api.post<AuthUser>('/user/verify-code', body).then((r) => r.data)
