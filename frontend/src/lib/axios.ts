import axios from 'axios'

/**
 * One shared Axios instance for every call.
 *
 * `withCredentials` is what makes the browser send/receive the httpOnly
 * `access_token` cookie the backend sets on sign-in.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  withCredentials: true,
})
