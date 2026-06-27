-- Minimal auth schema so Drizzle FKs and npm run db:seed work without Supabase cloud.
-- Not a full GoTrue stack — JWT auth still targets your Supabase project when configured.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.instances (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO auth.instances (id)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth.users (
  instance_id uuid NOT NULL REFERENCES auth.instances (id),
  id uuid PRIMARY KEY,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb
);

-- Supabase-compatible roles referenced by RLS policies and GRANT scripts.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOINHERIT NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOINHERIT NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOINHERIT NOLOGIN BYPASSRLS;
  END IF;
END $$;

GRANT authenticated TO postgres;
GRANT anon TO postgres;
GRANT service_role TO postgres;

-- Minimal auth.uid() stub for RLS policies (Supabase sets JWT claims in production).
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
