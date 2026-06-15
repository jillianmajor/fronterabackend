/**
 * Pool SSL options for pg / Drizzle.
 * Supabase requires SSL; local Docker Postgres does not.
 */
export function getPgSslConfig(
  connectionString: string,
): { rejectUnauthorized: boolean } | undefined {
  if (process.env.DATABASE_SSL === 'false') {
    return undefined;
  }
  if (process.env.DATABASE_SSL === 'true') {
    return { rejectUnauthorized: false };
  }
  if (isLocalDatabaseUrl(connectionString)) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

export function isLocalDatabaseUrl(connectionString: string): boolean {
  return /@(localhost|127\.0\.0\.1|postgres)(:\d+)?\//.test(connectionString);
}
