import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** OpenAPI server entries — no hardcoded localhost (Swagger uses current host or env). */
function openApiServers(): Array<{ url: string; description: string }> {
  const deployed = process.env.FRONTERA_API_PUBLIC_URL?.trim().replace(/\/$/, '');
  if (deployed) {
    return [{ url: deployed, description: 'Deployed API (FRONTERA_API_PUBLIC_URL)' }];
  }
  return [{ url: '/', description: 'Current host (same origin as this Swagger page)' }];
}

/**
 * Builds the OpenAPI 3 document from Nest controller/DTO decorators.
 * Used by runtime Swagger UI (`/api`) and `npm run openapi:generate`.
 */
export function buildOpenApiDocument(app: INestApplication) {
  const builder = new DocumentBuilder()
    .setTitle('Frontera Scheduling API')
    .setDescription(
      [
        'NestJS API for Frontera provider scheduling — admin onboarding, PRN availability,',
        'schedule change approvals, master availability, and provider portal endpoints.',
        '',
        '**Swagger Try it out**',
        '- Requests use `FRONTERA_API_PUBLIC_URL` when set, otherwise the same host that served `/api`.',
        '',
        '**Lovable integration**',
        '- Import `openapi/frontera-api.yaml` after `npm run openapi:generate` (set `FRONTERA_API_PUBLIC_URL` in `.env` first).',
        '- All routes require `Authorization: Bearer <supabase_access_token>` except `GET /health` and `accept-invite`.',
        '- HTML accept-invite (`GET/POST /accept-invite`) is excluded from this spec.',
        '',
        '**Errors** — JSON body: `{ statusCode, code, message }` (see `ErrorCode` in repo).',
      ].join('\n'),
    )
    .setVersion('0.1.0');

  for (const server of openApiServers()) {
    builder.addServer(server.url, server.description);
  }

  const config = builder
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Supabase access token for admin routes',
    })
    .addTag('Main', 'Health check')
    .addTag('Admin — Onboarding', 'Onboard new provider, form options, work sites')
    .addTag('Admin — Providers', 'Active provider list and filters')
    .addTag('Admin — Master Availability', 'Corporate availability calendar and export')
    .addTag('Admin — Schedule Change Approvals', 'Pending time-off review queue')
    .addTag('Admin — PRN Availability', 'PRN monthly submission review queue')
    .addTag('Holidays', 'Optum clinic closure dates (portal roles)')
    .addTag('Provider', 'Provider portal — PRN calendar, PACR upload (path: providerId)')
    .build();

  return SwaggerModule.createDocument(app, config);
}
