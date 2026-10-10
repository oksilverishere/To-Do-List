import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2, UserX, Users } from 'lucide-react'
import { deleteUser, editUser, getUser } from '../../api/dashboard'
import { PageHeader } from '../../components/PageHeader'
import { UserFormModal } from '../../components/UserFormModal'
import type { UserFormBody } from '../../components/UserFormModal'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Spinner } from '../../components/ui'
import type { BadgeTone } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useNotify } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../lib/errors'

const ROLE_TONES: Record<string, BadgeTone> = {
  superAdmin: 'rose',
  admin: 'indigo',
  user: 'sky',
  editor: 'amber',
  viewer: 'slate',
}

export function AdminUserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useNotify()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()

  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isSuperAdmin = currentUser?.role === 'superAdmin'

  const userQuery = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => getUser(id),
  })

  const editMutation = useMutation({
    mutationFn: (body: UserFormBody) =>
      editUser(id, {
        userName: body.userName,
        email: body.email,
        ...(body.password ? { password: body.password } : {}),
        ...(body.role ? { role: body.role } : {}),
      }),
    onSuccess: () => {
      toast.success('User updated')
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'usersCount'] })
      navigate('/admin/users', { replace: true })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (userQuery.isLoading) return <Spinner label="Loading user…" />

  const user = userQuery.data
  const canDelete = isSuperAdmin && user?.role !== 'superAdmin'
  // The super admin account can only be edited by the super admin himself.
  const canEdit = user?.role !== 'superAdmin' || currentUser?.id === user?.id

  if (!user) {
    return (
      <Card>
        <EmptyState
          icon={UserX}
          title="User not found"
          description="No account has that id, or you cannot view it."
        />
        <div className="flex justify-center">
          <Link to="/admin/users">
            <Button variant="ghost">
              <ArrowLeft className="size-4" /> Back to users
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Link
        to="/admin/users"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft className="size-4" /> Users
      </Link>

      <PageHeader
        title={`@${user.name}`}
        description="Account details, editable only by an admin."
        actions={
          <>
            {canEdit && (
              <Button variant="ghost" onClick={() => setEditing(true)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
          </>
        }
      />

      <Card className="max-w-md">
        <div className="mb-5 flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-indigo-600/20 text-xl font-semibold text-indigo-300">
              {user.name.charAt(0).toUpperCase()}
            </span>
          )}
          <div>
            <Badge tone={ROLE_TONES[user.role] ?? 'slate'}>{user.role}</Badge>
            {user.role === 'superAdmin' && (
              <p className="mt-1 text-xs text-slate-500">
                This account cannot be deleted.
              </p>
            )}
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Email</dt>
            <dd className="truncate text-slate-100">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">User id</dt>
            <dd className="truncate font-mono text-xs text-slate-400">{user.id}</dd>
          </div>
        </dl>

        <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <Users className="size-4" /> Their categories and to-dos are not shown
          here.
        </p>
      </Card>

      <UserFormModal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit user"
        initial={user}
        passwordRequired={false}
        lockRole={user.role === 'superAdmin'}
        submitting={editMutation.isPending}
        onSubmit={async (body) => {
          await editMutation.mutateAsync(body)
          setEditing(false)
        }}
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={() => deleteMutation.mutateAsync()}
        title="Delete user?"
        message={`"${user.name}" and all of their categories and to-dos will be removed.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}