
-- Extend profiles with provider work info & assignments
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS provider_id text,
  ADD COLUMN IF NOT EXISTS recruiter_id uuid,
  ADD COLUMN IF NOT EXISTS liaison_id uuid,
  ADD COLUMN IF NOT EXISTS work_schedule text,
  ADD COLUMN IF NOT EXISTS primary_facility_id uuid;

-- Work sites (facilities providers are approved to work at)
CREATE TABLE IF NOT EXISTS public.work_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_name text NOT NULL,
  address text,
  city text,
  state text,
  zip text,
  latitude numeric,
  longitude numeric,
  client_name text NOT NULL DEFAULT 'Optum',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view work sites" ON public.work_sites
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage work sites" ON public.work_sites
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Provider <-> work site assignments (multi-facility support)
CREATE TABLE IF NOT EXISTS public.provider_work_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  work_site_id uuid NOT NULL REFERENCES public.work_sites(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, work_site_id)
);
ALTER TABLE public.provider_work_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers view own work sites" ON public.provider_work_sites
  FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "Internal staff view assigned providers' sites" ON public.provider_work_sites
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'internal_staff') AND is_assigned_to(auth.uid(), provider_id));
CREATE POLICY "Admins manage provider work sites" ON public.provider_work_sites
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Holidays
CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  holiday_date date NOT NULL,
  year integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view holidays" ON public.holidays
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage holidays" ON public.holidays
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Time-off requests (per-day, with approval)
CREATE TYPE public.time_off_status AS ENUM ('pending_review','approved','denied','withdrawn');
CREATE TYPE public.time_off_change_type AS ENUM ('remove_day','add_day');

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  recruiter_id uuid,
  liaison_id uuid,
  work_site_id uuid REFERENCES public.work_sites(id),
  request_date date NOT NULL,
  start_time time,
  end_time time,
  is_unavailable boolean NOT NULL DEFAULT true,
  change_type public.time_off_change_type NOT NULL DEFAULT 'remove_day',
  status public.time_off_status NOT NULL DEFAULT 'pending_review',
  notes text,
  submission_group_id uuid,
  client_name text NOT NULL DEFAULT 'Optum',
  specialty text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers view own time off" ON public.time_off_requests
  FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "Providers create own time off" ON public.time_off_requests
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = auth.uid() AND has_role(auth.uid(), 'provider_user'));
CREATE POLICY "Providers update own pending time off" ON public.time_off_requests
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid() AND status = 'pending_review')
  WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Recruiters/liaisons view assigned time off" ON public.time_off_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'internal_staff')
    AND (recruiter_id = auth.uid() OR liaison_id = auth.uid() OR is_assigned_to(auth.uid(), provider_id)));
CREATE POLICY "Recruiters/liaisons review assigned time off" ON public.time_off_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'internal_staff')
    AND (recruiter_id = auth.uid() OR liaison_id = auth.uid() OR is_assigned_to(auth.uid(), provider_id)))
  WITH CHECK (has_role(auth.uid(), 'internal_staff'));
CREATE POLICY "Admins manage all time off" ON public.time_off_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Validation trigger: enforce 5-business-day rule for adding days
CREATE OR REPLACE FUNCTION public.validate_time_off_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  business_days_ahead int := 0;
  d date := CURRENT_DATE;
BEGIN
  IF NEW.change_type = 'add_day' THEN
    -- count business days between today and request_date
    WHILE d < NEW.request_date LOOP
      d := d + 1;
      IF EXTRACT(DOW FROM d) NOT IN (0,6) THEN
        business_days_ahead := business_days_ahead + 1;
      END IF;
    END LOOP;
    IF business_days_ahead < 5 THEN
      RAISE EXCEPTION 'Adding a workday requires at least 5 business days notice';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate_time_off
  BEFORE INSERT OR UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_time_off_request();

CREATE TRIGGER trg_time_off_updated
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monthly availability requests
CREATE TYPE public.monthly_avail_status AS ENUM ('requested','submitted','overdue');

CREATE TABLE IF NOT EXISTS public.monthly_availability_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  month_year date NOT NULL, -- first day of the month
  deadline date NOT NULL,
  status public.monthly_avail_status NOT NULL DEFAULT 'requested',
  submitted_at timestamptz,
  submission_group_id uuid,
  no_changes boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, month_year)
);
ALTER TABLE public.monthly_availability_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers view own monthly avail" ON public.monthly_availability_requests
  FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "Providers update own monthly avail" ON public.monthly_availability_requests
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Internal staff view assigned monthly avail" ON public.monthly_availability_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'internal_staff') AND is_assigned_to(auth.uid(), provider_id));
CREATE POLICY "Admins manage monthly avail" ON public.monthly_availability_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_monthly_avail_updated
  BEFORE UPDATE ON public.monthly_availability_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "System/admin can insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'internal_staff') OR user_id = auth.uid());
CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- Optum points of contact
CREATE TABLE IF NOT EXISTS public.optum_pocs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  role text,
  work_site_id uuid REFERENCES public.work_sites(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.optum_pocs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view Optum POCs" ON public.optum_pocs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage Optum POCs" ON public.optum_pocs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed 2026 holidays
INSERT INTO public.holidays (name, holiday_date, year) VALUES
  ('New Year''s Day', '2026-01-01', 2026),
  ('Memorial Day', '2026-05-25', 2026),
  ('Independence Day', '2026-07-04', 2026),
  ('Labor Day', '2026-09-07', 2026),
  ('Thanksgiving Day', '2026-11-26', 2026),
  ('Day After Thanksgiving', '2026-11-27', 2026),
  ('Christmas Day', '2026-12-25', 2026)
ON CONFLICT DO NOTHING;
