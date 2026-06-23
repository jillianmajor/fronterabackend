-- Tables created by Drizzle (0000 schedule_finalizations, 0002 onboarding_*) shipped without RLS.
-- 0003_authenticated_grants.sql also granted SELECT to anon on all public tables — unsafe without RLS.
-- Apply to hosted Supabase (owebwsoxinnmbafwttlz) to clear Security Advisor: rls_disabled_in_public, sensitive_columns_exposed.

-- ---------------------------------------------------------------------------
-- Revoke broad anon access (anon key is in the browser; data tables need RLS + authenticated only)
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;

-- ---------------------------------------------------------------------------
-- schedule_finalizations
-- ---------------------------------------------------------------------------
ALTER TABLE public.schedule_finalizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage schedule finalizations" ON public.schedule_finalizations;
CREATE POLICY "Staff manage schedule finalizations"
  ON public.schedule_finalizations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'internal_staff'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'internal_staff'));

DROP POLICY IF EXISTS "Providers view finalizations for assigned sites" ON public.schedule_finalizations;
CREATE POLICY "Providers view finalizations for assigned sites"
  ON public.schedule_finalizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.provider_work_sites pws
      WHERE pws.work_site_id = schedule_finalizations.work_site_id
        AND pws.provider_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Onboarding catalog (reference data — Nest reads via pooler; lock down PostgREST)
-- ---------------------------------------------------------------------------
DO $policy$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'onboarding_specialties',
    'onboarding_companies',
    'onboarding_regions',
    'onboarding_employment_types',
    'onboarding_schedule_types',
    'onboarding_clinic_days',
    'onboarding_weekly_schedule_presets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Authenticated read active catalog" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Authenticated read active catalog" ON public.%I FOR SELECT TO authenticated USING (is_active = true)',
      tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "Admins manage catalog" ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY "Admins manage catalog" ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(), ''admin'')) WITH CHECK (has_role(auth.uid(), ''admin''))',
      tbl
    );
  END LOOP;
END
$policy$;
