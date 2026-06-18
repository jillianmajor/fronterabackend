import { Inject, Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { TOKENS } from '../../config/tokens';
import type {
  ActiveProviderFilterOptions,
  ActiveProviderFilters,
  IProvidersRepository,
} from '../../repository/persistence/interface';
import type { ListActiveProvidersQueryDto } from './dto/list-active-providers-query.dto';

const EXPORT_MAX_ROWS = 10_000;

@Injectable()
export class ProvidersService {
  constructor(
    @Inject(TOKENS.ProvidersRepository)
    private readonly providersRepository: IProvidersRepository,
  ) {}

  async listActiveProviders(query: ListActiveProvidersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = Math.min(query.pageSize ?? 25, 100);
    const filters = this.toFilters(query);

    const [items, total] = await Promise.all([
      this.providersRepository.listActiveProviders(filters, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      this.providersRepository.countActiveProviders(filters),
    ]);

    return { items, page, pageSize, total };
  }

  getFilterOptions(): Promise<ActiveProviderFilterOptions> {
    return this.providersRepository.getActiveProviderFilterOptions();
  }

  async exportActiveProvidersExcel(query: ListActiveProvidersQueryDto): Promise<Buffer> {
    const filters = this.toFilters(query);
    const items = await this.providersRepository.listActiveProviders(filters, {
      limit: EXPORT_MAX_ROWS,
      offset: 0,
    });

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Active Providers');
    sheet.columns = [
      { header: 'Provider Name', key: 'fullName', width: 24 },
      { header: 'Provider Email', key: 'email', width: 28 },
      { header: 'Schedule', key: 'scheduleSummary', width: 32 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Specialty', key: 'specialty', width: 20 },
      { header: 'State', key: 'state', width: 8 },
      { header: 'PRN / SET', key: 'scheduleType', width: 10 },
      { header: 'Type', key: 'employmentType', width: 10 },
      { header: 'Work Sites', key: 'workSites', width: 36 },
      { header: 'Recruiter', key: 'recruiterName', width: 20 },
      { header: 'Provider Liaison', key: 'liaisonName', width: 20 },
    ];
    sheet.getRow(1).font = { bold: true };

    for (const row of items) {
      sheet.addRow({
        fullName: row.fullName ?? '',
        email: row.email ?? '',
        scheduleSummary: row.scheduleSummary ?? '',
        phone: row.phone ?? '',
        specialty: row.specialty ?? '',
        state: row.state ?? '',
        scheduleType: row.scheduleType === 'prn' ? 'PRN' : 'SET',
        employmentType: row.employmentType ?? '',
        workSites: row.workSites.length > 0 ? row.workSites.join('; ') : '-',
        recruiterName: row.recruiterName ?? '',
        liaisonName: row.liaisonName ?? '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private toFilters(query: ListActiveProvidersQueryDto): ActiveProviderFilters {
    return {
      q: query.q,
      recruiterId: query.recruiterId,
      recruiterIds: query.recruiterIds,
      liaisonId: query.liaisonId,
      liaisonIds: query.liaisonIds,
      state: query.state,
      states: query.states,
      city: query.city,
      cities: query.cities,
      region: query.region,
      regions: query.regions,
      specialty: query.specialty,
      specialties: query.specialties,
      employmentType: query.employmentType,
      employmentTypes: query.employmentTypes,
    };
  }
}
