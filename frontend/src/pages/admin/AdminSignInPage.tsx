import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { dashboardSignIn } from '../../api/dashboard'
import { AuthShell } from '../../components/AuthShell'
import { Button, Input } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useNotify } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../lib/errors'

export function AdminSignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { refresh } = useAuth()
  const toast = useNotify()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { user } = await dashboardSignIn({ email, password })
      await refresh()
      toast.success(`Welcome back, ${user.name}!`)
      // RequireAdmin bounces non-admins back to the user area.
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Admin sign in"
      subtitle="Restricted to admin accounts only."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Admin email"
          type="email"
          autoComplete="email"
          required
          placeholder="admin@example.com"
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
          Enter dashboard
        </Button>
        <p className="text-center text-sm text-slate-400">
          Just a regular user?{' '}
          <Link to="/sign-in" className="text-indigo-400 hover:text-indigo-300">
            Sign in here
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}