/**
 * Fix provider auth rows created before auth.identities were wired on onboard/accept-invite.
 * Run: npm run db:repair-invite-auth
 *
 * Optional: REPAIR_INVITE_EMAIL=user@example.com REPAIR_INVITE_PASSWORD='NewPass123!' to reset password.
 */
import { Pool } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { setSupabaseUserPassword } from '../src/repository/persistence/utils/supabase-admin-auth.util';
import { loadDotEnv } from './seed/load-dotenv';

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const repairEmail = process.env.REPAIR_INVITE_EMAIL?.trim().toLowerCase();
  const repairPassword = process.env.REPAIR_INVITE_PASSWORD?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const pool = new Pool({
    connectionString,
    ...(getPgSslConfig(connectionString) ? { ssl: getPgSslConfig(connectionString) } : {}),
  });

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{
      user_id: string;
      email: string;
    }>(`
      SELECT p.user_id, p.email
      FROM public.profiles p
      INNER JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'provider_user'
      WHERE ($1::text IS NULL OR lower(p.email) = $1)
      ORDER BY p.created_at DESC NULLS LAST
    `, [repairEmail ?? null]);

    if (!rows.length) {
      console.log('No provider profiles found to repair.');
      return;
    }

    for (const row of rows) {
      const { user_id: userId, email } = row;
      const identityData = JSON.stringify({
        sub: userId,
        email,
        email_verified: false,
        phone_verified: false,
      });

      if (repairPassword) {
        if (supabaseUrl && serviceRoleKey) {
          await setSupabaseUserPassword(supabaseUrl, serviceRoleKey, userId, repairPassword);
        } else {
          await client.query(
            `UPDATE auth.users
             SET
               confirmation_token = COALESCE(confirmation_token, ''),
               recovery_token = COALESCE(recovery_token, ''),
               email_change_token_new = COALESCE(email_change_token_new, ''),
               email_change = COALESCE(email_change, ''),
               email_confirmed_at = COALESCE(email_confirmed_at, now()),
               encrypted_password = crypt($2, gen_salt('bf')),
               updated_at = now()
             WHERE id = $1::uuid`,
            [userId, repairPassword],
          );
        }
      } else {
        await client.query(
          `UPDATE auth.users
           SET
             confirmation_token = COALESCE(confirmation_token, ''),
             recovery_token = COALESCE(recovery_token, ''),
             email_change_token_new = COALESCE(email_change_token_new, ''),
             email_change = COALESCE(email_change, ''),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now()
           WHERE id = $1::uuid`,
          [userId],
        );
      }

      await client.query(
        `INSERT INTO auth.identities (
          id, user_id, identity_data, provider, provider_id,
          last_sign_in_at, created_at, updated_at
        ) VALUES (
          $1::uuid, $1::uuid, $2::jsonb, 'email', $1::text,
          now(), now(), now()
        )
        ON CONFLICT (provider_id, provider) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          identity_data = EXCLUDED.identity_data,
          updated_at = now()`,
        [userId, identityData],
      );

      console.log(`Repaired auth for ${email} (${userId})${repairPassword ? ' — password reset' : ''}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
