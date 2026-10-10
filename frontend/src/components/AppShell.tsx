import { NavLink, Outlet } from 'react-router-dom'
import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useSignOut } from '../hooks/useSignOut'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const USER_NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/categories', label: 'Categories', icon: FolderKanban },
  { to: '/todos', label: 'All To-dos', icon: ListTodo },
  { to: '/profile', label: 'Profile', icon: UserCircle },
]

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Admin', icon: ShieldCheck, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
]

export function AppShell() {
  const { user } = useAuth()
  const handleSignOut = useSignOut()

  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-indigo-600/15 text-indigo-300'
        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
    }`

  const renderNav = () => (
    <nav className="flex flex-col gap-1">
      {USER_NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        )
      })}
      {isAdmin && (
        <div className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">
          Admin
        </div>
      )}
      {isAdmin &&
        ADMIN_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          )
        })}
    </nav>
  )

  const bottomNavItems = isAdmin ? [...USER_NAV, ...ADMIN_NAV] : USER_NAV

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 p-4 md:flex">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">{renderNav()}</div>
        <UserFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur md:hidden">
          <Brand compact />
          <div className="flex items-center gap-1">
            <NavLink
              to="/profile"
              className="rounded-full"
              aria-label="Your profile"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-indigo-600/20 text-sm font-semibold text-indigo-300">
                  {(user?.name.charAt(0) ?? '?').toUpperCase()}
                </span>
              )}
            </NavLink>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-5xl p-4 pb-24 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex justify-around">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition ${
                    isActive
                      ? 'text-indigo-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                <Icon className="size-5" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <CheckSquare className="size-5" />
      </span>
      {!compact && (
        <span className="text-lg font-semibold tracking-tight text-white">
          MyToDo
        </span>
      )}
    </div>
  )
}

function UserFooter() {
  const { user } = useAuth()
  const handleSignOut = useSignOut()

  if (!user) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
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
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-rose-400"
        title="Sign out"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}
