import { sql } from 'drizzle-orm';
import type { IDbClient } from '../interface';

type AuthSqlExecutor = Pick<IDbClient['db'], 'execute'>;

/** Email provider identity required for Supabase `signInWithPassword`. */
export async function ensureAuthIdentity(
  executor: AuthSqlExecutor,
  userId: string,
  email: string,
): Promise<void> {
  const identityData = JSON.stringify({
    sub: userId,
    email,
    email_verified: false,
    phone_verified: false,
  });

  await executor.execute(sql`
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      ${userId}::uuid, ${userId}::uuid, ${identityData}::jsonb, 'email', ${userId}::text,
      now(), now(), now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      identity_data = EXCLUDED.identity_data,
      updated_at = now()
  `);
}

/** GoTrue rejects NULL token columns on some hosted Supabase versions. */
export async function normalizeAuthUserTokenFields(
  executor: AuthSqlExecutor,
  userId: string,
): Promise<void> {
  await executor.execute(sql`
    UPDATE auth.users
    SET
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      updated_at = now()
    WHERE id = ${userId}::uuid
  `);
}
