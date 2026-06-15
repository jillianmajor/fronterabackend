/**
 * Additional active providers + work sites for local Docker / filter & export testing.
 */
import type { PoolClient } from 'pg';
import { SEED, SEED_EMAIL, SEED_WEEKLY_SCHEDULE } from './ids';

const { users, org, workSites, onboardingStaff } = SEED;

export const EXTRA_WORK_SITES = [
  {
    id: 'c0000000-0000-4000-8000-000000000005',
    facilityName: 'Austin Regional Hospital',
    city: 'Austin',
    state: 'TX',
    region: 'South',
  },
  {
    id: 'c0000000-0000-4000-8000-000000000006',
    facilityName: 'Denver Mountain Clinic',
    city: 'Denver',
    state: 'CO',
    region: 'West',
  },
] as const;

export const EXTRA_LIAISON_STAFF = [
  {
    userId: onboardingStaff['paige.estes'],
    profileId: SEED.profiles.onboardingStaff['paige.estes'],
    email: SEED_EMAIL.onboardingStaff['paige.estes'],
    fullName: 'Paige Estes',
    phone: '(555) 555-0181',
  },
  {
    userId: onboardingStaff['veronica.raddi'],
    profileId: SEED.profiles.onboardingStaff['veronica.raddi'],
    email: SEED_EMAIL.onboardingStaff['veronica.raddi'],
    fullName: 'Veronica Raddi',
    phone: '(555) 555-0182',
  },
] as const;

export const EXTRA_ACTIVE_PROVIDERS = [
  {
    userId: 'a0000000-0000-4000-8000-000000000014',
    profileId: 'e0000000-0000-4000-8000-000000000014',
    assignmentId: 'f0000000-0000-4000-8000-000000000004',
    email: 'morgan.lee@frontera.local',
    fullName: 'Morgan Lee',
    phone: '(555) 555-0114',
    specialty: 'Pediatrics',
    state: 'TX',
    region: 'South',
    employmentType: 'W2',
    workSchedule: 'Tuesday - Saturday, 9:00 AM - 5:00 PM',
    recruiterId: users.recruiterAmy,
    recruiterName: 'Amy Guy',
    recruiterEmail: SEED_EMAIL.recruiterAmy,
    liaisonId: onboardingStaff['paige.estes'],
    liaisonName: 'Paige Estes',
    liaisonEmail: SEED_EMAIL.onboardingStaff['paige.estes'],
    primaryWorkSiteId: workSites.houston,
    workSites: [{ id: 'f0000000-0000-4000-8000-000000000041', workSiteId: workSites.houston, isPrimary: true }],
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000015',
    profileId: 'e0000000-0000-4000-8000-000000000015',
    assignmentId: 'f0000000-0000-4000-8000-000000000005',
    email: 'riley.chen@frontera.local',
    fullName: 'Riley Chen',
    phone: '(555) 555-0115',
    specialty: 'Emergency Medicine',
    state: 'AZ',
    region: 'West',
    employmentType: '1099',
    workSchedule: null,
    recruiterId: users.recruiter,
    recruiterName: 'Sam Recruiter',
    recruiterEmail: SEED_EMAIL.recruiter,
    liaisonId: users.liaisonAnthony,
    liaisonName: 'Anthony Kendall',
    liaisonEmail: SEED_EMAIL.liaisonAnthony,
    primaryWorkSiteId: workSites.phoenix,
    workSites: [{ id: 'f0000000-0000-4000-8000-000000000042', workSiteId: workSites.phoenix, isPrimary: true }],
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000016',
    profileId: 'e0000000-0000-4000-8000-000000000016',
    assignmentId: 'f0000000-0000-4000-8000-000000000006',
    email: 'avery.brooks@frontera.local',
    fullName: 'Avery Brooks',
    phone: '(555) 555-0116',
    specialty: 'Geriatrics',
    state: 'TX',
    region: 'South',
    employmentType: 'W2',
    workSchedule: 'Monday - Friday, 8:00 AM - 4:00 PM',
    recruiterId: users.recruiter,
    recruiterName: 'Sam Recruiter',
    recruiterEmail: SEED_EMAIL.recruiter,
    liaisonId: onboardingStaff['veronica.raddi'],
    liaisonName: 'Veronica Raddi',
    liaisonEmail: SEED_EMAIL.onboardingStaff['veronica.raddi'],
    primaryWorkSiteId: workSites.austin,
    workSites: [{ id: 'f0000000-0000-4000-8000-000000000043', workSiteId: workSites.austin, isPrimary: true }],
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000017',
    profileId: 'e0000000-0000-4000-8000-000000000017',
    assignmentId: 'f0000000-0000-4000-8000-000000000007',
    email: 'quinn.patel@frontera.local',
    fullName: 'Quinn Patel',
    phone: '(555) 555-0117',
    specialty: 'Psychiatry',
    state: 'TX',
    region: 'Region 1',
    employmentType: 'W2',
    workSchedule: null,
    recruiterId: users.recruiterAmy,
    recruiterName: 'Amy Guy',
    recruiterEmail: SEED_EMAIL.recruiterAmy,
    liaisonId: users.liaisonAnthony,
    liaisonName: 'Anthony Kendall',
    liaisonEmail: SEED_EMAIL.liaisonAnthony,
    primaryWorkSiteId: workSites.aceImoDallas,
    workSites: [{ id: 'f0000000-0000-4000-8000-000000000044', workSiteId: workSites.aceImoDallas, isPrimary: true }],
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000018',
    profileId: 'e0000000-0000-4000-8000-000000000018',
    assignmentId: 'f0000000-0000-4000-8000-000000000008',
    email: 'taylor.nguyen@frontera.local',
    fullName: 'Taylor Nguyen',
    phone: '(555) 555-0118',
    specialty: 'Orthopedics',
    state: 'CO',
    region: 'West',
    employmentType: '1099',
    workSchedule: null,
    recruiterId: users.recruiterAmy,
    recruiterName: 'Amy Guy',
    recruiterEmail: SEED_EMAIL.recruiterAmy,
    liaisonId: onboardingStaff['paige.estes'],
    liaisonName: 'Paige Estes',
    liaisonEmail: SEED_EMAIL.onboardingStaff['paige.estes'],
    primaryWorkSiteId: workSites.denver,
    workSites: [{ id: 'f0000000-0000-4000-8000-000000000045', workSiteId: workSites.denver, isPrimary: true }],
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000019',
    profileId: 'e0000000-0000-4000-8000-000000000019',
    assignmentId: 'f0000000-0000-4000-8000-000000000009',
    email: 'jamie.wilson@frontera.local',
    fullName: 'Jamie Wilson',
    phone: '(555) 555-0119',
    specialty: 'Family Medicine',
    state: 'TX',
    region: 'South',
    employmentType: 'W2',
    workSchedule: 'Monday - Friday, 8:00 AM - 4:00 PM',
    recruiterId: users.recruiter,
    recruiterName: 'Sam Recruiter',
    recruiterEmail: SEED_EMAIL.recruiter,
    liaisonId: onboardingStaff['veronica.raddi'],
    liaisonName: 'Veronica Raddi',
    liaisonEmail: SEED_EMAIL.onboardingStaff['veronica.raddi'],
    primaryWorkSiteId: workSites.dallas,
    workSites: [
      { id: 'f0000000-0000-4000-8000-000000000046', workSiteId: workSites.dallas, isPrimary: true },
      { id: 'f0000000-0000-4000-8000-000000000047', workSiteId: workSites.houston, isPrimary: false },
    ],
  },
  {
    userId: 'a0000000-0000-4000-8000-000000000020',
    profileId: 'e0000000-0000-4000-8000-000000000020',
    assignmentId: 'f0000000-0000-4000-8000-000000000010',
    email: 'dakota.ellis@frontera.local',
    fullName: 'Dakota Ellis',
    phone: '(555) 555-0120',
    specialty: 'Hospitalist',
    state: 'AZ',
    region: 'West',
    employmentType: 'W2',
    workSchedule: null,
    recruiterId: users.recruiter,
    recruiterName: 'Sam Recruiter',
    recruiterEmail: SEED_EMAIL.recruiter,
    liaisonId: null,
    liaisonName: null,
    liaisonEmail: null,
    primaryWorkSiteId: workSites.phoenix,
    workSites: [
      { id: 'f0000000-0000-4000-8000-000000000048', workSiteId: workSites.phoenix, isPrimary: true },
      { id: 'f0000000-0000-4000-8000-000000000049', workSiteId: workSites.denver, isPrimary: false },
    ],
  },
] as const;

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

export async function seedExtraActiveProvidersData(
  client: PoolClient,
  instanceId: string,
): Promise<void> {
  for (const site of EXTRA_WORK_SITES) {
    await client.query(
      `INSERT INTO public.work_sites (id, facility_name, client_name, city, state, region)
       VALUES ($1::uuid, $2, 'Optum', $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         facility_name = EXCLUDED.facility_name,
         city = EXCLUDED.city,
         state = EXCLUDED.state,
         region = EXCLUDED.region,
         updated_at = now()`,
      [site.id, site.facilityName, site.city, site.state, site.region],
    );
  }

  for (const liaison of EXTRA_LIAISON_STAFF) {
    await ensureAuthUser(client, instanceId, liaison.userId, liaison.email);
    await client.query(
      `INSERT INTO public.profiles (
        id, user_id, email, full_name, phone, schedule_type
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, 'set')
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         phone = EXCLUDED.phone,
         updated_at = now()`,
      [liaison.profileId, liaison.userId, liaison.email, liaison.fullName, liaison.phone],
    );
    await client.query(
      `INSERT INTO public.user_roles (user_id, role)
       VALUES ($1::uuid, 'internal_staff')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [liaison.userId],
    );
  }

  const weeklyScheduleJson = JSON.stringify(SEED_WEEKLY_SCHEDULE);

  for (const p of EXTRA_ACTIVE_PROVIDERS) {
    await ensureAuthUser(client, instanceId, p.userId, p.email);
    await client.query(
      `INSERT INTO public.profiles (
        id, user_id, email, full_name, phone, specialty, state, region,
        employment_type, schedule_type, work_schedule,
        recruiter_id, recruiter_name, recruiter_email,
        liaison_id, liaison_name, liaison_email,
        primary_facility_id
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8,
        $9, 'set', $10,
        $11::uuid, $12, $13,
        $14::uuid, $15, $16,
        $17::uuid
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        specialty = EXCLUDED.specialty,
        state = EXCLUDED.state,
        region = EXCLUDED.region,
        employment_type = EXCLUDED.employment_type,
        work_schedule = EXCLUDED.work_schedule,
        recruiter_id = EXCLUDED.recruiter_id,
        recruiter_name = EXCLUDED.recruiter_name,
        liaison_id = EXCLUDED.liaison_id,
        liaison_name = EXCLUDED.liaison_name,
        primary_facility_id = EXCLUDED.primary_facility_id,
        updated_at = now()`,
      [
        p.profileId,
        p.userId,
        p.email,
        p.fullName,
        p.phone,
        p.specialty,
        p.state,
        p.region,
        p.employmentType,
        p.workSchedule,
        p.recruiterId,
        p.recruiterName,
        p.recruiterEmail,
        p.liaisonId,
        p.liaisonName,
        p.liaisonEmail,
        p.primaryWorkSiteId,
      ],
    );

    await client.query(
      `INSERT INTO public.user_roles (user_id, role)
       VALUES ($1::uuid, 'provider_user')
       ON CONFLICT (user_id, role) DO NOTHING`,
      [p.userId],
    );

    await client.query(
      `INSERT INTO public.assignments (
        id, provider_id, recruiter_id, client_org_id, specialty, status
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, 'active')
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
      [p.assignmentId, p.userId, p.recruiterId, org.optum, p.specialty],
    );

    for (const ws of p.workSites) {
      const weeklySchedule =
        !ws.isPrimary ? '[]' : p.workSchedule ? '[]' : weeklyScheduleJson;
      await client.query(
        `INSERT INTO public.provider_work_sites (id, provider_id, work_site_id, is_primary, weekly_schedule)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::jsonb)
         ON CONFLICT (provider_id, work_site_id) DO UPDATE SET
           is_primary = EXCLUDED.is_primary,
           weekly_schedule = EXCLUDED.weekly_schedule`,
        [ws.id, p.userId, ws.workSiteId, ws.isPrimary, weeklySchedule],
      );
    }
  }
}
