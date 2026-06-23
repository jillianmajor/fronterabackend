import { Inject, Injectable } from '@nestjs/common';
import { AppErrors } from '../../common/errors/app-errors';
import { Workbook } from 'exceljs';
import { TOKENS } from '../../config/tokens';
import type {
  IMasterAvailabilityRepository,
  MasterAvailabilityEntry,
  MasterAvailabilityFilters,
} from '../../repository/persistence/interface';
import {
  type MasterCalendarContext,
  scopeFiltersForCalendarContext,
} from '../../repository/persistence/utils/master-calendar-context.util';
import {
  ALLOWED_MASTER_AVAILABILITY_COMPANIES,
  buildCalendarWeeks,
  defaultMonthYear,
  mergeWithSetScheduleBaseline,
  parseMonthYear,
  sortAvailabilityEntries,
} from '../../repository/persistence/utils/master-availability.util';
import type {
  MasterAvailabilityAceImoExportQueryDto,
  MasterAvailabilityExportQueryDto,
  MasterAvailabilityQueryDto,
  MasterAvailabilityRegionExportQueryDto,
} from './dto/master-availability-query.dto';
import {
  buildAceImoExportWorkbook,
  buildEmptyRegionExportWorkbook,
  buildRegionExportWorkbooks,
} from '../../repository/persistence/utils/master-pto-export.util';

const EXPORT_MAX_ROWS = 10_000;

@Injectable()
export class MasterAvailabilityService {
  constructor(
    @Inject(TOKENS.MasterAvailabilityRepository)
    private readonly repository: IMasterAvailabilityRepository,
  ) {}

  getFilterOptions(company: string) {
    this.assertCompany(company);
    return this.repository.getFilterOptions(company);
  }

  getSubmissionProgress(company: string, monthYear?: string) {
    this.assertCompany(company);
    return this.repository.getSubmissionProgress(company, monthYear);
  }

  listPrnTable(query: MasterAvailabilityQueryDto) {
    return this.listTableForContext(query, 'prn');
  }

  listPtoTable(query: MasterAvailabilityQueryDto) {
    return this.listTableForContext(query, 'pto');
  }

  getPrnCalendar(query: MasterAvailabilityQueryDto) {
    return this.getCalendarForContext(query, 'prn');
  }

  getPtoCalendar(query: MasterAvailabilityQueryDto) {
    return this.getCalendarForContext(query, 'pto');
  }

  exportPrnExcel(query: MasterAvailabilityExportQueryDto): Promise<Buffer> {
    return this.exportExcelForContext(query, 'prn', {
      tableSheet: 'Master PRN Availability',
      calendarSheet: 'Master PRN Availability Calendar',
    });
  }

  exportPtoExcel(query: MasterAvailabilityExportQueryDto): Promise<Buffer> {
    return this.exportExcelForContext(query, 'pto', {
      tableSheet: 'Master PTO',
      calendarSheet: 'Master PTO Calendar',
    });
  }

  async exportRegionExcel(
    query: MasterAvailabilityRegionExportQueryDto,
  ): Promise<{ filename: string; buffer: Buffer }[]> {
    const filters = this.toFilters(query);
    const { start, end } = parseMonthYear(filters.monthYear);
    const [entries, providers] = await Promise.all([
      this.loadPtoClientExportEntries(filters, start, end),
      this.repository.listProvidersForClientExport(filters, start, end),
    ]);
    const regions = filters.regions ?? [];
    const results = await buildRegionExportWorkbooks({
      company: filters.company,
      monthYear: filters.monthYear,
      providers,
      entries,
      regions,
    });
    if (results.length === 0 && regions.length === 1) {
      return [
        await buildEmptyRegionExportWorkbook({
          company: filters.company,
          monthYear: filters.monthYear,
          region: regions[0]!,
        }),
      ];
    }
    return results;
  }

  async exportAceImoExcel(query: MasterAvailabilityAceImoExportQueryDto): Promise<Buffer> {
    const filters = this.toFilters(query);
    const { start, end } = parseMonthYear(filters.monthYear);
    const [entries, providers] = await Promise.all([
      this.loadPtoClientExportEntries(filters, start, end),
      this.repository.listProvidersForClientExport(filters, start, end),
    ]);
    const recruiterNames = query.recruiterIds?.length
      ? (
          await this.repository.getFilterOptions(filters.company)
        ).recruiters
          .filter((r) => query.recruiterIds!.includes(r.id))
          .map((r) => r.name)
      : undefined;

    return buildAceImoExportWorkbook({
      company: filters.company,
      monthYear: filters.monthYear,
      providers,
      entries,
      recruiterNames,
    });
  }

  private async listTableForContext(query: MasterAvailabilityQueryDto, context: MasterCalendarContext) {
    const filters = this.toFilters(query);
    const { start, end } = parseMonthYear(filters.monthYear);
    const all = await this.loadEntries(filters, start, end, context);
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const total = all.length;
    const offset = (page - 1) * pageSize;
    const items = all.slice(offset, offset + pageSize);

    return {
      items,
      page,
      pageSize,
      total,
      monthYear: start,
    };
  }

  private async getCalendarForContext(query: MasterAvailabilityQueryDto, context: MasterCalendarContext) {
    const filters = this.toFilters(query);
    const { start, end } = parseMonthYear(filters.monthYear);
    const entries = await this.loadEntries(filters, start, end, context);
    return buildCalendarWeeks(filters.monthYear, entries);
  }

  private async exportExcelForContext(
    query: MasterAvailabilityExportQueryDto,
    context: MasterCalendarContext,
    sheetNames: { tableSheet: string; calendarSheet: string },
  ): Promise<Buffer> {
    const filters = this.toFilters(query);
    const { start, end } = parseMonthYear(filters.monthYear);
    const entries = (await this.loadEntries(filters, start, end, context)).slice(0, EXPORT_MAX_ROWS);

    const workbook = new Workbook();

    if (query.view === 'calendar') {
      const sheet = workbook.addWorksheet(sheetNames.calendarSheet);
      sheet.columns = [
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Weekday', key: 'weekday', width: 12 },
        { header: 'Provider', key: 'providerName', width: 24 },
        { header: 'Liaison', key: 'liaisonName', width: 20 },
        { header: 'Time Available', key: 'timeAvailable', width: 22 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Specialty', key: 'specialty', width: 18 },
        { header: 'Clinic', key: 'clinic', width: 28 },
        { header: 'Region', key: 'region', width: 14 },
        { header: 'Notes', key: 'notes', width: 28 },
      ];
      sheet.getRow(1).font = { bold: true };
      const cal = buildCalendarWeeks(filters.monthYear, entries);
      for (const week of cal.weeks) {
        for (const day of week.days) {
          if (!day.inMonth) continue;
          for (const e of day.entries) {
            sheet.addRow({
              date: e.date,
              weekday: day.weekday,
              providerName: e.providerName,
              liaisonName: e.liaisonName ?? '',
              timeAvailable: e.timeAvailable ?? '',
              status: e.status,
              specialty: e.specialty ?? '',
              clinic: e.facilityName ?? '',
              region: e.region ?? '',
              notes: e.notes ?? '',
            });
          }
        }
      }
    } else {
      const sheet = workbook.addWorksheet(sheetNames.tableSheet);
      sheet.columns = [
        { header: 'Provider', key: 'providerName', width: 24 },
        { header: 'Liaison', key: 'liaisonName', width: 20 },
        { header: 'Date', key: 'date', width: 12 },
        { header: 'Time Available', key: 'timeAvailable', width: 22 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Specialty', key: 'specialty', width: 18 },
        { header: 'Clinic', key: 'clinic', width: 28 },
        { header: 'Region', key: 'region', width: 14 },
        { header: 'Notes', key: 'notes', width: 28 },
      ];
      sheet.getRow(1).font = { bold: true };
      for (const e of entries) {
        sheet.addRow({
          providerName: e.providerName,
          liaisonName: e.liaisonName ?? '',
          date: e.date,
          timeAvailable: e.timeAvailable ?? '',
          status: e.status,
          specialty: e.specialty ?? '',
          clinic: e.facilityName ?? '',
          region: e.region ?? '',
          notes: e.notes ?? '',
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** PTO region / ACE-IMO client exports — SET baseline + approved PTO time-off rows. */
  private loadPtoClientExportEntries(
    filters: MasterAvailabilityFilters,
    start: string,
    end: string,
  ): Promise<MasterAvailabilityEntry[]> {
    return this.loadEntries(filters, start, end, 'pto', { includeSetBaseline: true });
  }

  private async loadEntries(
    filters: MasterAvailabilityFilters,
    start: string,
    end: string,
    context: MasterCalendarContext,
    options: { includeSetBaseline?: boolean } = {},
  ): Promise<MasterAvailabilityEntry[]> {
    const scoped = scopeFiltersForCalendarContext(filters, context);
    const timeOffRows = await this.repository.listTimeOffEntries(scoped, start, end);

    let merged = timeOffRows;
    if (context === 'pto' && options.includeSetBaseline && this.shouldIncludeSetBaseline(filters)) {
      const setProviders = await this.repository.listSetProvidersForBaseline(filters);
      merged = mergeWithSetScheduleBaseline(timeOffRows, setProviders, start, end);
    }

    if (filters.displayStatuses?.length) {
      merged = merged.filter((e) => filters.displayStatuses!.includes(e.displayStatus));
    }

    return merged.sort(sortAvailabilityEntries);
  }

  private shouldIncludeSetBaseline(filters: MasterAvailabilityFilters): boolean {
    const displayStatuses = filters.displayStatuses ?? [];
    return (
      displayStatuses.length === 0 ||
      displayStatuses.includes('approved') ||
      (!filters.statuses?.length && !filters.status)
    );
  }

  private toFilters(query: MasterAvailabilityQueryDto): MasterAvailabilityFilters {
    this.assertCompany(query.company);
    const displayStatuses = queryDisplayStatuses(query);
    const statusesFromDisplay = mapDisplayStatusesToDb(displayStatuses);

    return {
      company: query.company,
      monthYear: query.monthYear ?? defaultMonthYear(),
      liaisonId: query.liaisonId,
      liaisonIds: query.liaisonIds,
      recruiterIds: query.recruiterIds,
      status: query.status,
      statuses: query.statuses?.length ? query.statuses : statusesFromDisplay,
      region: query.region,
      regions: query.regions,
      displayStatuses: query.displayStatuses,
      q: query.q,
    };
  }

  private assertCompany(company: string): void {
    if (!ALLOWED_MASTER_AVAILABILITY_COMPANIES.includes(company as never)) {
      throw AppErrors.invalidCompany(ALLOWED_MASTER_AVAILABILITY_COMPANIES);
    }
  }
}

function queryDisplayStatuses(query: MasterAvailabilityQueryDto): string[] {
  return query.displayStatuses ?? [];
}

function mapDisplayStatusesToDb(displayStatuses: string[]): string[] | undefined {
  if (displayStatuses.length === 0) return undefined;
  const mapped = new Set<string>();
  for (const s of displayStatuses) {
    if (s === 'pending_approval') mapped.add('pending_review');
    if (s === 'approved') mapped.add('approved');
    if (s === 'denied') {
      mapped.add('denied');
      mapped.add('cancelled');
    }
  }
  return mapped.size > 0 ? [...mapped] : undefined;
}
