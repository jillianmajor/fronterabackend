import type { MasterAvailabilityEntry, WeeklyShift } from '../interface';

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MASTER_AVAILABILITY_STATUSES = [
  'pending_review',
  'approved',
  'denied',
  'cancelled',
] as const;

/** UI-facing status labels for Master PTO Calendar (maps from DB enums). */
export const PTO_DISPLAY_STATUSES = [
  'not_submitted',
  'pending_approval',
  'approved',
  'denied',
] as const;

export const ALLOWED_MASTER_AVAILABILITY_COMPANIES = ['Frontera', '4tress'] as const;

/** Target month for liaison submission cards = first day of month + 2 from today. */
export function targetCollectionMonthStart(): string {
  const now = new Date();
  return formatIsoDate(new Date(now.getFullYear(), now.getMonth() + 2, 1));
}

export function toPtoDisplayStatus(
  status: string,
  source: 'time_off' | 'baseline',
): (typeof PTO_DISPLAY_STATUSES)[number] | string {
  if (source === 'baseline') return 'approved';
  switch (status) {
    case 'pending_review':
      return 'pending_approval';
    case 'approved':
    case 'denied':
      return status;
    case 'cancelled':
      return 'denied';
    default:
      return status;
  }
}

export function parseMonthYear(monthYear: string): { start: string; end: string; label: string } {
  const d = parseIsoDate(monthYear);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = formatIsoDate(new Date(year, month, 1));
  const end = formatIsoDate(new Date(year, month + 1, 0));
  const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { start, end, label };
}

export function defaultMonthYear(): string {
  const now = new Date();
  return formatIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekdayName(isoDate: string): string {
  return WEEKDAYS[parseIsoDate(isoDate).getDay()];
}

export function formatTimeFromDb(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const parts = value.trim().split(':');
  const hour = parseInt(parts[0] ?? '0', 10);
  const minute = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(hour)) return value;
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  const min = minute > 0 ? `:${String(minute).padStart(2, '0')}` : '';
  return `${h12}${min} ${period}`;
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const s = formatTimeFromDb(start);
  const e = formatTimeFromDb(end);
  if (s && e) return `${s} – ${e}`;
  return s ?? e;
}

export function timeAvailableForTimeOff(
  changeType: string,
  startTime: string | null,
  endTime: string | null,
): string | null {
  if (changeType === 'remove_day') {
    return 'Unavailable';
  }
  return formatTimeRange(startTime, endTime);
}

export function shiftsForWeekday(schedule: unknown, weekday: string): WeeklyShift[] {
  if (!Array.isArray(schedule)) return [];
  return schedule.filter(
    (s): s is WeeklyShift =>
      !!s &&
      typeof s === 'object' &&
      typeof (s as WeeklyShift).day === 'string' &&
      (s as WeeklyShift).day.toLowerCase() === weekday.toLowerCase(),
  );
}

export function formatShiftRange(shifts: WeeklyShift[]): string | null {
  if (shifts.length === 0) return null;
  const first = shifts[0];
  const start = first.startTime ?? (first as { start?: string }).start;
  const end = first.endTime ?? (first as { end?: string }).end;
  if (start && end) return `${start} – ${end}`;
  return start ?? end ?? null;
}

export function mergeWithSetScheduleBaseline(
  timeOffRows: MasterAvailabilityEntry[],
  setProviders: {
    providerUserId: string;
    providerName: string;
    liaisonName: string | null;
    specialty: string | null;
    region: string | null;
    scheduleType: string;
    weeklySchedule: unknown;
    facilityName?: string | null;
  }[],
  startDate: string,
  endDate: string,
): MasterAvailabilityEntry[] {
  const covered = new Set(timeOffRows.map((r) => `${r.providerUserId}:${r.date}`));
  const baseline: MasterAvailabilityEntry[] = [];

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  for (const provider of setProviders) {
    if (provider.scheduleType !== 'set') continue;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const date = formatIsoDate(d);
      const key = `${provider.providerUserId}:${date}`;
      if (covered.has(key)) continue;

      const dayName = weekdayName(date);
      const shifts = shiftsForWeekday(provider.weeklySchedule, dayName);
      if (shifts.length === 0) continue;

      baseline.push({
        requestId: null,
        providerUserId: provider.providerUserId,
        providerName: provider.providerName,
        liaisonName: provider.liaisonName,
        recruiterName: null,
        date,
        timeAvailable: formatShiftRange(shifts),
        status: 'approved',
        displayStatus: 'approved',
        specialty: provider.specialty,
        region: provider.region,
        facilityName: provider.facilityName ?? null,
        notes: null,
        changeType: null,
        createdAt: null,
        source: 'baseline',
      });
      covered.add(key);
    }
  }

  return [...timeOffRows, ...baseline];
}

export function sortAvailabilityEntries(
  a: MasterAvailabilityEntry,
  b: MasterAvailabilityEntry,
): number {
  const dateCmp = a.date.localeCompare(b.date);
  if (dateCmp !== 0) return dateCmp;
  return (a.providerName ?? '').localeCompare(b.providerName ?? '');
}

export function buildCalendarWeeks(
  monthYear: string,
  entries: MasterAvailabilityEntry[],
): {
  monthYear: string;
  monthLabel: string;
  weeks: {
    days: {
      date: string;
      weekday: string;
      dayOfMonth: number;
      inMonth: boolean;
      entries: MasterAvailabilityEntry[];
    }[];
  }[];
} {
  const { start, end, label } = parseMonthYear(monthYear);
  const byDate = new Map<string, MasterAvailabilityEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.providerName.localeCompare(b.providerName));
  }

  const monthStart = parseIsoDate(start);
  const monthEnd = parseIsoDate(end);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const gridEnd = new Date(monthEnd);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks: {
    days: {
      date: string;
      weekday: string;
      dayOfMonth: number;
      inMonth: boolean;
      entries: MasterAvailabilityEntry[];
    }[];
  }[] = [];

  let cursor = new Date(gridStart);
  let currentWeek: (typeof weeks)[0]['days'] = [];

  while (cursor <= gridEnd) {
    const date = formatIsoDate(cursor);
    const inMonth = cursor >= monthStart && cursor <= monthEnd;
    currentWeek.push({
      date,
      weekday: weekdayName(date),
      dayOfMonth: cursor.getDate(),
      inMonth,
      entries: inMonth ? (byDate.get(date) ?? []) : [],
    });
    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { monthYear: start, monthLabel: label, weeks };
}
