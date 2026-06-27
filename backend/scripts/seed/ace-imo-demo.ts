/**
 * Demo SET providers for ACE/IMO and Region 1 calendar exports (June 2026).
 * Matches the reference workbook layout: one recruiter tab, specialty rows, "Dr. Name 8-5".
 */
import type { PoolClient } from 'pg';
import { SEED, SEED_EMAIL } from './ids';

export const ACE_IMO_DEMO_MONTH_YEAR = '2026-06-01';

export const ACE_DEMO_WEEKLY_SCHEDULE = [
  { day: 'Monday', start: '8:00 AM', end: '5:00 PM' },
  { day: 'Tuesday', start: '8:00 AM', end: '5:00 PM' },
  { day: 'Wednesday', start: '8:00 AM', end: '5:00 PM' },
  { day: 'Thursday', start: '8:00 AM', end: '5:00 PM' },
  { day: 'Friday', start: '8:00 AM', end: '5:00 PM' },
] as const;

const WORK_SITE = {
  id: 'c0000000-0000-4000-8000-000000000010',
  facilityName: 'Optum Manhattan',
  city: 'Manhattan',
  state: 'NY',
  region: 'Region 1',
} as const;

const RECRUITERS = {
  grayRodgers: {
    id: SEED.onboardingStaff['gray.rodgers'],
    name: 'Gray Rodgers',
    email: SEED_EMAIL.onboardingStaff['gray.rodgers'],
  },
  audreyWilliams: {
    id: SEED.onboardingStaff['audrey.williams'],
    name: 'Audrey Williams',
    email: SEED_EMAIL.onboardingStaff['audrey.williams'],
  },
  richardMontgomery: {
    id: SEED.onboardingStaff['richard.montgomery'],
    name: 'Richard Montgomery',
    email: SEED_EMAIL.onboardingStaff['richard.montgomery'],
  },
} as const;

const LIAISON = {
  id: SEED.onboardingStaff['anthony.kendall'],
  name: 'Anthony Kendall',
  email: SEED_EMAIL.onboardingStaff['anthony.kendall'],
};

type DemoProvider = {
  userId: string;
  profileId: string;
  assignmentId: string;
  pwsId: string;
  email: string;
  fullName: string;
  specialty: string;
  recruiter: (typeof RECRUITERS)[keyof typeof RECRUITERS];
};

const DEMO_PROVIDERS: DemoProvider[] = [
  // Gray Rodgers — 9 providers
  ...([
    ['Dr. Mark Williams', 'Internal Medicine'],
    ['Dr. Robert Kim', 'Hospitalist'],
    ['Dr. Emily Stone', 'Internal Medicine'],
    ['Dr. Daniel Reyes', 'Internal Medicine'],
    ['Dr. Rachel Owens', 'Internal Medicine'],
    ['Dr. Thomas Greene', 'Hospitalist'],
    ['Dr. Aaron Klein', 'Family Medicine'],
    ['Dr. Julian Beck', 'Family Medicine'],
    ['Dr. Kira Patel', 'Internal Medicine'],
  ] as const).map(([fullName, specialty], i) => ({
    userId: `a0000000-0000-4000-8000-${String(20 + i).padStart(12, '0')}`,
    profileId: `e0000000-0000-4000-8000-${String(20 + i).padStart(12, '0')}`,
    assignmentId: `f0000000-0000-4000-8000-${String(50 + i).padStart(12, '0')}`,
    pwsId: `f0000000-0000-4000-8000-${String(80 + i).padStart(12, '0')}`,
    email: `ace.demo.gray.${i + 1}@frontera.local`,
    fullName,
    specialty,
    recruiter: RECRUITERS.grayRodgers,
  })),
  // Audrey Williams — 5 providers
  ...([
    ['Dr. James Carter', 'Emergency Medicine'],
    ['Dr. Priya Shah', 'Emergency Medicine'],
    ['Dr. Kevin Lopez', 'Emergency Medicine'],
    ['Dr. Felix Moreno', 'Family Medicine'],
    ['Dr. Gianna Rivera', 'Internal Medicine'],
  ] as const).map(([fullName, specialty], i) => ({
    userId: `a0000000-0000-4000-8000-${String(29 + i).padStart(12, '0')}`,
    profileId: `e0000000-0000-4000-8000-${String(29 + i).padStart(12, '0')}`,
    assignmentId: `f0000000-0000-4000-8000-${String(59 + i).padStart(12, '0')}`,
    pwsId: `f0000000-0000-4000-8000-${String(89 + i).padStart(12, '0')}`,
    email: `ace.demo.audrey.${i + 1}@frontera.local`,
    fullName,
    specialty,
    recruiter: RECRUITERS.audreyWilliams,
  })),
  // Richard Montgomery — 5 providers
  ...([
    ['Dr. William Park', 'Family Medicine'],
    ['Dr. Grace Nguyen', 'Internal Medicine'],
    ['Dr. Bianca Rossi', 'Internal Medicine'],
    ['Dr. Noah Ellis', 'Family Medicine'],
    ['Dr. Olive Ramirez', 'Internal Medicine'],
  ] as const).map(([fullName, specialty], i) => ({
    userId: `a0000000-0000-4000-8000-${String(34 + i).padStart(12, '0')}`,
    profileId: `e0000000-0000-4000-8000-${String(34 + i).padStart(12, '0')}`,
    assignmentId: `f0000000-0000-4000-8000-${String(64 + i).padStart(12, '0')}`,
    pwsId: `f0000000-0000-4000-8000-${String(94 + i).padStart(12, '0')}`,
    email: `ace.demo.richard.${i + 1}@frontera.local`,
    fullName,
    specialty,
    recruiter: RECRUITERS.richardMontgomery,
  })),
];

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
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
    [instanceId, id, email],
  );
}

export async function seedAceImoDemoData(
  client: PoolClient,
  instanceId: string,
): Promise<string> {
  const weeklyScheduleJson = JSON.stringify(ACE_DEMO_WEEKLY_SCHEDULE);

  await client.query(
    `INSERT INTO public.work_sites (id, facility_name, client_name, city, state, region)
     VALUES ($1::uuid, $2, 'Optum', $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       facility_name = EXCLUDED.facility_name,
       city = EXCLUDED.city,
       state = EXCLUDED.state,
       region = EXCLUDED.region,
       updated_at = now()`,
    [WORK_SITE.id, WORK_SITE.facilityName, WORK_SITE.city, WORK_SITE.state, WORK_SITE.region],
  );

  for (const p of DEMO_PROVIDERS) {
    await ensureAuthUser(client, instanceId, p.userId, p.email);

    await client.query(
      `INSERT INTO public.profiles (
        id, user_id, email, full_name, phone, specialty, state, region,
        company, employment_type, schedule_type, work_schedule,
        recruiter_id, recruiter_name, recruiter_email,
        liaison_id, liaison_name, liaison_email,
        primary_facility_id
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4, '(555) 555-0200', $5, 'NY', $6,
        'Frontera', 'W2', 'set', 'Monday - Friday, 8:00 AM - 5:00 PM',
        $7::uuid, $8, $9,
        $10::uuid, $11, $12,
        $13::uuid
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        specialty = EXCLUDED.specialty,
        region = EXCLUDED.region,
        company = EXCLUDED.company,
        schedule_type = EXCLUDED.schedule_type,
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
        p.specialty,
        WORK_SITE.region,
        p.recruiter.id,
        p.recruiter.name,
        p.recruiter.email,
        LIAISON.id,
        LIAISON.name,
        LIAISON.email,
        WORK_SITE.id,
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
      [p.assignmentId, p.userId, p.recruiter.id, SEED.org.optum, p.specialty],
    );

    await client.query(
      `INSERT INTO public.provider_work_sites (id, provider_id, work_site_id, is_primary, weekly_schedule)
       VALUES ($1::uuid, $2::uuid, $3::uuid, true, $4::jsonb)
       ON CONFLICT (provider_id, work_site_id) DO UPDATE SET
         is_primary = EXCLUDED.is_primary,
         weekly_schedule = EXCLUDED.weekly_schedule`,
      [p.pwsId, p.userId, WORK_SITE.id, weeklyScheduleJson],
    );
  }

  return ACE_IMO_DEMO_MONTH_YEAR;
}
