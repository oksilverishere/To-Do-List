import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * `JwtModule` is registered globally in `app.module.ts`, so `JwtService` can
 * be injected here without importing it.
 */
@Module({
  providers: [
    // Registered as a plain provider too, not just via useClass, so it can be
    // exported and unit tested.
    JwtAuthGuard,
    {
      // Global rather than per-controller, so a route added later is protected
      // by default instead of silently being public.
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  // Only the guard is exported. `Public` and `CurrentUser` are decorators —
  // plain functions imported directly by controllers, not injectable providers,
  // so putting them in `exports` makes Nest refuse to boot.
  exports: [JwtAuthGuard],
})
export class AuthModule {}