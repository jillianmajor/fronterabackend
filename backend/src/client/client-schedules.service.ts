import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { rethrowAsHttp } from '../common/errors/to-http.exception';
import { TOKENS } from '../config/tokens';
import type { ClientScheduleRow, IClientSchedulesRepository } from '../repository/persistence/interface';
import { buildClientSchedulesRegionExport } from '../repository/persistence/utils/master-pto-export.util';
import { assertFirstOfMonth } from '../provider/provider-time.util';
import type { ClientSchedulesRegionExportQueryDto } from './dto/client-schedules-response.dto';

@Injectable()
export class ClientSchedulesService {
  constructor(
    @Inject(TOKENS.ClientSchedulesRepository)
    private readonly repo: IClientSchedulesRepository,
  ) {}

  async list(monthYear: string) {
    try {
      assertFirstOfMonth(monthYear);
      const rows = await this.repo.listOptumSchedules(monthYear);
      rows.sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''));
      return { monthYear, rows };
    } catch (err) {
      rethrowAsHttp(err);
    }
  }

  async exportRegion(query: ClientSchedulesRegionExportQueryDto) {
    try {
      assertFirstOfMonth(query.monthYear);
      const rows = this.filterRows(await this.repo.listOptumSchedules(query.monthYear), query);
      const regions = query.regions?.length ? query.regions : this.uniqueRegions(rows);
      const region = regions[0];
      if (!region) {
        throw new NotFoundException('No region specified for export.');
      }

      const file = await buildClientSchedulesRegionExport({
        monthYear: query.monthYear,
        region,
        rows,
      });
      return file;
    } catch (err) {
      rethrowAsHttp(err);
    }
  }

  private uniqueRegions(rows: ClientScheduleRow[]): string[] {
    return [...new Set(rows.map((r) => r.region).filter((r): r is string => Boolean(r && r !== 'Review')))].sort();
  }

  private filterRows(rows: ClientScheduleRow[], query: ClientSchedulesRegionExportQueryDto): ClientScheduleRow[] {
    const regionSet = query.regions?.length ? new Set(query.regions) : null;
    const stateSet = query.states?.length ? new Set(query.states) : null;
    const citySet = query.cities?.length ? new Set(query.cities) : null;
    const facility = query.facility?.trim().toLowerCase();
    const q = query.q?.trim().toLowerCase();

    return rows.filter((row) => {
      if (regionSet && !regionSet.has(row.region ?? '')) return false;
      if (stateSet && !stateSet.has(row.site.state ?? '')) return false;
      if (citySet && !citySet.has(row.site.city ?? '')) return false;
      if (facility && !(row.site.facilityName ?? '').toLowerCase().includes(facility)) return false;
      if (q && !(row.fullName ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }
}
