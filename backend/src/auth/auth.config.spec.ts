import { ConfigService } from '@nestjs/config';
import { isAuthEnforced, resolveJwksUrl } from './auth.config';

function configFrom(env: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => env[key],
  } as ConfigService;
}

describe('auth.config', () => {
  describe('resolveJwksUrl', () => {
    it('derives JWKS URL from SUPABASE_URL', () => {
      const config = configFrom({ SUPABASE_URL: 'https://abc.supabase.co/' });

      expect(resolveJwksUrl(config)).toBe(
        'https://abc.supabase.co/auth/v1/.well-known/jwks.json',
      );
    });

    it('prefers explicit SUPABASE_JWKS_URL', () => {
      const config = configFrom({
        SUPABASE_URL: 'https://abc.supabase.co',
        SUPABASE_JWKS_URL: 'https://custom.example/jwks.json',
      });

      expect(resolveJwksUrl(config)).toBe('https://custom.example/jwks.json');
    });
  });

  describe('isAuthEnforced', () => {
    it('is enabled with SUPABASE_URL only (JWKS path)', () => {
      const config = configFrom({
        SUPABASE_URL: 'https://abc.supabase.co',
        NODE_ENV: 'development',
      });

      expect(isAuthEnforced(config)).toBe(true);
    });

    it('is disabled when AUTH_DISABLED=true even with SUPABASE_URL', () => {
      const config = configFrom({
        SUPABASE_URL: 'https://abc.supabase.co',
        AUTH_DISABLED: 'true',
      });

      expect(isAuthEnforced(config)).toBe(false);
    });
  });
});
