/**
 * Dev login accounts with real passwords + auth.identities for Supabase signInWithPassword.
 * Run after `npm run db:seed` (requires DATABASE_URL).
 *
 *   npm run db:seed:dev-logins
 */
import { Pool, type PoolClient } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { loadDotEnv } from './seed/load-dotenv';
import { SEED, SEED_EMAIL } from './seed/ids';

/** Dev-only credentials — do not use in production. */
export const DEV_LOGINS = {
  admin: {
    email: 'admin@fronterasearch.com',
    password: 'TestAdmin123!',
    userId: SEED.users.provider1,
    profileId: SEED.profiles.provider1,
    fullName: 'Admin Provider',
  },
  prnDemo: {
    email: 'prn.demo@fronterasearch.com',
    password: 'PrnDemo123!',
    userId: 'a0000000-0000-4000-8000-000000000014',
    profileId: 'e0000000-0000-4000-8000-000000000014',
    assignmentId: 'f0000000-0000-4000-8000-000000000014',
    providerWorkSiteId: 'f0000000-0000-4000-8000-000000000141',
    fullName: 'PRN Demo Provider',
  },
} as const;

async function ensureLoginUser(
  client: PoolClient,
  instanceId: string,
  id: string,
  email: string,
  password: string,
  fullName: string,
): Promise<void> {
  const userMeta = JSON.stringify({ full_name: fullName });

  await client.query(
    `INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      $1::uuid, $2::uuid, 'authenticated', 'authenticated', $3,
      crypt($4, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      $5::jsonb,
      '', '', '', ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      encrypted_password = crypt($4, gen_salt('bf')),
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      confirmation_token = '',
      recovery_token = '',
      email_change_token_new = '',
      email_change = '',
      updated_at = now()`,
    [instanceId, id, email, password, userMeta],
  );

  const identityData = JSON.stringify({
    sub: id,
    email,
    email_verified: false,
    phone_verified: false,
  });

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
    [id, identityData],
  );
}

async function seedAdminAccount(client: PoolClient, instanceId: string): Promise<void> {
  const { email, password, userId, profileId, fullName } = DEV_LOGINS.admin;

  await ensureLoginUser(client, instanceId, userId, email, password, fullName);

  await client.query(
    `INSERT INTO public.user_roles (user_id, role)
     VALUES ($1::uuid, 'admin'), ($1::uuid, 'provider_user')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId],
  );

  await client.query(
    `UPDATE public.profiles
     SET full_name = $2,
         email = $3,
         portal_type = 'provider',
         updated_at = now()
     WHERE user_id = $1::uuid`,
    [userId, fullName, email],
  );

  // Ensure profile exists if seed was skipped
  await client.query(
    `INSERT INTO public.profiles (id, user_id, email, full_name, portal_type, schedule_type, employment_type, company)
     VALUES ($2::uuid, $1::uuid, $3, $4, 'provider', 'set', 'W2', 'Frontera')
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       full_name = EXCLUDED.full_name,
       portal_type = EXCLUDED.portal_type,
       updated_at = now()`,
    [userId, profileId, email, fullName],
  );
}

async function seedPrnDemoAccount(client: PoolClient, instanceId: string): Promise<void> {
  const {
    email,
    password,
    userId,
    profileId,
    assignmentId,
    providerWorkSiteId,
    fullName,
  } = DEV_LOGINS.prnDemo;
  const { org, workSites, users } = SEED;
  const amyUserId = users.recruiterAmy;

  await ensureLoginUser(client, instanceId, userId, email, password, fullName);

  await client.query(
    `INSERT INTO public.profiles (
      id, user_id, email, full_name, phone, specialty, state, region,
      employment_type, schedule_type, company,
      recruiter_id, recruiter_name, recruiter_email,
      primary_facility_id, portal_type
    ) VALUES (
      $1::uuid, $2::uuid, $3, $4, '(555) 555-0190', 'Hospitalist', 'TX', 'South',
      'W2', 'prn', 'Frontera',
      $5::uuid, 'Amy Guy', $6,
      $7::uuid, 'provider'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      schedule_type = 'prn',
      employment_type = EXCLUDED.employment_type,
      portal_type = EXCLUDED.portal_type,
      recruiter_id = EXCLUDED.recruiter_id,
      recruiter_name = EXCLUDED.recruiter_name,
      recruiter_email = EXCLUDED.recruiter_email,
      primary_facility_id = EXCLUDED.primary_facility_id,
      updated_at = now()`,
    [
      profileId,
      userId,
      email,
      fullName,
      amyUserId,
      SEED_EMAIL.recruiterAmy,
      workSites.dallas,
    ],
  );

  await client.query(
    `INSERT INTO public.user_roles (user_id, role)
     VALUES ($1::uuid, 'provider_user')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId],
  );

  await client.query(
    `INSERT INTO public.assignments (
      id, provider_id, recruiter_id, client_org_id, specialty, status
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'Hospitalist', 'active')
    ON CONFLICT (id) DO UPDATE SET status = 'active', updated_at = now()`,
    [assignmentId, userId, amyUserId, org.optum],
  );

  await client.query(
    `INSERT INTO public.provider_work_sites (id, provider_id, work_site_id, is_primary, weekly_schedule)
     VALUES ($1::uuid, $2::uuid, $3::uuid, true, '[]'::jsonb)
     ON CONFLICT (provider_id, work_site_id) DO UPDATE SET
       is_primary = EXCLUDED.is_primary`,
    [providerWorkSiteId, userId, workSites.dallas],
  );
}

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (set in environment or .env)');
  }

  const ssl = getPgSslConfig(connectionString);
  const pool = new Pool({
    connectionString,
    ...(ssl ? { ssl } : {}),
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const inst = await client.query<{ id: string }>('SELECT id FROM auth.instances LIMIT 1');
    const instanceId = inst.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';

    await seedAdminAccount(client, instanceId);
    await seedPrnDemoAccount(client, instanceId);

    await client.query('COMMIT');

    console.log('Dev logins ready:\n');
    console.log('  Corporate + Provider (admin portal switcher):');
    console.log(`    ${DEV_LOGINS.admin.email} / ${DEV_LOGINS.admin.password}`);
    console.log('    Role: admin (+ provider_user for provider API profile linkage)\n');
    console.log('  PRN Provider portal:');
    console.log(`    ${DEV_LOGINS.prnDemo.email} / ${DEV_LOGINS.prnDemo.password}`);
    console.log('    Role: provider_user, schedule_type: prn\n');
    console.log('Login URLs:');
    console.log('  /login?portal=corporate');
    console.log('  /login?portal=provider');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
