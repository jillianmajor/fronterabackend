/**
 * Apply PostgREST role grants on public schema (fixes FE "permission denied" on profiles/user_roles).
 * Run: npm run db:grants
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { loadDotEnv } from './seed/load-dotenv';

async function main(): Promise<void> {
  loadDotEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const sql = readFileSync(resolve(__dirname, '../drizzle/0003_authenticated_grants.sql'), 'utf8');
  const pool = new Pool({
    connectionString,
    ...(getPgSslConfig(connectionString) ? { ssl: getPgSslConfig(connectionString) } : {}),
  });

  try {
    await pool.query(sql);
    console.log('Granted authenticated/anon privileges on public schema.');
  } finally {
    await pool.end();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
