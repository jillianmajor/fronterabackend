import type { Borders, Cell, Style, Worksheet } from 'exceljs';
import { Workbook } from 'exceljs';
import type { MasterAvailabilityClientExportProvider, MasterAvailabilityEntry } from '../interface';
import {
  formatIsoDate,
  parseIsoDate,
  parseMonthYear,
  shiftsForWeekday,
  weekdayName,
} from './master-availability.util';

const DEFAULT_EXPORT_HOURS = '8:00 AM – 5:00 PM';
const WEEKDAY_INDICES = new Set([1, 2, 3, 4, 5]);
const CALENDAR_DAY_HEADERS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const BORDER = { style: 'thin', color: { argb: 'FF000000' } } as const;
const ALL_BORDERS: Partial<Borders> = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};
const GRAY = 'FFBFBFBF';

const monthCellStyle: Partial<Style> = {
  font: { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF000000' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  numFmt: 'mmmm yyyy',
};
const dayHeaderStyle: Partial<Style> = {
  font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
};
const dateCellStyle: Partial<Style> = {
  font: { name: 'Calibri', size: 18, bold: true, color: { argb: 'FF000000' } },
  alignment: { vertical: 'middle' },
  border: ALL_BORDERS,
};
const specialtyLabelStyle: Partial<Style> = {
  font: { name: 'Calibri', size: 12, color: { argb: 'FF000000' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } },
  border: ALL_BORDERS,
};
const scheduleCellStyle: Partial<Style> = {
  font: { name: 'Calibri', size: 11, color: { argb: 'FF000000' } },
  alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
  border: ALL_BORDERS,
};

function specialtyGmLabel(specialty: string | null): string {
  if (!specialty) return '';
  const lower = specialty.toLowerCase();
  if (lower.includes('nurse') || lower.includes('np')) return 'GM 1';
  if (lower.includes('physician') || lower.includes('pa')) return 'GM 2';
  return specialty;
}

function applyStyle(cell: Cell, style: Partial<Style>): void {
  cell.style = { ...cell.style, ...style };
}

function setCell(
  worksheet: Worksheet,
  row: number,
  column: number,
  value: string | number | Date,
  style: Partial<Style>,
): void {
  const cell = worksheet.getCell(row, column);
  cell.value = value;
  applyStyle(cell, style);
}

/** Compact hours for ACE/IMO template cells, e.g. "8:00 AM – 5:00 PM" → "8-5". */
export function compactExportHours(timeAvailable: string): string {
  const parts = timeAvailable.split('–').map((s) => s.trim());
  if (parts.length !== 2) return timeAvailable.replace(/\s+/g, '');

  const compact = (time: string): string => {
    const match = time.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
    if (!match) return time;
    const hour = match[1];
    const minutes = match[2];
    const suffix = minutes && minutes !== '00' ? `:${minutes}` : '';
    return `${hour}${suffix}`;
  };

  return `${compact(parts[0]!)}-${compact(parts[1]!)}`;
}

function uniqueCalendarProviders(
  providers: MasterAvailabilityClientExportProvider[],
): { name: string; specialty: string }[] {
  const seen = new Map<string, { name: string; specialty: string }>();
  for (const provider of providers) {
    if (seen.has(provider.providerUserId)) continue;
    seen.set(provider.providerUserId, {
      name: provider.providerName,
      specialty: provider.specialty?.trim() || 'Provider',
    });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function buildCalendarHoursMap(
  entries: MasterAvailabilityEntry[],
  providers: MasterAvailabilityClientExportProvider[],
  monthYear: string,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const entry of entries) {
    if (entry.status !== 'approved' && entry.source !== 'baseline') continue;
    if (entry.changeType === 'remove_day' || entry.timeAvailable === 'Unavailable') continue;
    if (!entry.timeAvailable?.trim()) continue;
    map.set(`${entry.providerName}|${entry.date}`, compactExportHours(entry.timeAvailable));
  }

  const { start, end } = parseMonthYear(monthYear);
  const rangeStart = parseIsoDate(start);
  const rangeEnd = parseIsoDate(end);

  for (const provider of providers) {
    if (provider.scheduleType !== 'set') continue;
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      const date = formatIsoDate(d);
      const key = `${provider.providerName}|${date}`;
      if (map.has(key)) continue;
      if (!WEEKDAY_INDICES.has(d.getDay())) continue;

      const hours = hoursForWeekday(provider.weeklySchedule, date);
      if (!hours) continue;
      map.set(key, compactExportHours(hours));
    }
  }

  return map;
}

function addCalendarScheduleSheet(
  workbook: Workbook,
  sheetName: string,
  monthYear: string,
  providers: { name: string; specialty: string }[],
  hoursByProviderDate: Map<string, string>,
): void {
  const monthStart = parseIsoDate(parseMonthYear(monthYear).start);
  const calYear = monthStart.getFullYear();
  const calMonth = monthStart.getMonth();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = monthStart.getDay();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));

  worksheet.columns = [
    { width: 20 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
  ];

  worksheet.mergeCells(1, 1, 1, 8);
  setCell(worksheet, 1, 1, monthStart, monthCellStyle);
  worksheet.getRow(1).height = 21;

  CALENDAR_DAY_HEADERS.forEach((day, index) => {
    setCell(worksheet, 2, index + 2, day, dayHeaderStyle);
  });
  worksheet.getRow(2).height = 21;

  const weeks: (number | null)[][] = [];
  let cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
    if (cells.length === 7) {
      weeks.push(cells);
      cells = [];
    }
  }
  if (cells.length > 0) {
    while (cells.length < 7) cells.push(null);
    weeks.push(cells);
  }

  let row = 3;
  for (const week of weeks) {
    week.forEach((day, index) => {
      if (day !== null) {
        setCell(worksheet, row, index + 2, day, dateCellStyle);
      } else {
        setCell(worksheet, row, index + 2, '', { border: ALL_BORDERS });
      }
    });
    worksheet.getRow(row).height = 21;
    row++;

    for (const provider of providers) {
      setCell(worksheet, row, 1, provider.specialty, specialtyLabelStyle);
      week.forEach((day, index) => {
        if (day === null) {
          setCell(worksheet, row, index + 2, '', { border: ALL_BORDERS });
          return;
        }
        const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hours = hoursByProviderDate.get(`${provider.name}|${iso}`);
        const value = hours ? `${provider.name} ${hours}` : '';
        setCell(worksheet, row, index + 2, value, scheduleCellStyle);
      });
      worksheet.getRow(row).height = 28;
      row++;
    }
  }
}

function approvedEntry(
  providerUserId: string,
  date: string,
  offByProviderDate: Map<string, MasterAvailabilityEntry>,
): MasterAvailabilityEntry | undefined {
  const entry = offByProviderDate.get(`${providerUserId}:${date}`);
  if (!entry || entry.status !== 'approved') return undefined;
  return entry;
}

function hoursForWeekday(weeklySchedule: unknown, date: string): string {
  const shifts = shiftsForWeekday(weeklySchedule, weekdayName(date));
  if (shifts.length === 0) return '';
  const first = shifts[0];
  const start = first.startTime ?? (first as { start?: string }).start;
  const end = first.endTime ?? (first as { end?: string }).end;
  if (start && end) return `${start} – ${end}`;
  return DEFAULT_EXPORT_HOURS;
}

function buildOffDayMap(entries: MasterAvailabilityEntry[]): Map<string, MasterAvailabilityEntry> {
  const map = new Map<string, MasterAvailabilityEntry>();
  for (const e of entries) {
    if (e.source !== 'time_off') continue;
    map.set(`${e.providerUserId}:${e.date}`, e);
  }
  return map;
}

function monthDays(start: string, end: string): string[] {
  const days: string[] = [];
  const s = parseIsoDate(start);
  const e = parseIsoDate(end);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    days.push(formatIsoDate(d));
  }
  return days;
}

function addFacilitySheet(
  workbook: Workbook,
  sheetName: string,
  providers: MasterAvailabilityClientExportProvider[],
  monthYear: string,
  offByProviderDate: Map<string, MasterAvailabilityEntry>,
): void {
  const { start, end } = parseMonthYear(monthYear);
  const days = monthDays(start, end);
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));
  const header = ['Provider', 'Specialty', ...days.map((d) => d.slice(5))];
  sheet.addRow(header);
  sheet.getRow(1).font = { bold: true };

  for (const provider of providers) {
    const row: (string | number)[] = [provider.providerName, specialtyGmLabel(provider.specialty)];
    for (const date of days) {
      const dow = parseIsoDate(date).getDay();
      if (!WEEKDAY_INDICES.has(dow)) {
        row.push('');
        continue;
      }

      const entry = approvedEntry(provider.providerUserId, date, offByProviderDate);
      if (entry?.changeType === 'remove_day' || entry?.timeAvailable === 'Unavailable') {
        row.push('');
        continue;
      }
      if (entry?.timeAvailable) {
        row.push(entry.timeAvailable);
        continue;
      }

      if (provider.scheduleType === 'set') {
        const hours = hoursForWeekday(provider.weeklySchedule, date);
        row.push(hours || DEFAULT_EXPORT_HOURS);
      } else {
        row.push('');
      }
    }
    sheet.addRow(row);
  }
}

export async function buildRegionExportWorkbooks(params: {
  company: string;
  monthYear: string;
  providers: MasterAvailabilityClientExportProvider[];
  entries: MasterAvailabilityEntry[];
  regions: string[];
}): Promise<{ filename: string; buffer: Buffer }[]> {
  const offByProviderDate = buildOffDayMap(params.entries);
  const regionSet = new Set(params.regions);
  const byRegion = new Map<string, Map<string, MasterAvailabilityClientExportProvider[]>>();

  for (const p of params.providers) {
    const region = p.region ?? 'Unassigned';
    if (regionSet.size > 0 && !regionSet.has(region)) continue;
    if (params.company === '4tress' && region === 'Chaperone') continue;

    const facilities = byRegion.get(region) ?? new Map();
    const list = facilities.get(p.facilityName) ?? [];
    list.push(p);
    facilities.set(p.facilityName, list);
    byRegion.set(region, facilities);
  }

  const { label } = parseMonthYear(params.monthYear);
  const outputs: { filename: string; buffer: Buffer }[] = [];

  for (const [region, facilities] of byRegion) {
    const workbook = new Workbook();
    for (const [facilityName, facilityProviders] of facilities) {
      addFacilitySheet(workbook, facilityName, facilityProviders, params.monthYear, offByProviderDate);
    }
    if (workbook.worksheets.length === 0) continue;

    const filename =
      region === 'Chaperone'
        ? `Chaperone - Frontera - ${label}.xlsx`
        : `Region ${region} - ${params.company} - ${label}.xlsx`;
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    outputs.push({ filename, buffer });
  }

  return outputs;
}

export async function buildEmptyRegionExportWorkbook(params: {
  company: string;
  monthYear: string;
  region: string;
}): Promise<{ filename: string; buffer: Buffer }> {
  const { label } = parseMonthYear(params.monthYear);
  const workbook = new Workbook();
  workbook.addWorksheet('No providers');
  const filename =
    params.region === 'Chaperone'
      ? `Chaperone - Frontera - ${label}.xlsx`
      : `Region ${params.region} - ${params.company} - ${label}.xlsx`;
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { filename, buffer };
}

const CANONICAL_RECRUITERS = [
  'Amy Guy',
  'Audrey Williams',
  'Clint Robinson',
  'Gray Rodgers',
  'Richard Montgomery',
] as const;

export async function buildAceImoExportWorkbook(params: {
  company: string;
  monthYear: string;
  providers: MasterAvailabilityClientExportProvider[];
  entries: MasterAvailabilityEntry[];
  recruiterNames?: string[];
}): Promise<Buffer> {
  const recruiterFilter = new Set(params.recruiterNames ?? []);
  const workbook = new Workbook();
  const { label } = parseMonthYear(params.monthYear);
  const hoursByProviderDate = buildCalendarHoursMap(
    params.entries,
    params.providers,
    params.monthYear,
  );

  for (const recruiterName of CANONICAL_RECRUITERS) {
    if (recruiterFilter.size > 0 && !recruiterFilter.has(recruiterName)) continue;
    const recruiterProviders = params.providers.filter(
      (p) => (p.recruiterName ?? '').trim() === recruiterName,
    );
    if (recruiterProviders.length === 0) continue;

    addCalendarScheduleSheet(
      workbook,
      recruiterName,
      params.monthYear,
      uniqueCalendarProviders(recruiterProviders),
      hoursByProviderDate,
    );
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet('Empty');
  }

  workbook.creator = `${params.company} ACE/IMO ${label}`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
