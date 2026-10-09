import { createContext } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastContextValue {
  notify: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined,
)