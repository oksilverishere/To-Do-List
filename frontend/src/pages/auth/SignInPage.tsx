import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '../../api/auth'
import { AuthShell } from '../../components/AuthShell'
import { Button, Input } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useNotify } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../lib/errors'

interface LocationState {
  from?: { pathname?: string }
}

export function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refresh } = useAuth()
  const toast = useNotify()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await signIn({ email, password })
      // Reload /user/me so the session has the full profile (role, avatar).
      await refresh()
      toast.success(`Welcome back, ${user.name}!`)
      const from = (location.state as LocationState | null)?.from?.pathname
      navigate(from ?? '/', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Welcome back — pick up where you left off.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="field-error">{error}</p>}
        <Button type="submit" loading={loading} className="mt-2">
          Sign in
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-indigo-400 hover:text-indigo-300">
            Forgot password?
          </Link>
          <Link to="/admin/sign-in" className="text-slate-500 hover:text-slate-300">
            Admin sign in
          </Link>
        </div>
        <p className="text-center text-sm text-slate-400">
          No account yet?{' '}
          <Link to="/sign-up" className="text-indigo-400 hover:text-indigo-300">
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}