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

  const rlsPath = resolve(migrationsFolder, '0001_supabase_rls_functions.sql');
  const rlsSql = readFileSync(rlsPath, 'utf8');
  console.log('Applying', rlsPath);
  await pool.query(rlsSql);

  await pool.end();
  console.log('Migrations applied successfully.');
}

void main().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
