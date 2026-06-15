import { DomainError } from '../../common/errors/exception';
import { ErrorCode } from '../../common/errors/error-codes';
import type { WeeklyShiftDto } from './dto/weekly-shift.dto';

function scheduleValidation(message: string): DomainError {
  return new DomainError(ErrorCode.SCHEDULE_VALIDATION, message);
}

export function parseClockTimeToMinutes(time: string): number {
  const t = time.trim();
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let hours = Number.parseInt(m12[1], 10);
    const minutes = Number.parseInt(m12[2], 10);
    const meridiem = m12[3].toUpperCase();
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    return Number.parseInt(m24[1], 10) * 60 + Number.parseInt(m24[2], 10);
  }
  throw scheduleValidation(`Invalid time format: "${time}"`);
}

function normalizeDay(day: string): string {
  return day.trim().toLowerCase();
}

function intervalsOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function toIntervals(
  shifts: WeeklyShiftDto[],
  context: string,
): Map<string, { start: number; end: number }[]> {
  const byDay = new Map<string, { start: number; end: number }[]>();
  for (const shift of shifts) {
    let start: number;
    let end: number;
    try {
      start = parseClockTimeToMinutes(shift.startTime);
      end = parseClockTimeToMinutes(shift.endTime);
    } catch (err) {
      const msg = err instanceof DomainError ? err.message : 'Invalid time';
      throw scheduleValidation(`${context}: ${msg}`);
    }
    if (end <= start) {
      throw scheduleValidation(`${context}: endTime must be after startTime on ${shift.day}`);
    }
    const day = normalizeDay(shift.day);
    const list = byDay.get(day) ?? [];
    list.push({ start, end });
    byDay.set(day, list);
  }
  return byDay;
}

export function findOverlapWithinSchedule(
  shifts: WeeklyShiftDto[],
  context: string,
): string | null {
  if (shifts.length < 2) return null;
  const byDay = toIntervals(shifts, context);
  for (const [day, intervals] of byDay) {
    intervals.sort((a, b) => a.start - b.start);
    for (let i = 0; i < intervals.length; i++) {
      for (let j = i + 1; j < intervals.length; j++) {
        if (
          intervalsOverlap(
            intervals[i].start,
            intervals[i].end,
            intervals[j].start,
            intervals[j].end,
          )
        ) {
          return `${context}: overlapping shifts on ${day}`;
        }
      }
    }
  }
  return null;
}

export function findOverlapBetweenSchedules(
  a: WeeklyShiftDto[],
  b: WeeklyShiftDto[],
): string | null {
  if (!a.length || !b.length) return null;
  const mapA = toIntervals(a, 'schedule A');
  const mapB = toIntervals(b, 'schedule B');
  for (const [day, intervalsA] of mapA) {
    const intervalsB = mapB.get(day);
    if (!intervalsB) continue;
    for (const ia of intervalsA) {
      for (const ib of intervalsB) {
        if (intervalsOverlap(ia.start, ia.end, ib.start, ib.end)) {
          return day;
        }
      }
    }
  }
  return null;
}

export interface WorkSiteScheduleInput {
  facility: string;
  weeklySchedule?: WeeklyShiftDto[];
}

export function validateOnboardingWeeklySchedules(params: {
  scheduleType: 'set' | 'prn';
  defaultWeeklySchedule?: WeeklyShiftDto[];
  workSites: WorkSiteScheduleInput[];
}): void {
  if (params.scheduleType === 'prn') {
    if ((params.defaultWeeklySchedule?.length ?? 0) > 0) {
      throw scheduleValidation(
        'PRN providers cannot have defaultWeeklySchedule; submit availability monthly instead',
      );
    }
    for (const site of params.workSites) {
      if ((site.weeklySchedule?.length ?? 0) > 0) {
        throw scheduleValidation(
          `PRN providers cannot have weeklySchedule on work site "${site.facility}"`,
        );
      }
    }
    return;
  }

  const defaultSchedule = params.defaultWeeklySchedule ?? [];
  const effectiveBySite: { facility: string; shifts: WeeklyShiftDto[] }[] = [];

  for (const site of params.workSites) {
    const siteSchedule = site.weeklySchedule;
    const hasExplicitSiteSchedule = siteSchedule !== undefined && siteSchedule !== null;

    if (hasExplicitSiteSchedule && siteSchedule.length > 0) {
      const within = findOverlapWithinSchedule(
        siteSchedule,
        `Work site "${site.facility}" weeklySchedule`,
      );
      if (within) throw scheduleValidation(within);

      if (defaultSchedule.length > 0) {
        const day = findOverlapBetweenSchedules(siteSchedule, defaultSchedule);
        if (day) {
          throw scheduleValidation(
            `Work site "${site.facility}": weeklySchedule overlaps with defaultWeeklySchedule on ${day}`,
          );
        }
      }
      effectiveBySite.push({ facility: site.facility, shifts: siteSchedule });
    } else if (!hasExplicitSiteSchedule && defaultSchedule.length > 0) {
      effectiveBySite.push({ facility: site.facility, shifts: defaultSchedule });
    }
  }

  if (defaultSchedule.length > 0) {
    const withinDefault = findOverlapWithinSchedule(defaultSchedule, 'defaultWeeklySchedule');
    if (withinDefault) throw scheduleValidation(withinDefault);
  }

  for (let i = 0; i < effectiveBySite.length; i++) {
    for (let j = i + 1; j < effectiveBySite.length; j++) {
      const a = effectiveBySite[i];
      const b = effectiveBySite[j];
      if (!a.shifts.length || !b.shifts.length) continue;
      const day = findOverlapBetweenSchedules(a.shifts, b.shifts);
      if (day) {
        throw scheduleValidation(
          `Work sites "${a.facility}" and "${b.facility}" have overlapping schedules on ${day}`,
        );
      }
    }
  }
}
