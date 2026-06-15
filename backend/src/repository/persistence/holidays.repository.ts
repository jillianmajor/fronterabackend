import { Inject, Injectable } from '@nestjs/common';
import { and, asc, gte, lte, type SQL } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type { HolidayRow, IHolidaysRepository, IDbClient } from './interface';
import { holidays } from './db/schema';

@Injectable()
export class HolidaysRepository implements IHolidaysRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  async list(from?: string, to?: string): Promise<HolidayRow[]> {
    const conditions: SQL[] = [];
    if (from) conditions.push(gte(holidays.holidayDate, from));
    if (to) conditions.push(lte(holidays.holidayDate, to));

    const rows = await this.dbClient.db
      .select({
        id: holidays.id,
        name: holidays.name,
        holidayDate: holidays.holidayDate,
        year: holidays.year,
      })
      .from(holidays)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(holidays.holidayDate));

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      holidayDate: String(r.holidayDate),
      year: r.year,
    }));
  }
}
