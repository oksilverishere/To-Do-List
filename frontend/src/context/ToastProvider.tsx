import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { ToastContext } from './toast-context'
import type { ToastContextValue, ToastType } from './toast-context'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'border-emerald-500/40 text-emerald-100',
  error: 'border-rose-500/40 text-rose-100',
  info: 'border-slate-600 text-slate-100',
}

const TOAST_ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const TOAST_LIFETIME_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++nextId.current
      setToasts((prev) => [...prev.slice(-3), { id, message, type }])
      setTimeout(() => dismiss(id), TOAST_LIFETIME_MS)
    },
    [dismiss],
  )

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type]
          return (
            <div
              key={toast.id}
              role="status"
              className={`flex items-start gap-2 rounded-lg border bg-slate-900/95 px-3 py-2.5 text-sm shadow-lg backdrop-blur ${TOAST_STYLES[toast.type]}`}
            >
              <Icon className="mt-0.5 size-4 shrink-0" />
              <span className="flex-1">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-0.5 text-slate-400 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}