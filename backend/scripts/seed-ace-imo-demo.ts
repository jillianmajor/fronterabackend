/**
 * Seed ACE/IMO demo providers only (19 SET providers, June 2026 schedules).
 * Requires catalog seed first so recruiter staff UUIDs exist.
 *
 * Run: npm run db:seed:ace-imo
 */
import { Pool, type PoolClient } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { ACE_IMO_DEMO_MONTH_YEAR, seedAceImoDemoData } from './seed/ace-imo-demo';
import { loadDotEnv } from './seed/load-dotenv';

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const ssl = getPgSslConfig(connectionString);
  const pool = new Pool({ connectionString, ...(ssl ? { ssl } : {}) });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const inst = await client.query<{ id: string }>('SELECT id FROM auth.instances LIMIT 1');
    const instanceId = inst.rows[0]?.id ?? '00000000-0000-0000-0000-000000000000';
    await seedAceImoDemoData(client, instanceId);
    await client.query('COMMIT');
    console.log('ACE/IMO demo seed completed.');
    console.log(
      'Export: GET /admin/master-pto/export/ace-imo?company=Frontera&monthYear=' +
        ACE_IMO_DEMO_MONTH_YEAR,
    );
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
