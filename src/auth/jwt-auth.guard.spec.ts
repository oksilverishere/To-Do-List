import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ACCESS_TOKEN_COOKIE, NOT_ALLOWED_MESSAGE } from './auth.constants';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const TEST_SECRET = 'test-secret-not-used-for-anything-real';

  let reflector: { getAllAndOverride: jest.Mock };

  function contextFor(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: reflector },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: TEST_SECRET,
            signOptions: { expiresIn: '1h' },
          }),
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  const sign = (payload: Record<string, unknown>) =>
    new JwtService({ secret: TEST_SECRET }).sign(payload);

  it('rejects a request with no token', async () => {
    await expect(guard.canActivate(contextFor({ cookies: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uses the exact "not allowed" message', async () => {
    await expect(
      guard.canActivate(contextFor({ cookies: {} })),
    ).rejects.toThrow(NOT_ALLOWED_MESSAGE);
  });

  it('accepts a valid token from the cookie and attaches the user', async () => {
    const token = await sign({ sub: 'user-123', email: 'a@b.com' });

    const request = { cookies: { [ACCESS_TOKEN_COOKIE]: token } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user', {
      id: 'user-123',
      email: 'a@b.com',
    });
  });

  it('also accepts an Authorization: Bearer header', async () => {
    const token = await sign({ sub: 'user-456', email: 'c@d.com' });

    const request = {
      cookies: {},
      headers: { authorization: `Bearer ${token}` },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request).toHaveProperty('user', {
      id: 'user-456',
      email: 'c@d.com',
    });
  });

  it('prefers the cookie over the header', async () => {
    const cookieToken = await sign({ sub: 'from-cookie', email: 'a@b.com' });

    const request = {
      cookies: { [ACCESS_TOKEN_COOKIE]: cookieToken },
      headers: { authorization: 'Bearer garbage' },
    };

    await guard.canActivate(contextFor(request));

    expect(request).toHaveProperty('user', { id: 'from-cookie', email: 'a@b.com' });
  });

  it('rejects a token signed with the wrong secret', async () => {
    const forged = new JwtService({ secret: 'attacker-secret' }).sign({
      sub: 'user-123',
    });

    await expect(
      guard.canActivate(contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: forged } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const expired = await new JwtService({
      secret: TEST_SECRET,
      signOptions: { expiresIn: '-1s' },
    }).sign({ sub: 'user-123' });

    await expect(
      guard.canActivate(contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: expired } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a garbage token', async () => {
    await expect(
      guard.canActivate(
        contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: 'not-a-jwt' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('gives the same message for every kind of failure', async () => {
    const messages = await Promise.all([
      guard.canActivate(contextFor({ cookies: {} })).catch((e) => e.message),
      guard
        .canActivate(contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: 'junk' } }))
        .catch((e) => e.message),
      guard
        .canActivate(
          contextFor({
            cookies: {
              [ACCESS_TOKEN_COOKIE]: new JwtService({ secret: 'nope' }).sign({
                sub: 'x',
              }),
            },
          }),
        )
        .catch((e) => e.message),
    ]);

    expect(new Set(messages).size).toBe(1);
  });

  it('lets a @Public() route through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextFor({ cookies: {} }))).resolves.toBe(
      true,
    );
  });

  it('does not verify anything for a @Public() route', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await guard.canActivate(
      contextFor({ cookies: { [ACCESS_TOKEN_COOKIE]: 'total-garbage' } }),
    );

    expect(reflector.getAllAndOverride).toHaveBeenCalled();
  });
});