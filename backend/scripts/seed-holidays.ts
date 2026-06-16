/**
 * Seeds 2026 Optum clinic closure dates into `holidays`.
 * Run: `npm run db:seed:holidays` (requires DATABASE_URL in `.env`).
 */
import { Pool } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { loadDotEnv } from './seed/load-dotenv';
import { seedHolidays } from './seed/seed-holidays';

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required (set in environment or .env)');
  }

  const pool = new Pool({
    connectionString,
    ...(getPgSslConfig(connectionString) ? { ssl: getPgSslConfig(connectionString) } : {}),
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const count = await seedHolidays(client);
    await client.query('COMMIT');
    console.log(`Seeded ${count} Optum clinic closure dates (2026).`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
