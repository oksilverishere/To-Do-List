import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Camera, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import { changePassword, resetPassword, updateProfile, uploadImage } from '../api/user'
import { PageHeader } from '../components/PageHeader'
import { Button, Card, Input } from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useNotify } from '../hooks/useToast'
import { getApiErrorMessage } from '../lib/errors'

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const toast = useNotify()

  const [name, setName] = useState(user?.name ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [resetNew, setResetNew] = useState('')
  const [resetConfirm, setResetConfirm] = useState('')

  const [nameError, setNameError] = useState('')
  const [changePwError, setChangePwError] = useState('')
  const [resetPwError, setResetPwError] = useState('')

  useEffect(() => {
    setName(user?.name ?? '')
  }, [user?.name])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const profileMutation = useMutation({
    mutationFn: async () => {
      if (name !== user?.name) {
        await updateProfile({ name })
      }
      if (imageFile) {
        await uploadImage(imageFile)
      }
    },
    onSuccess: async () => {
      await refresh()
      setImageFile(null)
      toast.success('Profile updated')
    },
    onError: (error) => {
      setNameError(getApiErrorMessage(error))
      toast.error(getApiErrorMessage(error))
    },
  })

  const changePwMutation = useMutation({
    mutationFn: () =>
      changePassword({ oldPassword, newPassword, confirmPassword }),
    onSuccess: () => {
      toast.success('Password changed')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setChangePwError('')
    },
    onError: (error) => setChangePwError(getApiErrorMessage(error)),
  })

  const resetPwMutation = useMutation({
    mutationFn: () => resetPassword({ newPassword: resetNew, confirmPassword: resetConfirm }),
    onSuccess: () => {
      toast.success('Password reset')
      setResetNew('')
      setResetConfirm('')
      setResetPwError('')
    },
    onError: (error) => setResetPwError(getApiErrorMessage(error)),
  })

  const handleProfile = (event: FormEvent) => {
    event.preventDefault()
    setNameError('')
    if (name === user?.name && !imageFile) {
      toast.info('Nothing to update — change your name or pick an image.')
      return
    }
    profileMutation.mutate()
  }

  const handleChangePassword = (event: FormEvent) => {
    event.preventDefault()
    setChangePwError('')
    if (newPassword !== confirmPassword) {
      setChangePwError('New password and confirmation do not match')
      return
    }
    changePwMutation.mutate()
  }

  const handleResetPassword = (event: FormEvent) => {
    event.preventDefault()
    setResetPwError('')
    if (resetNew !== resetConfirm) {
      setResetPwError('New password and confirmation do not match')
      return
    }
    resetPwMutation.mutate()
  }

  const avatarUrl = imagePreview ?? user?.avatarUrl ?? null

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your account details and security settings."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <UserRound className="size-5 text-indigo-400" />
            <h2 className="font-semibold text-white">Profile</h2>
          </div>

          <div className="mb-6 flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={user?.name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-indigo-600/20 text-xl font-semibold text-indigo-300">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                <Camera className="size-4" /> Change photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-xs text-slate-500">
                jpeg, png, webp or gif · max 5 MB
              </p>
            </div>
          </div>

          <form onSubmit={handleProfile} className="flex flex-col gap-4" noValidate>
            <Input
              label="Username"
              minLength={3}
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div>
              <span className="label">Email</span>
              <p className="input cursor-not-allowed bg-slate-900/40 text-slate-400">
                {user?.email}
              </p>
            </div>
            {nameError && <p className="field-error">{nameError}</p>}
            <div className="flex justify-end">
              <Button type="submit" loading={profileMutation.isPending}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="size-5 text-indigo-400" />
              <h2 className="font-semibold text-white">Change password</h2>
            </div>
            <form
              onSubmit={handleChangePassword}
              className="flex flex-col gap-4"
              noValidate
            >
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {changePwError && <p className="field-error">{changePwError}</p>}
              <div className="flex justify-end">
                <Button type="submit" loading={changePwMutation.isPending}>
                  Change password
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-5 text-indigo-400" />
              <h2 className="font-semibold text-white">Reset password</h2>
            </div>
            <p className="mb-4 text-sm text-slate-500">
              Same as changing it, but you are already signed in — no old
              password needed.
            </p>
            <form
              onSubmit={handleResetPassword}
              className="flex flex-col gap-4"
              noValidate
            >
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={resetNew}
                onChange={(e) => setResetNew(e.target.value)}
              />
              <Input
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
              />
              {resetPwError && <p className="field-error">{resetPwError}</p>}
              <div className="flex justify-end">
                <Button type="submit" loading={resetPwMutation.isPending}>
                  Reset password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}