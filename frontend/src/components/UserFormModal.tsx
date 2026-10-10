import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, Input, Modal, Select } from './ui'
import { getApiErrorMessage } from '../lib/errors'
import type { DashboardUser } from '../types/api'

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
]

export interface UserFormBody {
  userName: string
  email: string
  password?: string
  role?: 'user' | 'admin'
}

/** Shared create / edit dialog for a user in the admin panel. */
export function UserFormModal({
  open,
  onClose,
  title,
  initial,
  submitting,
  passwordRequired,
  lockRole = false,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  title: string
  initial?: DashboardUser
  submitting: boolean
  passwordRequired: boolean
  lockRole?: boolean
  onSubmit: (body: UserFormBody) => Promise<void>
}) {
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setUserName(initial?.name ?? '')
      setEmail(initial?.email ?? '')
      setPassword('')
      setRole(initial?.role === 'admin' ? 'admin' : 'user')
      setError('')
    }
  }, [open, initial])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      const body: UserFormBody = { userName: userName.trim(), email }
      if (password) body.password = password
      // A locked role (the super admin account) is never sent or changed.
      if (!lockRole) body.role = role
      if (passwordRequired && !password) {
        setError('Password is required')
        return
      }
      await onSubmit(body)
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Username"
          minLength={3}
          maxLength={30}
          required
          placeholder="e.g. Silver"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          required={passwordRequired}
          placeholder={passwordRequired ? 'Set a password' : 'Leave blank to keep it'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          disabled={lockRole}
          onChange={(e) => setRole(e.target.value as 'user' | 'admin')}
        />
        {error && <p className="field-error">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}