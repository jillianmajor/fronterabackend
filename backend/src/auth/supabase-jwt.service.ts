import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JWTVerifyGetKey, JWTVerifyOptions } from 'jose';
import { AppErrors } from '../common/errors/app-errors';
import { TOKENS } from '../config/tokens';
import { isAuthEnforced, resolveJwksUrl } from './auth.config';
import { AuthRepository } from './auth.repository';
import type { AuthenticatedUser } from './auth.types';
import { getJose, type JoseModule } from './jose-loader';

type JwtClaims = {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
};

@Injectable()
export class SupabaseJwtService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseJwtService.name);
  private jose!: JoseModule;
  private hs256Secret?: Uint8Array;
  private jwks?: JWTVerifyGetKey;

  constructor(
    private readonly config: ConfigService,
    @Inject(TOKENS.AuthRepository)
    private readonly authRepository: AuthRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!isAuthEnforced(this.config)) {
      if (this.hasVerificationConfig()) {
        this.logger.log(
          'Auth enforcement disabled — Bearer tokens will be parsed when sent (routes stay open without a token)',
        );
      } else {
        this.logger.log('Auth enforcement disabled — routes are open without JWT');
      }
      return;
    }

    await this.ensureVerificationReady();
  }

  /** Whether JWT verification env is configured (used for optional parsing when auth is not enforced). */
  canVerifyTokens(): boolean {
    return this.hasVerificationConfig();
  }

  async authenticateBearerToken(token: string): Promise<AuthenticatedUser> {
    await this.ensureVerificationReady();

    const claims = await this.verifyToken(token);
    const userId = claims.sub;
    if (!userId) {
      throw AppErrors.unauthorized('Token is missing subject');
    }

    const roles = await this.authRepository.listRolesForUser(userId);

    return {
      id: userId,
      email: typeof claims.email === 'string' ? claims.email : undefined,
      roles,
    };
  }

  private async verifyToken(token: string): Promise<JwtClaims> {
    const jose = this.jose ?? (await getJose());
    const verifyOptions = this.buildVerifyOptions();

    if (this.hs256Secret) {
      try {
        const { payload } = await jose.jwtVerify(token, this.hs256Secret, verifyOptions);
        return payload as JwtClaims;
      } catch (err) {
        if (!this.jwks) {
          throw AppErrors.unauthorized(this.jwtErrorMessage(jose, err));
        }
      }
    }

    if (!this.jwks) {
      throw AppErrors.unauthorized('JWT verification is not configured');
    }

    try {
      const { payload } = await jose.jwtVerify(token, this.jwks, verifyOptions);
      return payload as JwtClaims;
    } catch (err) {
      throw AppErrors.unauthorized(this.jwtErrorMessage(jose, err));
    }
  }

  private buildVerifyOptions(): JWTVerifyOptions {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '');
    const options: JWTVerifyOptions = {
      audience: 'authenticated',
    };

    if (supabaseUrl) {
      options.issuer = `${supabaseUrl}/auth/v1`;
    }

    return options;
  }

  private jwtErrorMessage(jose: JoseModule, err: unknown): string {
    if (err instanceof jose.errors.JWTExpired) {
      return 'Token expired';
    }
    if (err instanceof jose.errors.JWTClaimValidationFailed) {
      return 'Invalid token claims';
    }
    return 'Invalid token';
  }

  private hasVerificationConfig(): boolean {
    const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
    return !!(secret || resolveJwksUrl(this.config));
  }

  private async ensureVerificationReady(): Promise<void> {
    if (this.jose && (this.hs256Secret || this.jwks)) {
      return;
    }

    if (!this.hasVerificationConfig()) {
      throw new Error(
        'Auth is enforced but JWT verification is not configured — set SUPABASE_URL (JWKS) or SUPABASE_JWKS_URL',
      );
    }

    this.jose = await getJose();

    const secret = this.config.get<string>('SUPABASE_JWT_SECRET')?.trim();
    if (secret) {
      this.hs256Secret = new TextEncoder().encode(secret);
    }

    const jwksUrl = resolveJwksUrl(this.config);
    if (jwksUrl) {
      this.jwks = this.jose.createRemoteJWKSet(new URL(jwksUrl));
      this.logger.log(`JWT verification via JWKS (${jwksUrl})`);
    } else if (this.hs256Secret) {
      this.logger.log('JWT verification via SUPABASE_JWT_SECRET (HS256)');
    }

    if (!this.hs256Secret && !this.jwks) {
      throw new Error(
        'Auth is enforced but JWT verification is not configured — set SUPABASE_URL (JWKS) or SUPABASE_JWKS_URL',
      );
    }
  }
}
