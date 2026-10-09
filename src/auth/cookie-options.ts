import type { CookieOptions } from 'express';

/**
 * Options for the `access_token` cookie.
 *
 * Local development serves the frontend and the API on the same host
 * (`localhost`), so a `lax` cookie is enough. Once `FRONTEND_ORIGIN` is set,
 * the frontend lives on another origin (e.g. a second Render subdomain), so
 * the cookie must be `SameSite=None; Secure` to travel on cross-site fetches.
 */
export function accessTokenCookieOptions(): CookieOptions {
  const deployed = Boolean(process.env.FRONTEND_ORIGIN);

  return {
    httpOnly: true,
    sameSite: deployed ? 'none' : 'lax',
    secure: deployed || process.env.NODE_ENV === 'production',
  };
}