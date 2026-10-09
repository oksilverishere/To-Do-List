import { useContext } from 'react'
import { ToastContext } from '../context/toast-context'

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>')
  }
  return ctx
}

/** Convenience wrappers so callers can write `toast.success(...)`. */
export function useNotify() {
  const { notify } = useToast()
  return {
    success: (message: string) => notify(message, 'success'),
    error: (message: string) => notify(message, 'error'),
    info: (message: string) => notify(message, 'info'),
  }
}