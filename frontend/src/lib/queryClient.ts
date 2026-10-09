import { QueryClient } from '@tanstack/react-query'

/**
 * Shared React Query client. `retry: false` because most GETs here are
 * authenticated — retrying a 401 just delays the redirect to sign-in.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
})
