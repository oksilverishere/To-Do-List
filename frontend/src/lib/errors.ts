import axios from 'axios'

interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  error?: string
}

/**
 * Turns whatever NestJS threw into one readable line.
 * Nest puts the message in `response.data.message`, and validation errors
 * arrive as an array of per-field strings.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Cannot reach the server. Is the backend running?'
    }

    const data = error.response.data as ApiErrorBody | undefined

    if (data?.message) {
      return Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
    }

    return error.response.statusText || 'Request failed'
  }

  return error instanceof Error ? error.message : 'Something went wrong'
}

/** True when the failure is a 401 — the session is gone or never existed. */
export function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}
