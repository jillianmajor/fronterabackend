import type { WeeklyShiftDto } from './dto/weekly-shift.dto';
import { WEEKLY_SCHEDULE_PRESETS } from './onboarding-schedule-presets';

function normalizeScheduleText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bmonday\b/g, 'mon')
    .replace(/\btuesday\b/g, 'tue')
    .replace(/\bwednesday\b/g, 'wed')
    .replace(/\bthursday\b/g, 'thu')
    .replace(/\bfriday\b/g, 'fri')
    .replace(/\bsaturday\b/g, 'sat')
    .replace(/\bsunday\b/g, 'sun')
    .replace(/\bmon\b/g, 'mon')
    .replace(/\btue\b/g, 'tue')
    .replace(/\bwed\b/g, 'wed')
    .replace(/\bthu\b/g, 'thu')
    .replace(/\bfri\b/g, 'fri')
    .replace(/\bsat\b/g, 'sat')
    .replace(/\bsun\b/g, 'sun')
    .replace(/mon-fri/g, 'm-f')
    .replace(/mon - fri/g, 'm-f');
}

function normalizePresetLabel(label: string): string {
  return normalizeScheduleText(label);
}

/**
 * Map bulk spreadsheet `work_schedule` text to weekly shift rows.
 * PRN rows must omit schedule or use a PRN placeholder string.
 */
export function parseBulkWorkSchedule(
  scheduleType: 'set' | 'prn',
  workSchedule?: string | null,
): WeeklyShiftDto[] {
  if (scheduleType === 'prn') {
    return [];
  }

  const raw = (workSchedule ?? '').trim();
  if (!raw) {
    throw new Error('work_schedule is required for set schedule_type');
  }
  if (/prn/i.test(raw)) {
    throw new Error('work_schedule must not be a PRN placeholder for set schedule_type');
  }

  const normalized = normalizeScheduleText(raw);
  for (const preset of WEEKLY_SCHEDULE_PRESETS) {
    if (preset.id === 'clear') continue;
    if (normalizePresetLabel(preset.label) === normalized) {
      return preset.shifts.map((shift) => ({ ...shift }));
    }
  }

  throw new Error(
    `Unrecognized work_schedule "${raw}". Use a preset label such as "M-F 8a-5p" or "Tue/Wed/Thu/Sat 8a-5p".`,
  );
}
