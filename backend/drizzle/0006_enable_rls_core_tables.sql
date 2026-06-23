-- Core Lovable tables may exist with rowsecurity=false if Drizzle ran before Supabase RLS migrations.
-- Run after 0005. Safe to re-run (idempotent policies).

-- ---------------------------------------------------------------------------
-- Force-enable RLS on every application table exposed to PostgREST
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pto_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_availability_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optum_pocs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_finalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_employment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_schedule_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_clinic_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_weekly_schedule_presets ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- profiles (sensitive: email, phone, PII) — recreate policies if missing
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Internal staff can view assigned provider profiles" ON public.profiles;
CREATE POLICY "Internal staff can view assigned provider profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'internal_staff')
    AND is_assigned_to(auth.uid(), user_id)
  );

-- ---------------------------------------------------------------------------
-- user_roles (sensitive: role assignments)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
