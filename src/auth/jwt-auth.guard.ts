import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from './auth.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthUser, JwtPayload } from './auth.interfaces';

/** Express's `Request` does not know about the user the guard attaches. */
type RequestWithUser = Request & { user?: AuthUser };

/**
 * Verifies the access token and attaches the caller to `request.user`.
 *
 * Registered globally, so every route is protected unless it carries
 * `@Public()`. Fails closed: a missing token, a malformed token, a token signed
 * with the wrong secret and an expired token all produce the same 401, so the
 * response cannot be used to tell those cases apart.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException(NOT_ALLOWED_MESSAGE);
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      // Deliberately swallows the reason (expired / bad signature / garbage).
      throw new UnauthorizedException(NOT_ALLOWED_MESSAGE);
    }

    const user: AuthUser = { id: payload.sub, email: payload.email };
    request.user = user;

    return true;
  }

  private extractToken(request: Request): string | undefined {
    // Both optional-chained: `cookies` is absent when cookie-parser is not
    // registered, and `headers` is absent on some bare test doubles.
    const fromCookie = request.cookies?.[ACCESS_TOKEN_COOKIE];
    if (fromCookie) {
      return fromCookie;
    }

    const header = request.headers?.authorization;
    if (header?.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return undefined;
  }
}