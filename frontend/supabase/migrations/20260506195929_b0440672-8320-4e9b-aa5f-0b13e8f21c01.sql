
-- 1. Master worksite list (additional Optum + special entries)
INSERT INTO public.work_sites (facility_name, city, state, client_name) VALUES
  ('Optum Health Center - Houston Galleria', 'Houston', 'TX', 'Optum'),
  ('Optum Health Center - Houston Memorial', 'Houston', 'TX', 'Optum'),
  ('Optum Health Center - Plano', 'Plano', 'TX', 'Optum'),
  ('Optum Health Center - Frisco', 'Frisco', 'TX', 'Optum'),
  ('Optum Health Center - Fort Worth', 'Fort Worth', 'TX', 'Optum'),
  ('Optum Health Center - Arlington', 'Arlington', 'TX', 'Optum'),
  ('Optum Health Center - Round Rock', 'Round Rock', 'TX', 'Optum'),
  ('Optum Health Center - Cedar Park', 'Cedar Park', 'TX', 'Optum'),
  ('Optum Health Center - San Antonio North', 'San Antonio', 'TX', 'Optum'),
  ('Optum Health Center - San Antonio South', 'San Antonio', 'TX', 'Optum'),
  ('Optum Health Center - El Paso', 'El Paso', 'TX', 'Optum'),
  ('Optum Health Center - Lubbock', 'Lubbock', 'TX', 'Optum'),
  ('Optum Health Center - Corpus Christi', 'Corpus Christi', 'TX', 'Optum'),
  ('Optum Health Center - McAllen', 'McAllen', 'TX', 'Optum'),
  ('Optum Health Center - Waco', 'Waco', 'TX', 'Optum'),
  ('Optum Health Center - Tyler', 'Tyler', 'TX', 'Optum'),
  ('Optum Urgent Care - Mesquite', 'Mesquite', 'TX', 'Optum'),
  ('Optum Urgent Care - Garland', 'Garland', 'TX', 'Optum'),
  ('Optum Urgent Care - Sugar Land', 'Sugar Land', 'TX', 'Optum'),
  ('Optum Specialty Center - Katy', 'Katy', 'TX', 'Optum'),
  ('Telehealth', NULL, NULL, 'Optum'),
  ('Travel - Multiple Sites', NULL, NULL, 'Optum')
ON CONFLICT DO NOTHING;

-- 2. Auto-grant admin to Anthony Kendall on signup, and to admin email
CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('akendall@fronterasearch.com', 'admin@fronterasearch.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_grant_admin_trigger ON auth.users;
CREATE TRIGGER auto_grant_admin_trigger
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.auto_grant_admin_role();

-- Backfill admin if Anthony already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE email = 'akendall@fronterasearch.com'
ON CONFLICT DO NOTHING;
