import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppErrors } from '../../common/errors/app-errors';
import { TOKENS } from '../../config/tokens';
import { isAuthEnforced } from '../auth.config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseJwtService } from '../supabase-jwt.service';

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @Inject(TOKENS.SupabaseJwtService)
    private readonly jwtService: SupabaseJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    const enforced = isAuthEnforced(this.config);

    if (!enforced) {
      if (token && this.jwtService.canVerifyTokens()) {
        try {
          request.user = await this.jwtService.authenticateBearerToken(token);
        } catch {
          // Auth not enforced — allow the request but leave request.user unset.
        }
      }
      return true;
    }

    if (!token) {
      throw AppErrors.unauthorized('Missing Bearer token');
    }

    request.user = await this.jwtService.authenticateBearerToken(token);
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private extractBearerToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : undefined;
  }
}
