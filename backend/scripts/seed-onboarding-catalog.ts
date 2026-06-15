/**
 * Seeds onboarding reference tables + PDF facility catalog.
 * Run after migrations: `npm run db:seed:catalog`
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import {
  ONBOARDING_CLINIC_DAYS,
  ONBOARDING_COMPANIES,
  ONBOARDING_EMPLOYMENT_TYPES,
  ONBOARDING_LIAISONS,
  ONBOARDING_RECRUITERS,
  ONBOARDING_REGIONS,
  ONBOARDING_SCHEDULE_TYPES,
  ONBOARDING_SPECIALTIES,
  ONBOARDING_WEEKLY_PRESETS,
} from './seed/onboarding-catalog-data';
import { loadDotEnv } from './seed/load-dotenv';
import { SEED, SEED_EMAIL } from './seed/ids';

type WorkSiteJson = {
  facilityName: string;
  city: string;
  state: string;
  region: string;
  clientName: string;
};

async function ensureAuthUser(
  client: import('pg').PoolClient,
  instanceId: string,
  id: string,
  email: string,
): Promise<void> {
  await client.query(
    `INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) VALUES (
      $1::uuid, $2::uuid, 'authenticated', 'authenticated', $3,
      crypt('seed-not-for-login', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
    [instanceId, id, email],
  );
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const ssl = getPgSslConfig(connectionString);
  const pool = new Pool({ connectionString, ...(ssl ? { ssl } : {}) });
  const client = await pool.connect();

  const workSitesPath = join(__dirname, 'seed', 'onboarding-work-sites.json');
  const facilities = JSON.parse(readFileSync(workSitesPath, 'utf8')) as WorkSiteJson[];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < ONBOARDING_SPECIALTIES.length; i++) {
      const name = ONBOARDING_SPECIALTIES[i];
      await client.query(
        `INSERT INTO public.onboarding_specialties (name, sort_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now()`,
        [name, i],
      );
    }

    for (let i = 0; i < ONBOARDING_COMPANIES.length; i++) {
      await client.query(
        `INSERT INTO public.onboarding_companies (name, sort_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now()`,
        [ONBOARDING_COMPANIES[i], i],
      );
    }

    for (let i = 0; i < ONBOARDING_REGIONS.length; i++) {
      await client.query(
        `INSERT INTO public.onboarding_regions (name, sort_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now()`,
        [ONBOARDING_REGIONS[i], i],
      );
    }

    for (let i = 0; i < ONBOARDING_EMPLOYMENT_TYPES.length; i++) {
      const { code, label } = ONBOARDING_EMPLOYMENT_TYPES[i];
      await client.query(
        `INSERT INTO public.onboarding_employment_types (code, label, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now()`,
        [code, label, i],
      );
    }

    for (let i = 0; i < ONBOARDING_SCHEDULE_TYPES.length; i++) {
      const { code, label } = ONBOARDING_SCHEDULE_TYPES[i];
      await client.query(
        `INSERT INTO public.onboarding_schedule_types (code, label, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now()`,
        [code, label, i],
      );
    }

    for (let i = 0; i < ONBOARDING_CLINIC_DAYS.length; i++) {
      await client.query(
        `INSERT INTO public.onboarding_clinic_days (name, sort_order)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now()`,
        [ONBOARDING_CLINIC_DAYS[i], i],
      );
    }

    for (let i = 0; i < ONBOARDING_WEEKLY_PRESETS.length; i++) {
      const p = ONBOARDING_WEEKLY_PRESETS[i];
      await client.query(
        `INSERT INTO public.onboarding_weekly_schedule_presets (slug, label, shifts, sort_order)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (slug) DO UPDATE SET
           label = EXCLUDED.label,
           shifts = EXCLUDED.shifts,
           sort_order = EXCLUDED.sort_order,
           is_active = true,
           updated_at = now()`,
        [p.slug, p.label, JSON.stringify(p.shifts), i],
      );
    }

    const inst = await client.query<{ id: string }>('SELECT id FROM auth.instances LIMIT 1');
    const instanceId = inst.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';

    const staffIds = SEED.onboardingStaff as Record<string, string>;
    const staffEmails = SEED_EMAIL.onboardingStaff as Record<string, string>;
    const staffProfiles = SEED.profiles.onboardingStaff as Record<string, string>;

    const allStaff = [...ONBOARDING_RECRUITERS, ...ONBOARDING_LIAISONS];
    const uniqueStaff = [...new Set(allStaff)];

    for (const fullName of uniqueStaff) {
      const key = slugifyName(fullName);
      const userId = staffIds[key];
      const profileId = staffProfiles[key];
      const email = staffEmails[key];
      if (!userId || !profileId || !email) {
        console.warn(`Skipping staff without seed UUID: ${fullName}`);
        continue;
      }
      await ensureAuthUser(client, instanceId, userId, email);
      await client.query(
        `INSERT INTO public.profiles (id, user_id, email, full_name, schedule_type)
         VALUES ($1::uuid, $2::uuid, $3, $4, 'set')
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, updated_at = now()`,
        [profileId, userId, email, fullName],
      );
      await client.query(
        `INSERT INTO public.user_roles (user_id, role)
         VALUES ($1::uuid, 'internal_staff')
         ON CONFLICT (user_id, role) DO NOTHING`,
        [userId],
      );
    }

    let workSiteCount = 0;
    for (const site of facilities) {
      const result = await client.query(
        `INSERT INTO public.work_sites (facility_name, client_name, city, state, region)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (facility_name, region) DO UPDATE SET
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           client_name = EXCLUDED.client_name,
           updated_at = now()`,
        [site.facilityName, site.clientName, site.city, site.state, site.region],
      );
      workSiteCount += result.rowCount ?? 0;
    }

    await client.query('COMMIT');
    console.log(
      `Onboarding catalog seed completed: ${ONBOARDING_SPECIALTIES.length} specialties, ${facilities.length} work sites (${workSiteCount} rows touched).`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
