-- Frontera seed — run in Supabase SQL Editor if `npm run db:seed` cannot insert auth.users.
-- Idempotent: safe to re-run. Matches scripts/seed/ids.ts UUIDs.

BEGIN;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
SELECT
  COALESCE((SELECT id FROM auth.instances LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid),
  v.id,
  'authenticated',
  'authenticated',
  v.email,
  crypt('seed-not-for-login', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb
FROM (VALUES
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'recruiter.seed@frontera.local'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'provider1.seed@frontera.local'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'provider2.seed@frontera.local')
) AS v(id, email)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now();

INSERT INTO public.organizations (id, name, type, domain)
VALUES ('b0000000-0000-4000-8000-000000000001'::uuid, 'Optum', 'client', 'optum.seed.local')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO public.work_sites (id, facility_name, client_name, city, state, region)
VALUES
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'Dallas Medical Center', 'Optum', 'Dallas', 'TX', 'South'),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'Houston Clinic', 'Optum', 'Houston', 'TX', 'South')
ON CONFLICT (id) DO UPDATE SET facility_name = EXCLUDED.facility_name, updated_at = now();

INSERT INTO public.profiles (
  id, user_id, email, full_name, specialty, schedule_type,
  recruiter_id, recruiter_name, recruiter_email, primary_facility_id
) VALUES
  ('e0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid,
   'recruiter.seed@frontera.local', 'Sam Recruiter', NULL, 'set', NULL, NULL, NULL, NULL),
  ('e0000000-0000-4000-8000-000000000002'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'provider1.seed@frontera.local', 'Alex Provider', 'Hospitalist', 'set',
   'a0000000-0000-4000-8000-000000000001'::uuid, 'Sam Recruiter', 'recruiter.seed@frontera.local',
   'c0000000-0000-4000-8000-000000000001'::uuid),
  ('e0000000-0000-4000-8000-000000000003'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid,
   'provider2.seed@frontera.local', 'Jordan Provider', 'Internal Medicine', 'set',
   'a0000000-0000-4000-8000-000000000001'::uuid, 'Sam Recruiter', 'recruiter.seed@frontera.local',
   'c0000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  recruiter_id = EXCLUDED.recruiter_id,
  primary_facility_id = EXCLUDED.primary_facility_id,
  updated_at = now();

INSERT INTO public.user_roles (user_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'internal_staff'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'provider_user'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'provider_user')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.org_memberships (user_id, org_id) VALUES
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid)
ON CONFLICT (user_id, org_id) DO NOTHING;

INSERT INTO public.assignments (id, provider_id, recruiter_id, client_org_id, specialty, status) VALUES
  ('f0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, 'Hospitalist', 'active'),
  ('f0000000-0000-4000-8000-000000000002'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid,
   'a0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid, 'Internal Medicine', 'active')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, updated_at = now();

INSERT INTO public.provider_work_sites (id, provider_id, work_site_id, is_primary, weekly_schedule) VALUES
  ('f0000000-0000-4000-8000-000000000011'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'c0000000-0000-4000-8000-000000000001'::uuid, true, '[]'::jsonb),
  ('f0000000-0000-4000-8000-000000000012'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'c0000000-0000-4000-8000-000000000002'::uuid, false, '[]'::jsonb),
  ('f0000000-0000-4000-8000-000000000021'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid,
   'c0000000-0000-4000-8000-000000000001'::uuid, true, '[]'::jsonb)
ON CONFLICT (provider_id, work_site_id) DO UPDATE SET is_primary = EXCLUDED.is_primary;

INSERT INTO public.optum_pocs (id, work_site_id, name, role, email) VALUES
  ('f0000000-0000-4000-8000-000000000099'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
   'Taylor Site Coordinator', 'Scheduling', 'taylor.poc@optum.seed.local')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.time_off_requests (
  id, provider_id, recruiter_id, work_site_id, request_date,
  change_type, status, client_name, specialty, notes
) VALUES
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'a0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
   CURRENT_DATE + 7, 'remove_day', 'pending_review', 'Optum', 'Hospitalist', 'Seed: PTO day removal'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'a0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
   CURRENT_DATE + 14, 'swap', 'pending_review', 'Optum', 'Hospitalist', 'Seed: shift swap'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'a0000000-0000-4000-8000-000000000003'::uuid,
   'a0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000002'::uuid,
   CURRENT_DATE + 10, 'modify_shift', 'pending_review', 'Optum', 'Internal Medicine', 'Seed: Houston site'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'a0000000-0000-4000-8000-000000000002'::uuid,
   'a0000000-0000-4000-8000-000000000001'::uuid, 'c0000000-0000-4000-8000-000000000001'::uuid,
   CURRENT_DATE - 3, 'remove_day', 'approved', 'Optum', 'Hospitalist', 'Seed: already approved')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = now();

COMMIT;
