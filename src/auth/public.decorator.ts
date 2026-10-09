import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opts a route out of the globally registered `JwtAuthGuard`.
 *
 * The guard is deny-by-default, so a new route is protected unless it is
 * explicitly marked public. Only sign-up and sign-in need this.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);