import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ShieldCheck, UserCog, Users } from 'lucide-react'
import { countUsers, listUsers } from '../../api/dashboard'
import { PageHeader } from '../../components/PageHeader'
import { Badge, Card, EmptyState, Spinner } from '../../components/ui'
import type { BadgeTone } from '../../components/ui'
import type { UserRole } from '../../types/api'

const ROLE_TONES: Record<string, BadgeTone> = {
  superAdmin: 'rose',
  admin: 'indigo',
  user: 'sky',
  editor: 'amber',
  viewer: 'slate',
}

export function AdminOverviewPage() {
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'overview'],
    queryFn: () => listUsers({}),
  })

  const countQuery = useQuery({
    queryKey: ['admin', 'usersCount'],
    queryFn: () => countUsers(),
  })

  if (usersQuery.isLoading) return <Spinner label="Loading admin overview…" />

  const users = usersQuery.data ?? []
  const admins = users.filter(
    (u) => u.role === 'admin' || u.role === 'superAdmin',
  ).length
  const regularUsers = countQuery.data?.count ?? '-'
  const newest = users.slice(-5).reverse()

  const stats = [
    { label: 'Total accounts', value: users.length, icon: Users, tone: 'text-indigo-400' },
    { label: 'Regular users', value: regularUsers, icon: UserCog, tone: 'text-sky-400' },
    { label: 'Admins', value: admins, icon: ShieldCheck, tone: 'text-rose-400' },
  ]

  return (
    <div>
      <PageHeader
        title="Admin overview"
        description="A quick look at the accounts on the platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="flex items-center gap-4">
              <span
                className={`flex size-11 items-center justify-center rounded-lg bg-slate-800 ${stat.tone}`}
              >
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-white">{stat.value}</p>
                <p className="text-sm text-slate-400">{stat.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="font-semibold text-white">Newest accounts</h2>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
        >
          Manage all users <ArrowRight className="size-4" />
        </Link>
      </div>

      {newest.length === 0 ? (
        <Card className="mt-4">
          <EmptyState
            icon={Users}
            title="No accounts yet"
            description="Users you create here will appear on this page."
          />
        </Card>
      ) : (
        <Card className="mt-4 p-0">
          <ul className="divide-y divide-slate-800/60">
            {newest.map((user) => (
              <li
                key={user.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-semibold text-indigo-300">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
                <Badge tone={ROLE_TONES[user.role as UserRole] ?? 'slate'}>
                  {user.role}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}