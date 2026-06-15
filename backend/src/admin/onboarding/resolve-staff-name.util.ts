import type { StaffOption } from '../../repository/persistence/interface';

/**
 * Resolve recruiter/liaison display name from bulk spreadsheet to internal staff row.
 * Supports exact full name, first-name shorthand ("Amy" → "Amy Guy"), and unique prefix.
 */
export function resolveStaffByName(
  name: string | undefined | null,
  staff: StaffOption[],
): StaffOption | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const normalized = trimmed.toLowerCase();

  const exact = staff.find((s) => s.fullName.toLowerCase() === normalized);
  if (exact) return exact;

  const firstToken = normalized.split(/\s+/)[0];
  const byFirst = staff.filter((s) => s.fullName.split(/\s+/)[0]?.toLowerCase() === firstToken);
  if (byFirst.length === 1) return byFirst[0];

  const byPrefix = staff.filter((s) => s.fullName.toLowerCase().startsWith(normalized));
  if (byPrefix.length === 1) return byPrefix[0];

  return null;
}
