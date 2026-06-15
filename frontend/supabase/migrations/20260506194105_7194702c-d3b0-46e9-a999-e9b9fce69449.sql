
-- Mark May 2026 monthly availability as submitted (finalized) for admin demo
INSERT INTO public.monthly_availability_requests (provider_id, month_year, deadline, status, no_changes, submitted_at)
VALUES ('3a4b9dc0-6b71-458d-a96a-10ee52c4897c', '2026-05-01', '2026-03-25', 'submitted', false, now())
ON CONFLICT DO NOTHING;

-- Two approved full-day time-off entries in May 2026
INSERT INTO public.time_off_requests
  (provider_id, request_date, status, is_unavailable, change_type, client_name, reviewed_at)
VALUES
  ('3a4b9dc0-6b71-458d-a96a-10ee52c4897c', '2026-05-14', 'approved', true, 'remove_day', 'Optum', now()),
  ('3a4b9dc0-6b71-458d-a96a-10ee52c4897c', '2026-05-22', 'approved', true, 'remove_day', 'Optum', now())
ON CONFLICT DO NOTHING;
