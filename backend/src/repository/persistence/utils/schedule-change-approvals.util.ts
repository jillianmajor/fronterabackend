import type { ScheduleChangeRequestRow, WeeklyShift } from '../interface';
import {
  formatIsoDate,
  formatTimeRange,
  parseIsoDate,
  parseMonthYear,
  shiftsForWeekday,
  timeAvailableForTimeOff,
  weekdayName,
} from './master-availability.util';

export const ALLOWED_SCHEDULE_CHANGE_COMPANIES = ['Frontera', '4tress'] as const;

/** Last Tuesday of month (M−2) is the submission deadline for target month M. */
export function submissionDeadlineForTargetMonth(targetMonthStart: string): string {
  const target = parseIsoDate(targetMonthStart);
  const deadlineMonth = new Date(target.getFullYear(), target.getMonth() - 2, 1);
  const year = deadlineMonth.getFullYear();
  const month = deadlineMonth.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  while (lastDay.getDay() !== 2) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return formatIsoDate(lastDay);
}

export function isPastSubmissionDeadline(requestDateIso: string): boolean {
  const d = parseIsoDate(requestDateIso);
  const monthStart = formatIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  const deadline = submissionDeadlineForTargetMonth(monthStart);
  const today = formatIsoDate(new Date());
  return today > deadline;
}

export function monthStartFromDate(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function countScheduledWorkdaysInRange(
  weeklySchedule: unknown,
  startDate: string,
  endDate: string,
): number {
  let count = 0;
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayName = weekdayName(formatIsoDate(d));
    if (shiftsForWeekday(weeklySchedule, dayName).length > 0) {
      count++;
    }
  }
  return count;
}

/** Days counted as "off" toward the >50% warning (remove_day / full unavailable). */
export function countRequestedOffDays(
  rows: ScheduleChangeRequestRow[],
  monthStart: string,
  monthEnd: string,
): number {
  const { start, end } = { start: monthStart, end: monthEnd };
  return rows.filter((r) => {
    if (r.requestDate < start || r.requestDate > end) return false;
    if (r.status === 'cancelled' || r.status === 'denied') return false;
    return r.changeType === 'remove_day' || r.isUnavailable;
  }).length;
}

export function computeScheduleOverloadWarning(
  monthRows: ScheduleChangeRequestRow[],
  weeklySchedule: unknown,
  monthStart: string,
): {
  requestedOffDays: number;
  scheduledWorkdays: number;
  percent: number;
} | null {
  const { end } = parseMonthYear(monthStart);
  const scheduled = countScheduledWorkdaysInRange(weeklySchedule, monthStart, end);
  if (scheduled === 0) return null;
  const off = countRequestedOffDays(monthRows, monthStart, end);
  const percent = off / scheduled;
  if (percent <= 0.5) return null;
  return {
    requestedOffDays: off,
    scheduledWorkdays: scheduled,
    percent: Math.round(percent * 100),
  };
}

/** Keep only the latest row per (provider, request_date). Input should be newest-first. */
export function dedupeLatestPerProviderDate(
  rows: ScheduleChangeRequestRow[],
): ScheduleChangeRequestRow[] {
  const seen = new Set<string>();
  const out: ScheduleChangeRequestRow[] = [];
  for (const row of rows) {
    const key = `${row.providerUserId}:${row.requestDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export interface ScheduleChangeProviderMonthGroup {
  providerUserId: string;
  providerName: string;
  liaisonName: string | null;
  monthYear: string;
  monthLabel: string;
  dayCount: number;
  pendingCount: number;
  scheduleOverloadWarning: {
    requestedOffDays: number;
    scheduledWorkdays: number;
    percent: number;
    label: string;
  } | null;
  days: ScheduleChangeRequestRow[];
}

export function buildProviderMonthGroups(
  rows: ScheduleChangeRequestRow[],
  weeklyScheduleByProvider: Map<string, unknown>,
): ScheduleChangeProviderMonthGroup[] {
  const byGroup = new Map<string, ScheduleChangeRequestRow[]>();

  for (const row of rows) {
    const monthStart = monthStartFromDate(row.requestDate);
    const key = `${row.providerUserId}:${monthStart}`;
    const list = byGroup.get(key) ?? [];
    list.push(row);
    byGroup.set(key, list);
  }

  const groups: ScheduleChangeProviderMonthGroup[] = [];

  for (const [, monthRows] of byGroup) {
    monthRows.sort((a, b) => a.requestDate.localeCompare(b.requestDate));
    const first = monthRows[0]!;
    const monthStart = monthStartFromDate(first.requestDate);
    const { label } = parseMonthYear(monthStart);
    const pendingCount = monthRows.filter((r) => r.status === 'pending_review').length;
    const weeklySchedule = weeklyScheduleByProvider.get(first.providerUserId);
    const warning = weeklySchedule
      ? computeScheduleOverloadWarning(monthRows, weeklySchedule, monthStart)
      : null;

    groups.push({
      providerUserId: first.providerUserId,
      providerName: first.providerName,
      liaisonName: first.liaisonName,
      monthYear: monthStart,
      monthLabel: label,
      dayCount: monthRows.length,
      pendingCount,
      scheduleOverloadWarning: warning
        ? {
            ...warning,
            label: `${warning.requestedOffDays} of ~${warning.scheduledWorkdays} workdays`,
          }
        : null,
      days: monthRows,
    });
  }

  groups.sort((a, b) => {
    const monthCmp = b.monthYear.localeCompare(a.monthYear);
    if (monthCmp !== 0) return monthCmp;
    return a.providerName.localeCompare(b.providerName);
  });

  return groups;
}

export interface ScheduleChangeCalendarChip {
  requestId: string;
  providerUserId: string;
  providerName: string;
  status: string;
  changeType: string;
  timeLabel: string | null;
  isPending: boolean;
}

export function buildScheduleChangeCalendarWeeks(
  monthYear: string,
  rows: ScheduleChangeRequestRow[],
): {
  monthYear: string;
  monthLabel: string;
  pendingCount: number;
  weeks: {
    days: {
      date: string;
      weekday: string;
      dayOfMonth: number;
      inMonth: boolean;
      entries: ScheduleChangeCalendarChip[];
      overflowCount: number;
    }[];
  }[];
} {
  const { start, end, label } = parseMonthYear(monthYear);
  const pendingCount = rows.filter((r) => r.status === 'pending_review').length;

  const byDate = new Map<string, ScheduleChangeRequestRow[]>();
  for (const r of rows) {
    if (r.requestDate < start || r.requestDate > end) continue;
    const list = byDate.get(r.requestDate) ?? [];
    list.push(r);
    byDate.set(r.requestDate, list);
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
      entries: ScheduleChangeCalendarChip[];
      overflowCount: number;
    }[];
  }[] = [];

  const MAX_CHIPS = 4;
  let cursor = new Date(gridStart);
  let currentWeek: (typeof weeks)[0]['days'] = [];

  while (cursor <= gridEnd) {
    const date = formatIsoDate(cursor);
    const inMonth = cursor >= monthStart && cursor <= monthEnd;
    const dayRows = inMonth ? (byDate.get(date) ?? []) : [];
    const chips: ScheduleChangeCalendarChip[] = dayRows.slice(0, MAX_CHIPS).map((r) => ({
      requestId: r.requestId,
      providerUserId: r.providerUserId,
      providerName: r.providerName,
      status: r.status,
      changeType: r.changeType,
      timeLabel: r.timeLabel,
      isPending: r.status === 'pending_review',
    }));

    currentWeek.push({
      date,
      weekday: weekdayName(date),
      dayOfMonth: cursor.getDate(),
      inMonth,
      entries: chips,
      overflowCount: Math.max(0, dayRows.length - MAX_CHIPS),
    });

    if (currentWeek.length === 7) {
      weeks.push({ days: currentWeek });
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return { monthYear: start, monthLabel: label, pendingCount, weeks };
}

export function mapRowToScheduleChangeRequest(
  r: {
    requestId: string;
    requestDate: string | Date;
    startTime: string | null;
    endTime: string | null;
    isUnavailable: boolean;
    changeType: string;
    status: string;
    notes: string | null;
    reviewNotes: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    pacrDocumentId: string | null;
    createdAt: Date;
    providerUserId: string;
    providerName: string | null;
    providerEmail: string | null;
    liaisonId: string | null;
    liaisonName: string | null;
    profileRegion: string | null;
    primarySiteRegion: string | null;
    weeklySchedule: unknown;
  },
): ScheduleChangeRequestRow {
  const requestDate = String(r.requestDate);
  return {
    requestId: r.requestId,
    providerUserId: r.providerUserId,
    providerName: r.providerName ?? 'Unknown',
    providerEmail: r.providerEmail,
    liaisonId: r.liaisonId,
    liaisonName: r.liaisonName,
    region: r.profileRegion?.trim() || r.primarySiteRegion?.trim() || null,
    requestDate,
    startTime: r.startTime,
    endTime: r.endTime,
    isUnavailable: r.isUnavailable,
    changeType: r.changeType,
    status: r.status,
    providerNotes: r.notes,
    reviewNotes: r.reviewNotes,
    reviewedBy: r.reviewedBy,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    pacrDocumentId: r.pacrDocumentId,
    hasPacr: !!r.pacrDocumentId,
    isPastDeadline: isPastSubmissionDeadline(requestDate),
    timeLabel: timeAvailableForTimeOff(r.changeType, r.startTime, r.endTime),
    createdAt: r.createdAt,
    weeklySchedule: r.weeklySchedule,
  };
}
