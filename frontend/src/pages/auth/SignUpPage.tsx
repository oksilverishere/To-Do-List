import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '../../api/auth'
import { AuthShell } from '../../components/AuthShell'
import { Button, Input } from '../../components/ui'
import { useNotify } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../lib/errors'

export function SignUpPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useNotify()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await signUp({ name, email, password })
      toast.success('Account created! Sign in to continue.')
      navigate('/sign-in', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="It takes about a minute.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Username"
          autoComplete="nickname"
          minLength={3}
          maxLength={30}
          required
          placeholder="e.g. Silver"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Repeat the password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <p className="field-error">{error}</p>}
        <Button type="submit" loading={loading} className="mt-2">
          Create account
        </Button>
        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}