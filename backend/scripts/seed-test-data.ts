/**
 * Seeds deterministic Frontera test data (Supabase auth + public schema).
 * Run: `npm run db:seed` (requires DATABASE_URL in `.env`).
 *
 * Creates: Optum org, work sites, recruiters/liaison staff, 10+ active providers, assignments,
 * time-off rows for review queue + master calendar, PRN + SET monthly submissions (target month +2).
 *
 * Run full local stack via `npm run db:seed:all` (catalog + this script). Docker migrate uses seed:all.
 *
 * If auth.users insert fails (connection role), run `scripts/seed-test-data.sql` in Supabase SQL Editor.
 */

import { Pool, type PoolClient } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { loadDotEnv } from './seed/load-dotenv';
import { seedExtraActiveProvidersData } from './seed/extra-active-providers';
import { seedProviderPrnAvailabilityData } from './seed/provider-prn-availability';
import { seedProviderSetTimeOffData } from './seed/provider-set-time-off';
import { seedHolidays } from './seed/seed-holidays';
import { SEED, SEED_EMAIL, SEED_WEEKLY_SCHEDULE } from './seed/ids';

async function ensureAuthUser(
  client: PoolClient,
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
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = now()`,
    [instanceId, id, email],
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
  const { users, profiles, org, workSites, assignments, providerWorkSites, timeOff, optumPoc } =
    SEED;
  const recruiterUserId = users.recruiter;

  try {
    await client.query('BEGIN');

    await seedHolidays(client);

    const inst = await client.query<{ id: string }>('SELECT id FROM auth.instances LIMIT 1');
    const instanceId = inst.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';

    await ensureAuthUser(client, instanceId, users.recruiter, SEED_EMAIL.recruiter);
    await ensureAuthUser(client, instanceId, users.recruiterAmy, SEED_EMAIL.recruiterAmy);
    await ensureAuthUser(client, instanceId, users.liaisonAnthony, SEED_EMAIL.liaisonAnthony);
    await ensureAuthUser(client, instanceId, users.provider1, SEED_EMAIL.provider1);
    await ensureAuthUser(client, instanceId, users.provider2, SEED_EMAIL.provider2);
    await ensureAuthUser(client, instanceId, users.provider3, SEED_EMAIL.provider3);

    await client.query(
      `INSERT INTO public.organizations (id, name, type, domain)
       VALUES ($1::uuid, 'Optum', 'client', 'optum.seed.local')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [org.optum],
    );

    await client.query(
      `INSERT INTO public.work_sites (id, facility_name, client_name, city, state, region)
       VALUES
         ($1::uuid, 'Dallas Medical Center', 'Optum', 'Dallas', 'TX', 'South'),
         ($2::uuid, 'Houston Clinic', 'Optum', 'Houston', 'TX', 'South'),
         ($3::uuid, 'Phoenix Urgent Care', 'Optum', 'Phoenix', 'AZ', 'West'),
         ($4::uuid, 'ACE/IMO - Dallas', 'Optum', 'Dallas', 'TX', 'Region 1')
       ON CONFLICT (id) DO UPDATE SET
         facility_name = EXCLUDED.facility_name,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         region = EXCLUDED.region,
         updated_at = now()`,
      [workSites.dallas, workSites.houston, workSites.phoenix, workSites.aceImoDallas],
    );

    const amyUserId = users.recruiterAmy;
    const anthonyUserId = users.liaisonAnthony;
    const weeklyScheduleJson = JSON.stringify(SEED_WEEKLY_SCHEDULE);

    await client.query(
      `INSERT INTO public.profiles (
        id, user_id, email, full_name, phone, specialty, state, region,
        employment_type, schedule_type, work_schedule,
        recruiter_id, recruiter_name, recruiter_email,
        liaison_id, liaison_name, liaison_email,
        primary_facility_id
      ) VALUES
        ($1::uuid, $2::uuid, $3, 'Sam Recruiter', NULL, NULL, NULL, NULL, NULL, 'set', NULL,
         NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ($4::uuid, $5::uuid, $6, 'Amy Guy', NULL, NULL, NULL, NULL, NULL, 'set', NULL,
         NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ($7::uuid, $8::uuid, $9, 'Anthony Kendall', '(555) 555-0199', NULL, NULL, NULL, NULL, 'set', NULL,
         NULL, NULL, NULL, NULL, NULL, NULL, NULL),
        ($10::uuid, $11::uuid, $12, 'Admin Provider', '(555) 555-0100', 'Family Medicine', 'TX', 'South',
         'W2', 'set', 'Monday - Friday, 8:00 AM - 4:00 PM',
         $5::uuid, 'Amy Guy', $6,
         $8::uuid, 'Anthony Kendall', $9,
         $13::uuid),
        ($14::uuid, $15::uuid, $16, 'Jordan Provider', '(555) 555-0101', 'Internal Medicine', 'TX', 'South',
         '1099', 'set', NULL,
         $2::uuid, 'Sam Recruiter', $3,
         $8::uuid, 'Anthony Kendall', $9,
         $13::uuid),
        ($17::uuid, $18::uuid, $19, 'Casey Provider', '(555) 555-0102', 'Hospitalist', 'AZ', 'West',
         'W2', 'prn', NULL,
         $2::uuid, 'Sam Recruiter', $3,
         NULL, NULL, NULL,
         $20::uuid)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         specialty = EXCLUDED.specialty,
         state = EXCLUDED.state,
         employment_type = EXCLUDED.employment_type,
         schedule_type = EXCLUDED.schedule_type,
         work_schedule = EXCLUDED.work_schedule,
         recruiter_id = EXCLUDED.recruiter_id,
         recruiter_name = EXCLUDED.recruiter_name,
         liaison_id = EXCLUDED.liaison_id,
         liaison_name = EXCLUDED.liaison_name,
         primary_facility_id = EXCLUDED.primary_facility_id,
         updated_at = now()`,
      [
        profiles.recruiter,
        recruiterUserId,
        SEED_EMAIL.recruiter,
        profiles.recruiterAmy,
        amyUserId,
        SEED_EMAIL.recruiterAmy,
        profiles.liaisonAnthony,
        anthonyUserId,
        SEED_EMAIL.liaisonAnthony,
        profiles.provider1,
        users.provider1,
        SEED_EMAIL.provider1,
        workSites.dallas,
        profiles.provider2,
        users.provider2,
        SEED_EMAIL.provider2,
        profiles.provider3,
        users.provider3,
        SEED_EMAIL.provider3,
        workSites.phoenix,
      ],
    );

    await client.query(
      `INSERT INTO public.user_roles (user_id, role)
       VALUES
         ($1::uuid, 'internal_staff'),
         ($2::uuid, 'internal_staff'),
         ($3::uuid, 'internal_staff'),
         ($4::uuid, 'provider_user'),
         ($5::uuid, 'provider_user'),
         ($6::uuid, 'provider_user')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [
        users.recruiter,
        users.recruiterAmy,
        users.liaisonAnthony,
        users.provider1,
        users.provider2,
        users.provider3,
      ],
    );

    await client.query(
      `INSERT INTO public.org_memberships (user_id, org_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (user_id, org_id) DO NOTHING`,
      [users.recruiter, org.optum],
    );

    await client.query(
      `INSERT INTO public.assignments (
        id, provider_id, recruiter_id, client_org_id, specialty, status
      ) VALUES
        ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'Family Medicine', 'active'),
        ($5::uuid, $6::uuid, $7::uuid, $4::uuid, 'Internal Medicine', 'active'),
        ($8::uuid, $9::uuid, $7::uuid, $4::uuid, 'Hospitalist', 'active')
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
      [
        assignments.provider1,
        users.provider1,
        amyUserId,
        org.optum,
        assignments.provider2,
        users.provider2,
        recruiterUserId,
        assignments.provider3,
        users.provider3,
      ],
    );

    await client.query(
      `INSERT INTO public.provider_work_sites (id, provider_id, work_site_id, is_primary, weekly_schedule)
       VALUES
         ($1::uuid, $2::uuid, $3::uuid, true, $8::jsonb),
         ($4::uuid, $2::uuid, $5::uuid, false, '[]'::jsonb),
         ($6::uuid, $7::uuid, $3::uuid, true, $8::jsonb),
         ($9::uuid, $10::uuid, $11::uuid, true, '[]'::jsonb)
       ON CONFLICT (provider_id, work_site_id) DO UPDATE SET
         is_primary = EXCLUDED.is_primary,
         weekly_schedule = EXCLUDED.weekly_schedule`,
      [
        providerWorkSites.p1Dallas,
        users.provider1,
        workSites.dallas,
        providerWorkSites.p1Houston,
        workSites.houston,
        providerWorkSites.p2Dallas,
        users.provider2,
        weeklyScheduleJson,
        providerWorkSites.p3Phoenix,
        users.provider3,
        workSites.phoenix,
      ],
    );

    await client.query(
      `INSERT INTO public.optum_pocs (id, work_site_id, name, role, email)
       VALUES ($1::uuid, $2::uuid, 'Taylor Site Coordinator', 'Scheduling', 'taylor.poc@optum.seed.local')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [optumPoc, workSites.dallas],
    );

    await seedExtraActiveProvidersData(client, instanceId);

    const prnMonthYear = await seedProviderPrnAvailabilityData(client);
    const setMonthYear = await seedProviderSetTimeOffData(client);

    await client.query(
      `INSERT INTO public.time_off_requests (
        id, provider_id, recruiter_id, liaison_id, work_site_id, request_date,
        start_time, end_time, change_type, status, client_name, specialty, notes
      ) VALUES
        ($1::uuid, $2::uuid, $3::uuid, $10::uuid, $4::uuid, CURRENT_DATE + 7,
         NULL, NULL, 'remove_day', 'pending_review', 'Optum', 'Hospitalist', 'Seed: PTO day removal'),
        ($5::uuid, $2::uuid, $3::uuid, $10::uuid, $4::uuid, CURRENT_DATE + 14,
         '09:00', '17:00', 'swap', 'pending_review', 'Optum', 'Hospitalist', 'Seed: shift swap'),
        ($6::uuid, $7::uuid, $3::uuid, $10::uuid, $8::uuid, CURRENT_DATE + 10,
         '08:00', '16:00', 'modify_shift', 'pending_review', 'Optum', 'Internal Medicine', 'Seed: Houston site'),
        ($9::uuid, $2::uuid, $3::uuid, $10::uuid, $4::uuid, CURRENT_DATE - 3,
         NULL, NULL, 'remove_day', 'approved', 'Optum', 'Hospitalist', 'Seed: already approved'),
        ($11::uuid, $2::uuid, $3::uuid, $10::uuid, $4::uuid,
         (DATE_TRUNC('month', CURRENT_DATE)::date + 5),
         '08:00', '17:00', 'add_day', 'approved', 'Optum', 'Hospitalist', 'Seed: master calendar May'),
        ($12::uuid, $7::uuid, $3::uuid, $10::uuid, $8::uuid,
         (DATE_TRUNC('month', CURRENT_DATE)::date + 12),
         '09:00', '15:00', 'add_day', 'pending_review', 'Optum', 'Internal Medicine', 'Seed: master calendar pending')
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         liaison_id = EXCLUDED.liaison_id,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         request_date = EXCLUDED.request_date,
         notes = EXCLUDED.notes,
         updated_at = now()`,
      [
        timeOff.pending1,
        users.provider1,
        recruiterUserId,
        workSites.dallas,
        timeOff.pending2,
        timeOff.pendingOtherSite,
        users.provider2,
        workSites.houston,
        timeOff.approved,
        anthonyUserId,
        timeOff.masterCalApproved,
        timeOff.masterCalPending,
      ],
    );

    await client.query('COMMIT');

    console.log('Seed completed.\n');
    console.log('Onboard new provider:');
    console.log('  GET http://localhost:3000/admin/onboarding/form-options');
    console.log('  GET http://localhost:3000/admin/onboarding/work-sites/search?q=ACE');
    console.log('  POST http://localhost:3000/admin/onboarding');
    console.log('');
    console.log('Active providers (10 seeded — 3 original + 7 extra):');
    console.log('  GET http://localhost:3000/admin/providers');
    console.log('  GET http://localhost:3000/admin/providers/filter-options');
    console.log('  GET http://localhost:3000/admin/providers/export');
    console.log('  GET .../admin/providers?recruiterId=' + amyUserId);
    console.log('  GET .../admin/providers?employmentType=W2');
    console.log('');
    console.log('Master Availability Calendar:');
    console.log('  GET http://localhost:3000/admin/master-availability/filter-options?company=Frontera');
    console.log('  GET http://localhost:3000/admin/master-availability?company=Frontera');
    console.log('  GET http://localhost:3000/admin/master-availability/calendar?company=Frontera');
    console.log('  GET http://localhost:3000/admin/master-availability/export?company=Frontera&view=table');
    console.log('');
    console.log('Schedule Change Approvals:');
    console.log('  GET http://localhost:3000/admin/schedule-change-approvals/filter-options?company=Frontera');
    console.log('  GET http://localhost:3000/admin/schedule-change-approvals/summary?company=Frontera');
    console.log('  GET http://localhost:3000/admin/schedule-change-approvals/list?company=Frontera');
    console.log('  GET http://localhost:3000/admin/schedule-change-approvals/calendar?company=Frontera');
    console.log('');
    console.log('Master PTO submission progress:');
    console.log('  GET http://localhost:3000/admin/master-availability/submission-progress?company=Frontera');
    console.log('');
    console.log('PRN Availability (admin + provider portal):');
    console.log('  GET http://localhost:3000/admin/prn-availability/filter-options?company=Frontera');
    console.log('  GET http://localhost:3000/admin/prn-availability/queue?company=Frontera&monthYear=' + prnMonthYear);
    console.log('  GET http://localhost:3000/admin/prn-availability/calendar?company=Frontera&monthYear=' + prnMonthYear);
    console.log(
      '  GET http://localhost:3000/provider/' + users.provider3 + '/scheduling/context',
    );
    console.log(
      '  GET http://localhost:3000/provider/' +
        users.provider3 +
        '/scheduling/availability?monthYear=' +
        prnMonthYear,
    );
    console.log('  (PRN: Casey Provider ' + users.provider3 + ' / ' + SEED_EMAIL.provider3 + ')');
    console.log('');
    console.log('SET time-off (provider portal):');
    console.log(
      '  GET http://localhost:3000/provider/' + users.provider1 + '/scheduling/time-off?monthYear=' + setMonthYear,
    );
    console.log('  (SET: Admin Provider ' + users.provider1 + ' / ' + SEED_EMAIL.provider1 + ')');
    console.log('');
    console.log('Seed user IDs (optional in .env for future auth tests):');
    console.log('  FRONTERA_SEED_RECRUITER_USER_ID=' + recruiterUserId);
    console.log('  FRONTERA_SEED_PROVIDER_USER_ID=' + users.provider1);
    console.log('');
    console.log('Emails:', SEED_EMAIL.recruiter, SEED_EMAIL.provider1, SEED_EMAIL.provider2);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(
      'Seed failed. If auth.users insert is not allowed, run scripts/seed-test-data.sql in the Supabase SQL Editor.',
    );
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
