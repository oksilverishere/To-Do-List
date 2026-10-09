/**
 * The cookie the access token is stored in. Owned by the auth module rather
 * than by `UserService`, because it is an auth concern — `UserService` only
 * mints the token, the guard only reads the cookie.
 */
export const ACCESS_TOKEN_COOKIE = 'access_token';

/** Returned by the guard when the caller is not allowed through. */
export const NOT_ALLOWED_MESSAGE = 'you are not allowed to do this action';