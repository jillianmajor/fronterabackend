import { asc, eq, sql } from 'drizzle-orm';
import type { IDbClient } from '../interface';
import {
  onboardingCompanies,
  onboardingEmploymentTypes,
  onboardingRegions,
  onboardingSpecialties,
  profiles,
  userRoles,
  workSites,
} from '../db/schema';

export interface FilterPersonOption {
  id: string;
  name: string;
}

/** All internal staff for recruiter / liaison dropdowns. */
export async function listCatalogStaffPeople(
  dbClient: IDbClient,
): Promise<FilterPersonOption[]> {
  const rows = await dbClient.db
    .select({
      id: profiles.userId,
      name: profiles.fullName,
    })
    .from(profiles)
    .innerJoin(userRoles, eq(userRoles.userId, profiles.userId))
    .where(eq(userRoles.role, 'internal_staff'))
    .orderBy(profiles.fullName);

  return rows
    .filter((r) => r.id && r.name?.trim())
    .map((r) => ({ id: r.id, name: r.name!.trim() }));
}

export async function listCatalogCompanyNames(dbClient: IDbClient): Promise<string[]> {
  const rows = await dbClient.db
    .select({ name: onboardingCompanies.name })
    .from(onboardingCompanies)
    .where(eq(onboardingCompanies.isActive, true))
    .orderBy(asc(onboardingCompanies.sortOrder));
  return rows.map((r) => r.name);
}

export async function listCatalogRegionNames(dbClient: IDbClient): Promise<string[]> {
  const [catalogRows, siteRows] = await Promise.all([
    dbClient.db
      .select({ name: onboardingRegions.name })
      .from(onboardingRegions)
      .where(eq(onboardingRegions.isActive, true))
      .orderBy(asc(onboardingRegions.sortOrder)),
    dbClient.db
      .selectDistinct({ region: workSites.region })
      .from(workSites)
      .where(sql`${workSites.region} IS NOT NULL`),
  ]);

  const regions = new Set<string>();
  for (const row of catalogRows) {
    const v = row.name?.trim();
    if (v) regions.add(v);
  }
  for (const row of siteRows) {
    const v = row.region?.trim();
    if (v) regions.add(v);
  }
  return [...regions].sort((a, b) => a.localeCompare(b));
}

export async function listCatalogSpecialtyNames(dbClient: IDbClient): Promise<string[]> {
  const rows = await dbClient.db
    .select({ name: onboardingSpecialties.name })
    .from(onboardingSpecialties)
    .where(eq(onboardingSpecialties.isActive, true))
    .orderBy(asc(onboardingSpecialties.sortOrder));
  return rows.map((r) => r.name);
}

export async function listCatalogEmploymentTypeCodes(dbClient: IDbClient): Promise<string[]> {
  const rows = await dbClient.db
    .select({ code: onboardingEmploymentTypes.code })
    .from(onboardingEmploymentTypes)
    .where(eq(onboardingEmploymentTypes.isActive, true))
    .orderBy(asc(onboardingEmploymentTypes.sortOrder));
  return rows.map((r) => r.code);
}

export function mergePeopleOptions(
  ...groups: FilterPersonOption[][]
): FilterPersonOption[] {
  const byId = new Map<string, FilterPersonOption>();
  for (const group of groups) {
    for (const person of group) {
      if (!person.id || !person.name) continue;
      byId.set(person.id, person);
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function mergeStringOptions(...groups: string[][]): string[] {
  const values = new Set<string>();
  for (const group of groups) {
    for (const value of group) {
      const trimmed = value?.trim();
      if (trimmed) values.add(trimmed);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}
