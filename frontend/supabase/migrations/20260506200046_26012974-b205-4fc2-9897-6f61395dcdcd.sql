
DO $$
DECLARE
  rec record;
  new_uid uuid;
  site_id uuid;
BEGIN
  FOR rec IN SELECT * FROM (VALUES
    ('Sarah Johnson',   'sarah.johnson@example.com',     '512-555-0101', 'Family Medicine',   'TX', 'W2',   'set', 'Mon-Fri 8a-5p',         'Amy',     'Paige',     'Optum Health Center - Plano'),
    ('Michael Chen',    'michael.chen@example.com',      '210-555-0102', 'Internal Medicine', 'TX', '1099', 'set', 'Tue/Wed/Thu/Sat 8a-5p', 'Audrey',  'Anthony',   'Optum Health Center - San Antonio North'),
    ('Jamie Rivera',    'jamie.rivera@example.com',      '512-555-0103', 'Family Medicine',   'TX', '1099', 'prn', 'PRN — variable',        'Averie',  'Stephanie', 'Optum Health Center - Round Rock'),
    ('Priya Patel',     'priya.patel@example.com',       '713-555-0104', 'Pediatrics',        'TX', 'W2',   'set', 'Mon-Fri 9a-4p',         'Bryan',   'Veronica',  'Optum Health Center - Houston Galleria'),
    ('Daniel Kim',      'daniel.kim@example.com',        '469-555-0105', 'Family Medicine',   'TX', 'W2',   'set', 'Mon-Fri 8a-5p',         'Clint',   'Paige',     'Optum Health Center - Frisco'),
    ('Rachel Brooks',   'rachel.brooks@example.com',     '817-555-0106', 'Urgent Care',       'TX', '1099', 'prn', 'PRN — variable',        'Gray',    'Anthony',   'Optum Urgent Care - Garland'),
    ('Marcus Wallace',  'marcus.wallace@example.com',    '915-555-0107', 'Internal Medicine', 'TX', 'W2',   'set', 'Mon-Fri 10a-6p',        'Mikala',  'Stephanie', 'Optum Health Center - El Paso'),
    ('Elena Sosa',      'elena.sosa@example.com',        '956-555-0108', 'Family Medicine',   'TX', '1099', 'set', 'Mon-Fri 8a-5p',         'Richard', 'Veronica',  'Optum Health Center - McAllen'),
    ('Thomas Nguyen',   'thomas.nguyen@example.com',     '281-555-0109', 'Telehealth',        'TX', 'W2',   'set', 'Mon-Fri 9a-5p',         'Eve',     'Paige',     'Telehealth'),
    ('Olivia Carter',   'olivia.carter@example.com',     '254-555-0110', 'Family Medicine',   'TX', '1099', 'set', 'Tue-Sat 8a-5p',         'Amy',     'Anthony',   'Travel - Multiple Sites'),
    ('Benjamin Foster', 'benjamin.foster@example.com',   '903-555-0111', 'Internal Medicine', 'TX', 'W2',   'set', 'Mon-Fri 8a-5p',         'Audrey',  'Stephanie', 'Optum Health Center - Tyler'),
    ('Sofia Ramirez',   'sofia.ramirez@example.com',     '361-555-0112', 'Pediatrics',        'TX', '1099', 'prn', 'PRN — variable',        'Averie',  'Veronica',  'Optum Health Center - Corpus Christi')
  ) AS t(full_name, email, phone, specialty, st, employment_type, schedule_type, work_schedule, recruiter_name, liaison_name, site_name)
  LOOP
    -- Skip if already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = rec.email) THEN
      CONTINUE;
    END IF;

    new_uid := gen_random_uuid();

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
      new_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', rec.email,
      crypt('SamplePass123!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email"}'::jsonb,
      jsonb_build_object('full_name', rec.full_name),
      false
    );

    -- Update the profile that handle_new_user trigger created
    UPDATE public.profiles SET
      full_name = rec.full_name,
      phone = rec.phone,
      specialty = rec.specialty,
      state = rec.st,
      employment_type = rec.employment_type,
      schedule_type = rec.schedule_type,
      work_schedule = rec.work_schedule,
      recruiter_name = rec.recruiter_name,
      liaison_name = rec.liaison_name,
      portal_type = 'provider'
    WHERE user_id = new_uid;

    INSERT INTO public.user_roles (user_id, role) VALUES (new_uid, 'provider_user'::app_role)
    ON CONFLICT DO NOTHING;

    SELECT id INTO site_id FROM public.work_sites WHERE facility_name = rec.site_name LIMIT 1;
    IF site_id IS NOT NULL THEN
      INSERT INTO public.provider_work_sites (provider_id, work_site_id, is_primary, weekly_schedule)
      VALUES (new_uid, site_id, true, '[]'::jsonb);
    END IF;
  END LOOP;
END $$;
