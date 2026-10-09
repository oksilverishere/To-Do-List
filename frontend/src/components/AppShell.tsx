import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react'
import { signOut } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { useNotify } from '../hooks/useToast'

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
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = user?.role === 'admin' || user?.role === 'superAdmin'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-indigo-600/15 text-indigo-300'
        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
    }`

  const renderNav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-1">
      {USER_NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={navLinkClass}
            onClick={onNavigate}
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        )
      })}
      {isAdmin && <div className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-600">Admin</div>}
      {isAdmin &&
        ADMIN_NAV.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={navLinkClass}
              onClick={onNavigate}
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          )
        })}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 p-4 md:flex">
        <Brand />
        <div className="mt-6 flex-1 overflow-y-auto">{renderNav()}</div>
        <UserFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur md:hidden">
        <Brand compact />
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-0 left-0 flex h-full w-72 flex-col border-r border-slate-800 bg-slate-900 p-4">
            <div className="mb-6 flex items-center justify-between">
              <Brand compact />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNav(() => setMobileOpen(false))}
            </div>
            <UserFooter />
          </div>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-5xl p-4 md:p-8">
          <Outlet />
        </div>
      </main>
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
          TaskFlow
        </span>
      )}
    </div>
  )
}

function UserFooter() {
  const { user, setUser } = useAuth()
  const toast = useNotify()
  const navigate = useNavigate()

  if (!user) return null

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {
      // The cookie may already be gone — the local logout still must happen.
    }
    setUser(null)
    toast.success('Signed out. See you soon!')
    navigate('/sign-in', { replace: true })
  }

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