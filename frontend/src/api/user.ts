import { api } from '../lib/axios'
import type { AuthUser, Me, ProfileResult } from '../types/api'

export interface UpdateProfileBody {
  name?: string
  image?: File
}

export interface ChangePasswordBody {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

export const getMe = () => api.get<Me>('/user/me').then((r) => r.data)

/**
 * PATCH /user/profile is multipart. Only the fields that were actually
 * sent are appended, so an empty name does not overwrite the current one.
 */
export const updateProfile = (body: UpdateProfileBody) => {
  const form = new FormData()
  if (body.name !== undefined && body.name !== '') {
    form.append('name', body.name)
  }
  if (body.image) {
    form.append('image', body.image)
  }
  return api.patch<ProfileResult>('/user/profile', form).then((r) => r.data)
}

/** POST /user/image — the image is required. */
export const uploadImage = (image: File) => {
  const form = new FormData()
  form.append('image', image)
  return api.post<ProfileResult>('/user/image', form).then((r) => r.data)
}

export const changePassword = (body: ChangePasswordBody) =>
  api.patch<AuthUser>('/user/change-password', body).then((r) => r.data)
