/**
 * Applies Drizzle migrations with dotenv + SSL (Supabase-friendly).
 * Usage: npm run db:migrate
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';

config();

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const ssl = getPgSslConfig(connectionString);
  const pool = new Pool({
    connectionString,
    ...(ssl ? { ssl } : {}),
  });

  const db = drizzle(pool);
  const migrationsFolder = resolve(process.cwd(), 'drizzle');

  console.log('Applying migrations from', migrationsFolder);
  await migrate(db, { migrationsFolder });

  for (const name of [
    '0001_supabase_rls_functions.sql',
    '0004_notifications_delete_policy.sql',
    '0005_enable_rls_missing_tables.sql',
    '0006_enable_rls_core_tables.sql',
    '0007_notifications_read_update_policies.sql',
  ]) {
    const path = resolve(migrationsFolder, name);
    const sql = readFileSync(path, 'utf8');
    console.log('Applying', path);
    await pool.query(sql);
  }

  await pool.end();
  console.log('Migrations applied successfully.');
}

void main().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
