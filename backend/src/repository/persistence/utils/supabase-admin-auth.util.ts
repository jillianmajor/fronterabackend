/**
 * Set password via Supabase Auth Admin API so GoTrue accepts signInWithPassword.
 * Direct SQL `crypt()` on auth.users is unreliable on hosted Supabase.
 */
export async function setSupabaseUserPassword(
  supabaseUrl: string,
  serviceRoleKey: string,
  userId: string,
  password: string,
): Promise<void> {
  const base = supabaseUrl.replace(/\/$/, '');
  const res = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password,
      email_confirm: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Supabase admin password update failed (${res.status}): ${body || res.statusText}`,
    );
  }
}
