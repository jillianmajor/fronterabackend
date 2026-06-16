import type { PoolClient } from 'pg';
import { OPTUM_CLOSURES_2026 } from './holidays-data';

/** Idempotent upsert of Optum clinic closure dates. */
export async function seedHolidays(client: PoolClient): Promise<number> {
  let count = 0;
  for (const h of OPTUM_CLOSURES_2026) {
    await client.query(
      `INSERT INTO holidays (name, holiday_date, year)
       VALUES ($1, $2, $3)
       ON CONFLICT (holiday_date) DO UPDATE SET
         name = EXCLUDED.name,
         year = EXCLUDED.year`,
      [h.name, h.holidayDate, h.year],
    );
    count += 1;
  }
  return count;
}
