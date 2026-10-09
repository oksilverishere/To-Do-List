import { createContext } from 'react'
import type { Me } from '../types/api'

export interface AuthContextValue {
  /** The signed-in user, or null when nobody is logged in. */
  user: Me | null
  /** True while the initial /user/me check is running. */
  loading: boolean
  /** Re-fetch /user/me (used after sign-in and after a profile change). */
  refresh: () => Promise<void>
  /** Replace the stored user directly. */
  setUser: (user: Me | null) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)