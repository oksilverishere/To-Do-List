import { useNavigate } from 'react-router-dom'
import { signOut } from '../api/auth'
import { useAuth } from './useAuth'
import { useNotify } from './useToast'

/** Shared sign-out: clears the session locally even if the request fails. */
export function useSignOut() {
  const { setUser } = useAuth()
  const toast = useNotify()
  const navigate = useNavigate()

  return async () => {
    try {
      await signOut()
    } catch {
      // The cookie may already be gone — the local logout still must happen.
    }
    setUser(null)
    toast.success('Signed out. See you soon!')
    navigate('/sign-in', { replace: true })
  }
}
