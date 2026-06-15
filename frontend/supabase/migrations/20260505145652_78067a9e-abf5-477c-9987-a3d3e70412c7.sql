
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recruiter_name text,
  ADD COLUMN IF NOT EXISTS recruiter_email text,
  ADD COLUMN IF NOT EXISTS recruiter_phone text,
  ADD COLUMN IF NOT EXISTS liaison_name text,
  ADD COLUMN IF NOT EXISTS liaison_email text,
  ADD COLUMN IF NOT EXISTS liaison_phone text;

CREATE TABLE IF NOT EXISTS public.hr_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'HR Support',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hr_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view HR contacts" ON public.hr_contacts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage HR contacts" ON public.hr_contacts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

INSERT INTO public.hr_contacts (name, email, phone, role) VALUES
  ('Nicole Moss', 'nicole.moss@fronterasearch.com', '(555) 200-0001', 'HR Support'),
  ('Alyssa Chavez', 'alyssa.chavez@fronterasearch.com', '(555) 200-0002', 'HR Support')
ON CONFLICT DO NOTHING;
