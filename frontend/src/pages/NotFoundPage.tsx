import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 p-4">
      <p className="text-6xl font-bold text-slate-700">404</p>
      <p className="text-slate-400">This page does not exist.</p>
      <Link to="/">
        <Button>Go home</Button>
      </Link>
    </div>
  )
}