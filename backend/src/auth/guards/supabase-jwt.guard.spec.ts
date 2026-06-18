import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '../../common/errors/error-codes';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseJwtService } from '../supabase-jwt.service';
import { SupabaseJwtGuard } from './supabase-jwt.guard';

describe('SupabaseJwtGuard', () => {
  const jwtService = {
    authenticateBearerToken: jest.fn(),
    canVerifyTokens: jest.fn(),
  };

  const createGuard = (env: Record<string, string | undefined>) => {
    const config = {
      get: (key: string) => env[key],
    } as ConfigService;

    return new SupabaseJwtGuard(new Reflector(), config, jwtService as unknown as SupabaseJwtService);
  };

  const mockContext = (headers: Record<string, string>, isPublic = false): ExecutionContext => {
    const request = { headers, user: undefined as unknown };
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === IS_PUBLIC_KEY) {
        return isPublic;
      }
      return undefined;
    });

    const guard = createGuard({ SUPABASE_JWT_SECRET: 'test-secret' });
    (guard as unknown as { reflector: Reflector }).reflector = reflector;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jwtService.canVerifyTokens.mockReturnValue(true);
  });

  it('allows public routes without a token when auth is enforced', async () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'test-secret' });
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    (guard as unknown as { reflector: Reflector }).reflector = reflector;

    const context = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.authenticateBearerToken).not.toHaveBeenCalled();
  });

  it('allows protected routes without a token when auth is not enforced', async () => {
    const guard = createGuard({ NODE_ENV: 'development' });
    const context = mockContext({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.authenticateBearerToken).not.toHaveBeenCalled();
  });

  it('attaches request.user from Bearer token when auth is not enforced', async () => {
    const guard = createGuard({ NODE_ENV: 'development', AUTH_DISABLED: 'true' });
    const request = { headers: { authorization: 'Bearer valid-token' }, user: undefined };
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (guard as unknown as { reflector: Reflector }).reflector = reflector;

    const user = { id: 'user-1', roles: ['provider_user'] as const };
    jwtService.authenticateBearerToken.mockResolvedValue(user);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
    expect(jwtService.authenticateBearerToken).toHaveBeenCalledWith('valid-token');
  });

  it('rejects protected routes without Bearer token when auth is enforced', async () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'test-secret' });
    const context = mockContext({});

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
    });
  });

  it('attaches request.user from a valid Bearer token', async () => {
    const guard = createGuard({ SUPABASE_JWT_SECRET: 'test-secret' });
    const request = { headers: { authorization: 'Bearer valid-token' }, user: undefined };
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (guard as unknown as { reflector: Reflector }).reflector = reflector;

    const user = { id: 'user-1', roles: ['provider_user'] as const };
    jwtService.authenticateBearerToken.mockResolvedValue(user);

    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(user);
    expect(jwtService.authenticateBearerToken).toHaveBeenCalledWith('valid-token');
  });
});
