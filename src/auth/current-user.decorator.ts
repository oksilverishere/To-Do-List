import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthUser } from './auth.interfaces';

/**
 * Injects the authenticated user that `JwtAuthGuard` put on the request.
 *
 * `@CurrentUser()` gives the whole `AuthUser`; `@CurrentUser('id')` gives just
 * the uuid, which is usually what a service wants.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();

    return field ? request.user?.[field] : request.user;
  },
);