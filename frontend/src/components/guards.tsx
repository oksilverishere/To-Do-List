import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from './ui'

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Checking your session…" />
    </div>
  )
}

/** Keeps private pages private: no session → send to /sign-in. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/sign-in" state={{ from: location }} replace />

  return <Outlet />
}

/** The admin area is only reachable by admin / superAdmin accounts. */
export function RequireAdmin() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/sign-in" replace />

  const isAdmin = user.role === 'admin' || user.role === 'superAdmin'
  if (!isAdmin) return <Navigate to="/" replace />

  return <Outlet />
}

/** Auth pages redirect signed-in users away so they never see a login form. */
export function RequireAnonymous() {
  const { user, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (user) return <Navigate to="/" replace />

  return <Outlet />
}