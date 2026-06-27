import type { Borders, Cell, Style, Worksheet } from 'exceljs';
import { Workbook } from 'exceljs';
import type {
  ClientScheduleRow,
  MasterAvailabilityClientExportProvider,
  MasterAvailabilityEntry,
} from '../interface';
import { regionExportFilename } from './export-filename.util';
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


/** Tab name for facility sheets, e.g. "Denver, CO". */
export function facilityExportTabName(
  facilityName: string,
  city?: string | null,
  state?: string | null,
): string {
  if (city?.trim() && state?.trim()) return `${city.trim()}, ${state.trim()}`;
  if (city?.trim()) return city.trim();
  return facilityName;
}

function sanitizeWorksheetName(name: string, usedNames: Set<string>): string {
  const base = (name.replace(/[\/?*[\]:]/g, '').trim() || 'Schedule').slice(0, 31);
  let candidate = base;
  let suffix = 1;
  while (usedNames.has(candidate)) {
    const ending = ` ${suffix++}`;
    candidate = `${base.slice(0, 31 - ending.length)}${ending}`;
  }
  usedNames.add(candidate);
  return candidate;
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
  return [...seen.values()];
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

function buildClientScheduleHoursMap(rows: ClientScheduleRow[], monthYear: string): Map<string, string> {
  const map = new Map<string, string>();
  const { start, end } = parseMonthYear(monthYear);
  const rangeStart = parseIsoDate(start);
  const rangeEnd = parseIsoDate(end);
  const timeOffByProvider = new Map(rows.map((r) => [r.providerUserId, new Set(r.timeOffDates)]));

  for (const row of rows) {
    const providerName = row.fullName?.trim() || 'Unknown';
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const date = formatIsoDate(d);
      if (timeOffByProvider.get(row.providerUserId)?.has(date)) continue;
      const hours = hoursForWeekday(row.weeklySchedule, date);
      if (!hours) continue;
      map.set(`${providerName}|${date}`, compactExportHours(hours));
    }
  }

  return map;
}

function uniqueClientCalendarProviders(
  rows: ClientScheduleRow[],
): { name: string; specialty: string }[] {
  const seen = new Map<string, { name: string; specialty: string }>();
  for (const row of rows) {
    const name = row.fullName?.trim() || 'Unknown';
    if (seen.has(name)) continue;
    seen.set(name, { name, specialty: row.specialty?.trim() || 'Provider' });
  }
  return [...seen.values()];
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

export async function buildRegionExportWorkbooks(params: {
  company: string;
  monthYear: string;
  providers: MasterAvailabilityClientExportProvider[];
  entries: MasterAvailabilityEntry[];
  regions: string[];
}): Promise<{ filename: string; buffer: Buffer }[]> {
  const hoursByProviderDate = buildCalendarHoursMap(
    params.entries,
    params.providers,
    params.monthYear,
  );
  const regionSet = new Set(params.regions);
  const byRegion = new Map<string, Map<string, MasterAvailabilityClientExportProvider[]>>();

  for (const p of params.providers) {
    const region = p.region ?? 'Unassigned';
    if (regionSet.size > 0 && !regionSet.has(region)) continue;
    if (params.company === '4tress' && region === 'Chaperone') continue;

    const tabName = facilityExportTabName(p.facilityName, p.city, p.state);
    const facilities = byRegion.get(region) ?? new Map();
    const list = facilities.get(tabName) ?? [];
    list.push(p);
    facilities.set(tabName, list);
    byRegion.set(region, facilities);
  }

  const outputs: { filename: string; buffer: Buffer }[] = [];

  for (const [region, facilities] of byRegion) {
    const workbook = new Workbook();
    const usedSheetNames = new Set<string>();
    for (const [tabName, facilityProviders] of facilities) {
      const sheetName = sanitizeWorksheetName(tabName, usedSheetNames);
      addCalendarScheduleSheet(
        workbook,
        sheetName,
        params.monthYear,
        uniqueCalendarProviders(facilityProviders),
        hoursByProviderDate,
      );
    }
    if (workbook.worksheets.length === 0) continue;

    workbook.creator = `${params.company} ${region}`;
    const filename = regionExportFilename(region, params.company, params.monthYear);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    outputs.push({ filename, buffer });
  }

  return outputs;
}

export async function buildClientSchedulesRegionExport(params: {
  monthYear: string;
  region: string;
  rows: ClientScheduleRow[];
}): Promise<{ filename: string; buffer: Buffer }> {
  const scoped = params.rows.filter((row) => row.region === params.region);
  if (scoped.length === 0) {
    return buildEmptyRegionExportWorkbook({
      company: 'Frontera',
      monthYear: params.monthYear,
      region: params.region,
    });
  }

  const hoursByProviderDate = buildClientScheduleHoursMap(scoped, params.monthYear);
  const byFacility = new Map<string, ClientScheduleRow[]>();
  for (const row of scoped) {
    const tabName = facilityExportTabName(row.site.facilityName, row.site.city, row.site.state);
    const list = byFacility.get(tabName) ?? [];
    list.push(row);
    byFacility.set(tabName, list);
  }

  const workbook = new Workbook();
  const usedSheetNames = new Set<string>();
  for (const [tabName, facilityRows] of byFacility) {
    const sheetName = sanitizeWorksheetName(tabName, usedSheetNames);
    addCalendarScheduleSheet(
      workbook,
      sheetName,
      params.monthYear,
      uniqueClientCalendarProviders(facilityRows),
      hoursByProviderDate,
    );
  }

  workbook.creator = `Frontera ${params.region}`;
  const filename = regionExportFilename(params.region, 'Frontera', params.monthYear);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { filename, buffer };
}

export async function buildEmptyRegionExportWorkbook(params: {
  company: string;
  monthYear: string;
  region: string;
}): Promise<{ filename: string; buffer: Buffer }> {
  const workbook = new Workbook();
  workbook.addWorksheet('No providers');
  const filename = regionExportFilename(params.region, params.company, params.monthYear);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { filename, buffer };
}

const ACE_IMO_RECRUITERS = [
  'Gray Rodgers',
  'Audrey Williams',
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

  for (const recruiterName of ACE_IMO_RECRUITERS) {
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
