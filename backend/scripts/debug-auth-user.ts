import { Pool } from 'pg';
import { getPgSslConfig } from '../src/config/database-connection';
import { loadDotEnv } from './seed/load-dotenv';

loadDotEnv();
const email = process.argv[2] ?? 'hamzajamshed.cs@gmail.com';

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getPgSslConfig(process.env.DATABASE_URL!),
  });
  const u = await pool.query(
    `SELECT id, email, encrypted_password IS NOT NULL AS has_pw,
      LEFT(encrypted_password, 7) AS pw_prefix,
      email_confirmed_at, confirmation_token, recovery_token,
      LENGTH(encrypted_password) AS pw_len
     FROM auth.users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const userId = u.rows[0]?.id;
  const i = userId
    ? await pool.query(
        `SELECT id, user_id, provider, provider_id, identity_data
         FROM auth.identities WHERE user_id = $1`,
        [userId],
      )
    : { rows: [] };
  const roles = userId
    ? await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId])
    : { rows: [] };
  const invite = await pool.query(
    `SELECT used_at, expires_at FROM provider_invites
     WHERE LOWER(email) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
    [email],
  );
  const inst = await pool.query('SELECT id FROM auth.instances');
  console.log(JSON.stringify({ user: u.rows[0], identities: i.rows, roles: roles.rows, invite: invite.rows[0], instances: inst.rows }, null, 2));
  await pool.end();
}

void main();
