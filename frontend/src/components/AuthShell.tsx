import type { ReactNode } from 'react'
import { CheckSquare } from 'lucide-react'
import { Card } from './ui'

/** Centered card wrapper used by all the login / sign-up pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <CheckSquare className="size-6" />
          </span>
          <span className="text-2xl font-semibold tracking-tight text-white">
            MyToDo
          </span>
        </div>
        <Card className="p-6">
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </div>
  )
}