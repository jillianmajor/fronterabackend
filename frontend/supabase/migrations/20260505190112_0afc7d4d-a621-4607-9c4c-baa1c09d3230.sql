
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS employment_type text CHECK (employment_type IN ('W2','1099'));

ALTER TABLE public.provider_work_sites
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Provider invites
CREATE TABLE IF NOT EXISTS public.provider_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  email text NOT NULL,
  full_name text,
  phone text,
  specialty text,
  state text,
  employment_type text,
  work_schedule text,
  provider_id_external text,
  recruiter_id uuid,
  liaison_id uuid,
  work_site_assignments jsonb NOT NULL DEFAULT '[]'::jsonb,
  invited_by uuid,
  used_at timestamptz,
  created_user_id uuid,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and internal staff manage invites"
  ON public.provider_invites FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'internal_staff'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'internal_staff'));

-- Scheduled emails (reminders)
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid,
  template_name text NOT NULL,
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  send_at timestamptz NOT NULL,
  related_table text,
  related_id uuid,
  cancel_if_field text,
  status text NOT NULL DEFAULT 'scheduled',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scheduled emails"
  ON public.scheduled_emails FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Internal staff view scheduled emails"
  ON public.scheduled_emails FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'internal_staff'));

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_due
  ON public.scheduled_emails (send_at) WHERE status = 'scheduled';
