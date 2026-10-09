import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPassword, verifyCode } from '../../api/auth'
import { AuthShell } from '../../components/AuthShell'
import { Button, Input } from '../../components/ui'
import { useNotify } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../lib/errors'

export function ForgotPasswordPage() {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useNotify()
  const navigate = useNavigate()

  const requestCode = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotPassword({ email })
      // Same message is returned whether or not the email exists.
      toast.info('If that email exists, a 6-digit code has been sent.')
      setStep(2)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (newPassword !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await verifyCode({ email, code, newPassword, confirmPassword: confirm })
      toast.success('Password reset! Sign in with your new password.')
      navigate('/sign-in', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        step === 1
          ? 'We will email you a 6-digit code.'
          : 'Enter the code and your new password.'
      }
    >
      {step === 1 && (
        <form onSubmit={requestCode} className="flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="field-error">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2">
            Send reset code
          </Button>
          <Link
            to="/sign-in"
            className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={resetPassword} className="flex flex-col gap-4" noValidate>
          <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-200">
            <MailCheck className="size-5 shrink-0" />
            <span>
              Code sent to <span className="font-medium">{email}</span>
            </span>
          </div>
          <Input
            label="6-digit code"
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="483920"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="Confirm new password"
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
            Reset password
          </Button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft className="size-4" /> Use a different email
          </button>
        </form>
      )}
    </AuthShell>
  )
}