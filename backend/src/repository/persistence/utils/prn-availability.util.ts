import type { PrnAvailabilityDayRow, PrnMonthlySubmissionRow } from '../interface';
import {
  formatIsoDate,
  parseIsoDate,
  parseMonthYear,
  timeAvailableForTimeOff,
  weekdayName,
} from './master-availability.util';

export const ALLOWED_PRN_AVAILABILITY_COMPANIES = ['Frontera', '4tress'] as const;

export const PRN_MONTHLY_STATUSES = ['requested', 'submitted', 'approved', 'denied'] as const;

export function mapPrnAvailabilityDay(r: {
  requestId: string;
  requestDate: string | Date;
  startTime: string | null;
  endTime: string | null;
  changeType: string;
  status: string;
  notes: string | null;
  providerUserId: string;
  providerName: string | null;
  liaisonName: string | null;
  profileRegion: string | null;
  primarySiteRegion: string | null;
  monthlyRequestId: string | null;
  monthlyStatus: string | null;
  pacrDocumentId: string | null;
}): PrnAvailabilityDayRow {
  const requestDate = String(r.requestDate);
  return {
    requestId: r.requestId,
    providerUserId: r.providerUserId,
    providerName: r.providerName ?? 'Unknown',
    liaisonName: r.liaisonName,
    region: r.profileRegion?.trim() || r.primarySiteRegion?.trim() || null,
    requestDate,
    monthYear: monthStartFromDate(requestDate),
    startTime: r.startTime,
    endTime: r.endTime,
    changeType: r.changeType,
    status: r.status,
    timeLabel: timeAvailableForTimeOff(r.changeType, r.startTime, r.endTime),
    providerNotes: r.notes,
    monthlyRequestId: r.monthlyRequestId,
    monthlyStatus: r.monthlyStatus,
    pacrDocumentId: r.pacrDocumentId,
    hasPacr: !!r.pacrDocumentId,
  };
}

export function monthStartFromDate(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Keep latest row per (provider, request_date). Input should be newest-first. */
export function dedupeLatestPrnDays(rows: PrnAvailabilityDayRow[]): PrnAvailabilityDayRow[] {
  const seen = new Set<string>();
  const out: PrnAvailabilityDayRow[] = [];
  for (const row of rows) {
    const key = `${row.providerUserId}:${row.requestDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export interface PrnAvailabilityQueueGroup {
  monthlyRequestId: string | null;
  providerUserId: string;
  providerName: string;
  liaisonName: string | null;
  monthYear: string;
  monthLabel: string;
  monthlyStatus: string;
  deadline: string | null;
  submittedAt: string | null;
  noChanges: boolean;
  dayCount: number;
  pendingDayCount: number;
  days: PrnAvailabilityDayRow[];
}

export function buildPrnQueueGroups(
  monthlyRows: PrnMonthlySubmissionRow[],
  dayRows: PrnAvailabilityDayRow[],
): PrnAvailabilityQueueGroup[] {
  const daysByProviderMonth = new Map<string, PrnAvailabilityDayRow[]>();
  for (const day of dayRows) {
    const key = `${day.providerUserId}:${day.monthYear}`;
    const list = daysByProviderMonth.get(key) ?? [];
    list.push(day);
    daysByProviderMonth.set(key, list);
  }

  const groupKeys = new Set<string>();
  const groups: PrnAvailabilityQueueGroup[] = [];

  for (const monthly of monthlyRows) {
    const key = `${monthly.providerUserId}:${monthly.monthYear}`;
    groupKeys.add(key);
    const days = (daysByProviderMonth.get(key) ?? []).sort((a, b) =>
      a.requestDate.localeCompare(b.requestDate),
    );
    const { label } = parseMonthYear(monthly.monthYear);
    groups.push({
      monthlyRequestId: monthly.monthlyRequestId,
      providerUserId: monthly.providerUserId,
      providerName: monthly.providerName,
      liaisonName: monthly.liaisonName,
      monthYear: monthly.monthYear,
      monthLabel: label,
      monthlyStatus: monthly.monthlyStatus,
      deadline: monthly.deadline,
      submittedAt: monthly.submittedAt,
      noChanges: monthly.noChanges,
      dayCount: days.length,
      pendingDayCount: days.filter((d) => d.status === 'pending_review').length,
      days,
    });
  }

  for (const [key, days] of daysByProviderMonth) {
    if (groupKeys.has(key)) continue;
    days.sort((a, b) => a.requestDate.localeCompare(b.requestDate));
    const first = days[0]!;
    const { label } = parseMonthYear(first.monthYear);
    groups.push({
      monthlyRequestId: first.monthlyRequestId,
      providerUserId: first.providerUserId,
      providerName: first.providerName,
      liaisonName: first.liaisonName,
      monthYear: first.monthYear,
      monthLabel: label,
      monthlyStatus: first.monthlyStatus ?? 'submitted',
      deadline: null,
      submittedAt: null,
      noChanges: false,
      dayCount: days.length,
      pendingDayCount: days.filter((d) => d.status === 'pending_review').length,
      days,
    });
  }

  groups.sort((a, b) => {
    const monthCmp = b.monthYear.localeCompare(a.monthYear);
    if (monthCmp !== 0) return monthCmp;
    return a.providerName.localeCompare(b.providerName);
  });

  return groups;
}

export function buildPrnAvailabilityCalendar(
  monthYear: string,
  rows: PrnAvailabilityDayRow[],
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
      entries: {
        requestId: string;
        providerUserId: string;
        providerName: string;
        status: string;
        monthlyStatus: string | null;
        changeType: string;
        timeLabel: string | null;
        isPending: boolean;
      }[];
      overflowCount: number;
    }[];
  }[];
} {
  const { start, end, label } = parseMonthYear(monthYear);
  const pendingCount = rows.filter((r) => r.status === 'pending_review').length;

  const byDate = new Map<string, PrnAvailabilityDayRow[]>();
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
      entries: {
        requestId: string;
        providerUserId: string;
        providerName: string;
        status: string;
        monthlyStatus: string | null;
        changeType: string;
        timeLabel: string | null;
        isPending: boolean;
      }[];
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
    const chips = dayRows.slice(0, MAX_CHIPS).map((r) => ({
      requestId: r.requestId,
      providerUserId: r.providerUserId,
      providerName: r.providerName,
      status: r.status,
      monthlyStatus: r.monthlyStatus,
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
