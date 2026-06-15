ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.provider_invites ADD COLUMN IF NOT EXISTS region text;