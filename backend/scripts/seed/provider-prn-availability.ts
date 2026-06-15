/**
 * PRN monthly availability + add_day rows for provider portal GET testing (ADR 0009).
 */
import type { PoolClient } from 'pg';
import { formatIsoDate } from '../../src/repository/persistence/utils/master-availability.util';
import { submissionDeadlineForTargetMonth } from '../../src/repository/persistence/utils/schedule-change-approvals.util';
import { SEED } from './ids';

const { users, workSites, prnAvailability } = SEED;

/** First day of month two months ahead — stable future target for local curls. */
export function prnSeedTargetMonthStart(): string {
  const now = new Date();
  return formatIsoDate(new Date(now.getFullYear(), now.getMonth() + 2, 1));
}

export async function seedProviderPrnAvailabilityData(client: PoolClient): Promise<string> {
  const monthYear = prnSeedTargetMonthStart();
  const deadline = submissionDeadlineForTargetMonth(monthYear);
  const monthStart = new Date(monthYear);
  const day1 = formatIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 8));
  const day2 = formatIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 15));

  await client.query(
    `INSERT INTO public.monthly_availability_requests (
      id, provider_id, month_year, deadline, status, no_changes,
      submitted_at, submission_group_id
    ) VALUES (
      $1::uuid, $2::uuid, $3::date, $4::date, 'submitted', false,
      now(), $5::uuid
    )
    ON CONFLICT (provider_id, month_year) DO UPDATE SET
      deadline = EXCLUDED.deadline,
      status = EXCLUDED.status,
      no_changes = EXCLUDED.no_changes,
      submitted_at = EXCLUDED.submitted_at,
      submission_group_id = EXCLUDED.submission_group_id,
      updated_at = now()`,
    [
      prnAvailability.monthlyRequest,
      users.provider3,
      monthYear,
      deadline,
      prnAvailability.submissionGroup,
    ],
  );

  await client.query(
    `INSERT INTO public.time_off_requests (
      id, provider_id, recruiter_id, liaison_id, work_site_id, request_date,
      start_time, end_time, is_unavailable, change_type, status,
      client_name, specialty, notes, submission_group_id
    ) VALUES
      ($1::uuid, $2::uuid, $3::uuid, NULL, $4::uuid, $5::date,
       '08:00', '17:00', false, 'add_day', 'pending_review',
       'Optum', 'Hospitalist', 'Seed: PRN available Tue block', $6::uuid),
      ($7::uuid, $2::uuid, $3::uuid, NULL, $4::uuid, $8::date,
       '09:00', '15:00', false, 'add_day', 'pending_review',
       'Optum', 'Hospitalist', 'Seed: PRN available half day', $6::uuid)
    ON CONFLICT (id) DO UPDATE SET
      request_date = EXCLUDED.request_date,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      is_unavailable = EXCLUDED.is_unavailable,
      change_type = EXCLUDED.change_type,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      submission_group_id = EXCLUDED.submission_group_id,
      updated_at = now()`,
    [
      prnAvailability.day1,
      users.provider3,
      users.recruiter,
      workSites.phoenix,
      day1,
      prnAvailability.submissionGroup,
      prnAvailability.day2,
      day2,
    ],
  );

  return monthYear;
}
