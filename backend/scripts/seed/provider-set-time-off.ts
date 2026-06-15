/**
 * SET schedule monthly submission + time-off rows for provider portal GET testing.
 */
import type { PoolClient } from 'pg';
import { formatIsoDate } from '../../src/repository/persistence/utils/master-availability.util';
import { submissionDeadlineForTargetMonth } from '../../src/repository/persistence/utils/schedule-change-approvals.util';
import { SEED } from './ids';
import { prnSeedTargetMonthStart } from './provider-prn-availability';

const { users, workSites, setTimeOff } = SEED;

export async function seedProviderSetTimeOffData(client: PoolClient): Promise<string> {
  const monthYear = prnSeedTargetMonthStart();
  const deadline = submissionDeadlineForTargetMonth(monthYear);
  const monthStart = new Date(monthYear);
  const offDay = formatIsoDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), 10));

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
    [setTimeOff.monthlyRequest, users.provider1, monthYear, deadline, setTimeOff.submissionGroup],
  );

  await client.query(
    `INSERT INTO public.time_off_requests (
      id, provider_id, recruiter_id, liaison_id, work_site_id, request_date,
      start_time, end_time, is_unavailable, change_type, status,
      client_name, specialty, notes, submission_group_id
    ) VALUES (
      $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::date,
      NULL, NULL, true, 'remove_day', 'pending_review',
      'Optum', 'Family Medicine', 'Seed: SET day off', $7::uuid
    )
    ON CONFLICT (id) DO UPDATE SET
      request_date = EXCLUDED.request_date,
      change_type = EXCLUDED.change_type,
      is_unavailable = EXCLUDED.is_unavailable,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      submission_group_id = EXCLUDED.submission_group_id,
      updated_at = now()`,
    [
      setTimeOff.day1,
      users.provider1,
      users.recruiterAmy,
      users.liaisonAnthony,
      workSites.dallas,
      offDay,
      setTimeOff.submissionGroup,
    ],
  );

  return monthYear;
}
