/**
 * providers persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, exists, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  ActiveProviderFilterOptions,
  ActiveProviderFilters,
  ActiveProviderRow,
  IDbClient,
  IProvidersRepository,
} from './interface';
import {
  assignments,
  profiles,
  providerWorkSites,
  userRoles,
  workSites,
} from './db/schema';

// =============================================================================
// Active providers
// Used by: TOKENS.ProvidersRepository — GET /admin/providers
// =============================================================================

/**
 * ProvidersRepository — Drizzle implementation of persistence contracts.
 */
@Injectable()
export class ProvidersRepository implements IProvidersRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  /**
   * Paginated active providers for the admin list (role + active assignment filters).
   */
  async listActiveProviders(
    filters: ActiveProviderFilters,
    pagination: { limit: number; offset: number },
  ): Promise<ActiveProviderRow[]> {
    const where = this.buildWhere(filters);
    const rows = await this.dbClient.db
      .select({
        userId: profiles.userId,
        profileId: profiles.id,
        fullName: profiles.fullName,
        email: profiles.email,
        phone: profiles.phone,
        workSchedule: profiles.workSchedule,
        specialty: profiles.specialty,
        state: profiles.state,
        region: profiles.region,
        employmentType: profiles.employmentType,
        recruiterId: profiles.recruiterId,
        recruiterName: profiles.recruiterName,
        liaisonId: profiles.liaisonId,
        liaisonName: profiles.liaisonName,
      })
      .from(profiles)
      .where(where)
      .orderBy(desc(profiles.updatedAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    if (rows.length === 0) {
      return [];
    }

    const userIds = rows.map((r) => r.userId);
    const workSitesByProvider = await this.loadWorkSitesByProvider(userIds);
    const primarySchedules = await this.loadPrimaryWeeklySchedules(userIds);

    return rows.map((row) => ({
      userId: row.userId,
      profileId: row.profileId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      scheduleSummary:
        row.workSchedule?.trim() || this.weeklyScheduleToSummary(primarySchedules.get(row.userId)),
      specialty: row.specialty,
      state: row.state,
      region: row.region,
      employmentType: row.employmentType,
      recruiterId: row.recruiterId,
      recruiterName: row.recruiterName,
      liaisonId: row.liaisonId,
      liaisonName: row.liaisonName,
      workSites: workSitesByProvider.get(row.userId) ?? [],
    }));
  }

  /**
   * Total count of active providers matching list filters.
   */
  async countActiveProviders(filters: ActiveProviderFilters): Promise<number> {
    const where = this.buildWhere(filters);
    const result = await this.dbClient.db
      .select({ count: sql<number>`count(*)::int` })
      .from(profiles)
      .where(where);
    return result[0]?.count ?? 0;
  }

  /**
   * Distinct filter values for the Active Providers screen dropdowns.
   */
  async getActiveProviderFilterOptions(): Promise<ActiveProviderFilterOptions> {
    const activeProfileWhere = this.buildWhere({});

    const recruiterRows = await this.dbClient.db
      .selectDistinct({
        id: profiles.recruiterId,
        name: profiles.recruiterName,
      })
      .from(profiles)
      .where(and(activeProfileWhere, sql`${profiles.recruiterId} IS NOT NULL`));

    const liaisonRows = await this.dbClient.db
      .selectDistinct({
        id: profiles.liaisonId,
        name: profiles.liaisonName,
      })
      .from(profiles)
      .where(and(activeProfileWhere, sql`${profiles.liaisonId} IS NOT NULL`));

    const profileStateRows = await this.dbClient.db
      .selectDistinct({ state: profiles.state })
      .from(profiles)
      .where(and(activeProfileWhere, sql`${profiles.state} IS NOT NULL`));

    const siteStateRows = await this.dbClient.db
      .selectDistinct({ state: workSites.state })
      .from(profiles)
      .innerJoin(providerWorkSites, eq(providerWorkSites.providerId, profiles.userId))
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(and(activeProfileWhere, sql`${workSites.state} IS NOT NULL`));

    const cityRows = await this.dbClient.db
      .selectDistinct({ city: workSites.city })
      .from(profiles)
      .innerJoin(providerWorkSites, eq(providerWorkSites.providerId, profiles.userId))
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(and(activeProfileWhere, sql`${workSites.city} IS NOT NULL`));

    const profileRegionRows = await this.dbClient.db
      .selectDistinct({ region: profiles.region })
      .from(profiles)
      .where(and(activeProfileWhere, sql`${profiles.region} IS NOT NULL`));

    const siteRegionRows = await this.dbClient.db
      .selectDistinct({ region: workSites.region })
      .from(profiles)
      .innerJoin(providerWorkSites, eq(providerWorkSites.providerId, profiles.userId))
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(and(activeProfileWhere, sql`${workSites.region} IS NOT NULL`));

    const specialtyRows = await this.dbClient.db
      .selectDistinct({ specialty: profiles.specialty })
      .from(profiles)
      .where(and(activeProfileWhere, sql`${profiles.specialty} IS NOT NULL`));

    const employmentRows = await this.dbClient.db
      .selectDistinct({ employmentType: profiles.employmentType })
      .from(profiles)
      .where(and(activeProfileWhere, sql`${profiles.employmentType} IS NOT NULL`));

    const states = new Set<string>();
    for (const r of [...profileStateRows, ...siteStateRows]) {
      const v = r.state?.trim();
      if (v) states.add(v);
    }

    const regions = new Set<string>();
    for (const r of [...profileRegionRows, ...siteRegionRows]) {
      const v = r.region?.trim();
      if (v) regions.add(v);
    }

    return {
      recruiters: recruiterRows
        .filter((r) => r.id && r.name)
        .map((r) => ({ id: r.id!, name: r.name! }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      liaisons: liaisonRows
        .filter((l) => l.id && l.name)
        .map((l) => ({ id: l.id!, name: l.name! }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      states: [...states].sort((a, b) => a.localeCompare(b)),
      cities: cityRows
        .map((r) => r.city)
        .filter((c): c is string => !!c?.trim())
        .sort((a, b) => a.localeCompare(b)),
      regions: [...regions].sort((a, b) => a.localeCompare(b)),
      specialties: specialtyRows
        .map((r) => r.specialty)
        .filter((s): s is string => !!s?.trim())
        .sort((a, b) => a.localeCompare(b)),
      employmentTypes: employmentRows
        .map((r) => r.employmentType)
        .filter((e): e is string => !!e?.trim())
        .sort((a, b) => a.localeCompare(b)),
    };
  }

  private buildWhere(filters: ActiveProviderFilters): SQL {
    const conditions: SQL[] = [
      exists(
        this.dbClient.db
          .select({ one: sql`1` })
          .from(userRoles)
          .where(and(eq(userRoles.userId, profiles.userId), eq(userRoles.role, 'provider_user'))),
      ),
      exists(
        this.dbClient.db
          .select({ one: sql`1` })
          .from(assignments)
          .where(
            and(eq(assignments.providerId, profiles.userId), eq(assignments.status, 'active')),
          ),
      ),
    ];

    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim()}%`;
      conditions.push(
        or(
          ilike(profiles.fullName, pattern),
          ilike(profiles.email, pattern),
          ilike(profiles.providerId, pattern),
        )!,
      );
    }
    const recruiterIds = filters.recruiterIds?.length
      ? filters.recruiterIds
      : filters.recruiterId
        ? [filters.recruiterId]
        : [];
    if (recruiterIds.length) {
      conditions.push(inArray(profiles.recruiterId, recruiterIds));
    }

    const liaisonIds = filters.liaisonIds?.length
      ? filters.liaisonIds
      : filters.liaisonId
        ? [filters.liaisonId]
        : [];
    if (liaisonIds.length) {
      conditions.push(inArray(profiles.liaisonId, liaisonIds));
    }

    const specialties = filters.specialties?.length
      ? filters.specialties
      : filters.specialty
        ? [filters.specialty]
        : [];
    if (specialties.length) {
      conditions.push(
        or(...specialties.map((specialty) => ilike(profiles.specialty, specialty)))!,
      );
    }

    const employmentTypes = filters.employmentTypes?.length
      ? filters.employmentTypes
      : filters.employmentType
        ? [filters.employmentType]
        : [];
    if (employmentTypes.length) {
      conditions.push(
        or(...employmentTypes.map((employmentType) => ilike(profiles.employmentType, employmentType)))!,
      );
    }

    const states = filters.states?.length ? filters.states : filters.state ? [filters.state] : [];
    if (states.length) {
      conditions.push(
        or(
          ...states.map(
            (state) =>
              or(
                ilike(profiles.state, state),
                exists(
                  this.dbClient.db
                    .select({ one: sql`1` })
                    .from(providerWorkSites)
                    .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
                    .where(
                      and(
                        eq(providerWorkSites.providerId, profiles.userId),
                        ilike(workSites.state, state),
                      ),
                    ),
                ),
              )!,
          ),
        )!,
      );
    }

    const cities = filters.cities?.length ? filters.cities : filters.city ? [filters.city] : [];
    if (cities.length) {
      conditions.push(
        or(
          ...cities.map((city) =>
            exists(
              this.dbClient.db
                .select({ one: sql`1` })
                .from(providerWorkSites)
                .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
                .where(
                  and(
                    eq(providerWorkSites.providerId, profiles.userId),
                    ilike(workSites.city, city),
                  ),
                ),
            ),
          ),
        )!,
      );
    }

    const regions = filters.regions?.length ? filters.regions : filters.region ? [filters.region] : [];
    if (regions.length) {
      conditions.push(
        or(
          ...regions.map(
            (region) =>
              or(
                ilike(profiles.region, region),
                exists(
                  this.dbClient.db
                    .select({ one: sql`1` })
                    .from(providerWorkSites)
                    .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
                    .where(
                      and(
                        eq(providerWorkSites.providerId, profiles.userId),
                        ilike(workSites.region, region),
                      ),
                    ),
                ),
              )!,
          ),
        )!,
      );
    }

    return and(...conditions)!;
  }

  private async loadWorkSitesByProvider(providerUserIds: string[]): Promise<Map<string, string[]>> {
    const rows = await this.dbClient.db
      .select({
        providerId: providerWorkSites.providerId,
        facilityName: workSites.facilityName,
        isPrimary: providerWorkSites.isPrimary,
      })
      .from(providerWorkSites)
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(inArray(providerWorkSites.providerId, providerUserIds))
      .orderBy(desc(providerWorkSites.isPrimary), workSites.facilityName);

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.providerId) ?? [];
      list.push(row.facilityName);
      map.set(row.providerId, list);
    }
    return map;
  }

  private async loadPrimaryWeeklySchedules(
    providerUserIds: string[],
  ): Promise<Map<string, unknown>> {
    const rows = await this.dbClient.db
      .select({
        providerId: providerWorkSites.providerId,
        weeklySchedule: providerWorkSites.weeklySchedule,
      })
      .from(providerWorkSites)
      .where(
        and(
          inArray(providerWorkSites.providerId, providerUserIds),
          eq(providerWorkSites.isPrimary, true),
        ),
      );

    const map = new Map<string, unknown>();
    for (const row of rows) {
      map.set(row.providerId, row.weeklySchedule);
    }
    return map;
  }

  private weeklyScheduleToSummary(schedule: unknown): string | null {
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return null;
    }
    const parts = schedule
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const e = entry as Record<string, string>;
        const day = e.day ?? e.label;
        const start = e.start ?? e.startTime;
        const end = e.end ?? e.endTime;
        if (day && start && end) return `${day} ${start} - ${end}`;
        if (day) return day;
        return null;
      })
      .filter((p): p is string => !!p);
    return parts.length > 0 ? parts.join(', ') : null;
  }
}

