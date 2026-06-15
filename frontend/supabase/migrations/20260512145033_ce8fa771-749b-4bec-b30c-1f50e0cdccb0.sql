
-- 1. Seed 2026 Optum Clinic Closure dates (replace existing 2026 holidays)
DELETE FROM public.holidays WHERE year = 2026;
INSERT INTO public.holidays (name, holiday_date, year) VALUES
  ('New Year''s Day', '2026-01-01', 2026),
  ('Martin Luther King Jr. Day', '2026-01-19', 2026),
  ('Memorial Day', '2026-05-25', 2026),
  ('Independence Day', '2026-07-04', 2026),
  ('Labor Day', '2026-09-07', 2026),
  ('Thanksgiving Day', '2026-11-26', 2026),
  ('Day after Thanksgiving', '2026-11-27', 2026),
  ('Christmas Day', '2026-12-25', 2026);

-- 2. Add PACR document attachment to time_off_requests
ALTER TABLE public.time_off_requests
  ADD COLUMN IF NOT EXISTS pacr_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

-- 3. Validation trigger: block schedule changes on Optum clinic closure dates
CREATE OR REPLACE FUNCTION public.validate_time_off_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  business_days_ahead int := 0;
  d date := CURRENT_DATE;
  closure_match int;
BEGIN
  -- Block any schedule change request landing on an Optum clinic closure date
  SELECT count(*) INTO closure_match FROM public.holidays WHERE holiday_date = NEW.request_date;
  IF closure_match > 0 THEN
    RAISE EXCEPTION 'This date is an Optum Clinic Closure - no schedule change is needed.';
  END IF;

  IF NEW.change_type = 'add_day' THEN
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
END $function$;
