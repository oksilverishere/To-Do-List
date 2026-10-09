/** Claims carried by the access token issued on sign-in. */
export interface JwtPayload {
  /** The user's uuid. */
  sub: string;
  email: string;
}

/** What the guard attaches to `request.user` once the token verifies. */
export interface AuthUser {
  id: string;
  email: string;
}