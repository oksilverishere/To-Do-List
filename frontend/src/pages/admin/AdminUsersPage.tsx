import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import {
  countUsers,
  createUser,
  deleteUser,
  editUser,
  listUsers,
} from '../../api/dashboard'
import { PageHeader } from '../../components/PageHeader'
import { UserFormModal } from '../../components/UserFormModal'
import type { UserFormBody } from '../../components/UserFormModal'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Select, Spinner } from '../../components/ui'
import type { BadgeTone } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useNotify } from '../../hooks/useToast'
import { getApiErrorMessage } from '../../lib/errors'
import type { DashboardUser, SearchUsersParams } from '../../types/api'

const SEARCH_BY_OPTIONS = [
  { value: 'all', label: 'All fields' },
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
]

const ROLE_TONES: Record<string, BadgeTone> = {
  superAdmin: 'rose',
  admin: 'indigo',
  user: 'sky',
  editor: 'amber',
  viewer: 'slate',
}

type ModalMode = 'create' | 'edit'
type ModalState = { mode: ModalMode; user?: DashboardUser } | null

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useNotify()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [searchBy, setSearchBy] = useState<'all' | 'name' | 'role'>('all')
  const [modal, setModal] = useState<ModalState>(null)
  const [deleting, setDeleting] = useState<DashboardUser | null>(null)

  const isSuperAdmin = currentUser?.role === 'superAdmin'

  const params = useMemo<SearchUsersParams>(() => {
    const next: SearchUsersParams = { searchBy }
    if (search.trim()) next.search = search.trim()
    return next
  }, [search, searchBy])

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => listUsers(params),
  })

  const countQuery = useQuery({
    queryKey: ['admin', 'usersCount'],
    queryFn: () => countUsers(),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    queryClient.invalidateQueries({ queryKey: ['admin', 'usersCount'] })
  }

  const createMutation = useMutation({
    mutationFn: (body: UserFormBody) =>
      createUser({
        userName: body.userName,
        email: body.email,
        password: body.password ?? '',
        role: body.role ?? 'user',
      }),
    onSuccess: () => {
      toast.success('User created')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const editMutation = useMutation({
    mutationFn: (args: { id: string; body: UserFormBody }) =>
      editUser(args.id, {
        userName: args.body.userName,
        email: args.body.email,
        ...(args.body.password ? { password: args.body.password } : {}),
        ...(args.body.role ? { role: args.body.role } : {}),
      }),
    onSuccess: () => {
      toast.success('User updated')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const users = usersQuery.data ?? []

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          countQuery.data
            ? `${countQuery.data.count} regular user${countQuery.data.count === 1 ? '' : 's'} on the site`
            : 'Manage every account'
        }
        actions={
          <Button onClick={() => setModal({ mode: 'create' })}>
            <Plus className="size-4" /> New user
          </Button>
        }
      />

      <Card className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label htmlFor="user-search" className="label">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500" />
            <input
              id="user-search"
              className="input pl-9"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Select
          label="Search by"
          options={SEARCH_BY_OPTIONS}
          value={searchBy}
          onChange={(e) =>
            setSearchBy(e.target.value as 'all' | 'name' | 'role')
          }
        />
      </Card>

      {usersQuery.isLoading ? (
        <Spinner label="Loading users…" />
      ) : users.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try a different search, or add a new user."
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/60 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="flex items-center gap-3 hover:text-indigo-300"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="size-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex size-8 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-semibold text-indigo-300">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="font-medium text-white">{user.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ROLE_TONES[user.role] ?? 'slate'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {(user.role !== 'superAdmin' ||
                        user.id === currentUser?.id) && (
                        <button
                          type="button"
                          onClick={() => setModal({ mode: 'edit', user })}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                          title="Edit user"
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                      {isSuperAdmin && user.role !== 'superAdmin' && (
                        <button
                          type="button"
                          onClick={() => setDeleting(user)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-400"
                          title="Delete user"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <UserFormModal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.mode === 'edit' ? 'Edit user' : 'New user'}
        initial={modal?.mode === 'edit' ? modal.user : undefined}
        passwordRequired={modal?.mode === 'create'}
        lockRole={modal?.mode === 'edit' && modal.user?.role === 'superAdmin'}
        submitting={createMutation.isPending || editMutation.isPending}
        onSubmit={async (body) => {
          if (modal?.mode === 'edit' && modal.user) {
            await editMutation.mutateAsync({ id: modal.user.id, body })
          } else {
            await createMutation.mutateAsync(body)
          }
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            deleteMutation.mutateAsync(deleting.id).then(() => setDeleting(null))
          }
        }}
        title="Delete user?"
        message={`"${deleting?.name}" and all of their categories and to-dos will be removed.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}