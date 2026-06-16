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

function specialtyGmLabel(specialty: string | null): string {
  if (!specialty) return '';
  const lower = specialty.toLowerCase();
  if (lower.includes('nurse') || lower.includes('np')) return 'GM 1';
  if (lower.includes('physician') || lower.includes('pa')) return 'GM 2';
  return specialty;
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
  const offByProviderDate = buildOffDayMap(params.entries);
  const recruiterFilter = new Set(params.recruiterNames ?? []);
  const workbook = new Workbook();
  const { label } = parseMonthYear(params.monthYear);

  for (const recruiterName of CANONICAL_RECRUITERS) {
    if (recruiterFilter.size > 0 && !recruiterFilter.has(recruiterName)) continue;
    const recruiterProviders = params.providers.filter(
      (p) => (p.recruiterName ?? '').trim() === recruiterName,
    );
    if (recruiterProviders.length === 0) continue;

    const byFacility = new Map<string, MasterAvailabilityClientExportProvider[]>();
    for (const p of recruiterProviders) {
      const list = byFacility.get(p.facilityName) ?? [];
      list.push(p);
      byFacility.set(p.facilityName, list);
    }

    for (const [facilityName, facilityProviders] of byFacility) {
      addFacilitySheet(
        workbook,
        `${recruiterName} - ${facilityName}`.slice(0, 31),
        facilityProviders,
        params.monthYear,
        offByProviderDate,
      );
    }
  }

  if (workbook.worksheets.length === 0) {
    workbook.addWorksheet('Empty');
  }

  workbook.creator = `${params.company} ACE/IMO ${label}`;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
