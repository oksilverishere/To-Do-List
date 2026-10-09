import { api } from '../lib/axios'
import type { Category, CreateCategoryBody, MessageResult } from '../types/api'

export const listCategories = () =>
  api.get<Category[]>('/category').then((r) => r.data)

export const getCategory = (id: string) =>
  api.get<Category>(`/category/${id}`).then((r) => r.data)

export const createCategory = (body: CreateCategoryBody) =>
  api.post<Category>('/category/newCategory', body).then((r) => r.data)

export const editCategory = (id: string, body: Partial<CreateCategoryBody>) =>
  api.patch<Category>(`/category/editCategory/${id}`, body).then((r) => r.data)

export const deleteCategory = (id: string) =>
  api
    .delete<MessageResult>(`/category/deleteCategory/${id}`)
    .then((r) => r.data)
