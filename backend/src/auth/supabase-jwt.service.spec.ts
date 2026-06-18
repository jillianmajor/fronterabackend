import { webcrypto } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';

Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
});

jest.mock('./jose-loader', () => ({
  getJose: async () => jest.requireActual<typeof jose>('jose'),
}));

import { ErrorCode } from '../common/errors/error-codes';
import { AuthRepository } from './auth.repository';
import { SupabaseJwtService } from './supabase-jwt.service';

describe('SupabaseJwtService', () => {
  const secret = 'test-jwt-secret-at-least-32-chars!!';
  const userId = 'a0000000-0000-4000-8000-000000000003';

  const authRepository = {
    listRolesForUser: jest.fn(),
  };

  const createService = () => {
    const config = {
      get: (key: string) => {
        const values: Record<string, string> = {
          SUPABASE_JWT_SECRET: secret,
          SUPABASE_URL: 'https://example.supabase.co',
          NODE_ENV: 'test',
        };
        return values[key];
      },
    } as ConfigService;

    const service = new SupabaseJwtService(config, authRepository as unknown as AuthRepository);
    return service;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authRepository.listRolesForUser.mockResolvedValue(['provider_user']);
  });

  async function signToken(overrides: Partial<jose.JWTPayload> = {}): Promise<string> {
    const key = new TextEncoder().encode(secret);
    return new jose.SignJWT({
      role: 'authenticated',
      email: 'provider@example.com',
      ...overrides,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setAudience('authenticated')
      .setIssuer('https://example.supabase.co/auth/v1')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);
  }

  it('authenticates a valid HS256 Supabase token and loads roles', async () => {
    const service = createService();
    await service.onModuleInit();
    const token = await signToken();

    const user = await service.authenticateBearerToken(token);

    expect(user).toEqual({
      id: userId,
      email: 'provider@example.com',
      roles: ['provider_user'],
    });
    expect(authRepository.listRolesForUser).toHaveBeenCalledWith(userId);
  });

  it('rejects an invalid token', async () => {
    const service = createService();
    await service.onModuleInit();

    await expect(service.authenticateBearerToken('not-a-jwt')).rejects.toMatchObject({
      code: ErrorCode.UNAUTHORIZED,
    });
  });

  it('lazy-inits verification when auth is not enforced but a token is parsed', async () => {
    const config = {
      get: (key: string) => {
        const values: Record<string, string> = {
          SUPABASE_JWT_SECRET: secret,
          SUPABASE_URL: 'https://example.supabase.co',
          NODE_ENV: 'development',
          AUTH_DISABLED: 'true',
        };
        return values[key];
      },
    } as ConfigService;

    const service = new SupabaseJwtService(config, authRepository as unknown as AuthRepository);
    await service.onModuleInit();
    const token = await signToken();

    const user = await service.authenticateBearerToken(token);

    expect(user.id).toBe(userId);
    expect(service.canVerifyTokens()).toBe(true);
  });
});
