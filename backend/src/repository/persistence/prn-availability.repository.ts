/**
 * prn-availability persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, exists, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  IDbClient,
  IPrnAvailabilityRepository,
  PrnAvailabilityDayRow,
  PrnAvailabilityFilterOptions,
  PrnAvailabilityFilters,
  PrnMonthlySubmissionRow,
} from './interface';
import {
  assignments,
  monthlyAvailabilityRequests,
  profiles,
  providerWorkSites,
  timeOffRequests,
  userRoles,
  workSites,
} from './db/schema';
import { mapPrnAvailabilityDay } from './utils/prn-availability.util';
import {
  listCatalogCompanyNames,
  listCatalogRegionNames,
  listCatalogStaffPeople,
  mergePeopleOptions,
  mergeStringOptions,
} from './utils/filter-options-catalog.util';

// =============================================================================
// PRN Availability (admin)
// Used by: TOKENS.PrnAvailabilityRepository — GET /admin/prn-availability/*
// =============================================================================

/**
 * PrnAvailabilityRepository — PRN monthly submissions and per-day availability rows.
 */
@Injectable()
export class PrnAvailabilityRepository implements IPrnAvailabilityRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  /**
   * Liaison and region options for PRN providers at the selected company.
   */
  async getFilterOptions(company: string): Promise<PrnAvailabilityFilterOptions> {
    const profileWhere = this.buildProfileWhere({ company });

    const [companies, catalogStaff, catalogRegions, liaisonRows, profileRegionRows, siteRegionRows] =
      await Promise.all([
        listCatalogCompanyNames(this.dbClient),
        listCatalogStaffPeople(this.dbClient),
        listCatalogRegionNames(this.dbClient),
        this.dbClient.db
          .selectDistinct({
            id: profiles.liaisonId,
            name: profiles.liaisonName,
          })
          .from(profiles)
          .where(and(profileWhere, sql`${profiles.liaisonId} IS NOT NULL`)),
        this.dbClient.db
          .selectDistinct({ region: profiles.region })
          .from(profiles)
          .where(and(profileWhere, sql`${profiles.region} IS NOT NULL`)),
        this.dbClient.db
          .selectDistinct({ region: workSites.region })
          .from(profiles)
          .innerJoin(providerWorkSites, eq(providerWorkSites.providerId, profiles.userId))
          .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
          .where(and(profileWhere, sql`${workSites.region} IS NOT NULL`)),
      ]);

    const liaisonFromProviders = liaisonRows
      .filter((l) => l.id && l.name)
      .map((l) => ({ id: l.id!, name: l.name! }));

    return {
      companies,
      liaisons: mergePeopleOptions(catalogStaff, liaisonFromProviders),
      regions: mergeStringOptions(
        catalogRegions,
        profileRegionRows.map((r) => r.region ?? ''),
        siteRegionRows.map((r) => r.region ?? ''),
      ),
    };
  }

  /**
   * Month-level PRN submissions (monthly_availability_requests).
   */
  async listMonthlySubmissions(
    filters: PrnAvailabilityFilters,
    dateRange?: { start: string; end: string },
  ): Promise<PrnMonthlySubmissionRow[]> {
    const profileWhere = this.buildProfileWhere(filters);
    const conditions: SQL[] = [profileWhere];
    if (dateRange) {
      conditions.push(gte(monthlyAvailabilityRequests.monthYear, dateRange.start));
      conditions.push(lte(monthlyAvailabilityRequests.monthYear, dateRange.end));
    }

    const rows = await this.dbClient.db
      .select({
        monthlyRequestId: monthlyAvailabilityRequests.id,
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        liaisonName: profiles.liaisonName,
        monthYear: monthlyAvailabilityRequests.monthYear,
        monthlyStatus: monthlyAvailabilityRequests.status,
        deadline: monthlyAvailabilityRequests.deadline,
        submittedAt: monthlyAvailabilityRequests.submittedAt,
        noChanges: monthlyAvailabilityRequests.noChanges,
      })
      .from(monthlyAvailabilityRequests)
      .innerJoin(profiles, eq(profiles.userId, monthlyAvailabilityRequests.providerId))
      .where(and(...conditions))
      .orderBy(desc(monthlyAvailabilityRequests.monthYear), profiles.fullName);

    return rows.map((r) => ({
      monthlyRequestId: r.monthlyRequestId,
      providerUserId: r.providerUserId,
      providerName: r.providerName ?? 'Unknown',
      liaisonName: r.liaisonName,
      monthYear: String(r.monthYear),
      monthlyStatus: r.monthlyStatus,
      deadline: String(r.deadline),
      submittedAt: r.submittedAt?.toISOString() ?? null,
      noChanges: r.noChanges,
    }));
  }

  /**
   * Per-day availability rows for PRN providers in a calendar range.
   */
  async listDaysInRange(
    filters: PrnAvailabilityFilters,
    startDate: string,
    endDate: string,
  ): Promise<PrnAvailabilityDayRow[]> {
    const profileWhere = this.buildProfileWhere(filters);
    const monthStartExpr = sql`date_trunc('month', ${timeOffRequests.requestDate})::date`;

    const rows = await this.dbClient.db
      .select({
        requestId: timeOffRequests.id,
        requestDate: timeOffRequests.requestDate,
        startTime: timeOffRequests.startTime,
        endTime: timeOffRequests.endTime,
        changeType: timeOffRequests.changeType,
        status: timeOffRequests.status,
        notes: timeOffRequests.notes,
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        liaisonName: profiles.liaisonName,
        profileRegion: profiles.region,
        primarySiteRegion: workSites.region,
        monthlyRequestId: monthlyAvailabilityRequests.id,
        monthlyStatus: monthlyAvailabilityRequests.status,
        pacrDocumentId: timeOffRequests.pacrDocumentId,
      })
      .from(timeOffRequests)
      .innerJoin(profiles, eq(profiles.userId, timeOffRequests.providerId))
      .leftJoin(
        providerWorkSites,
        and(
          eq(providerWorkSites.providerId, profiles.userId),
          eq(providerWorkSites.isPrimary, true),
        ),
      )
      .leftJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .leftJoin(
        monthlyAvailabilityRequests,
        and(
          eq(monthlyAvailabilityRequests.providerId, profiles.userId),
          eq(monthlyAvailabilityRequests.monthYear, monthStartExpr),
        ),
      )
      .where(
        and(
          profileWhere,
          gte(timeOffRequests.requestDate, startDate),
          lte(timeOffRequests.requestDate, endDate),
        ),
      )
      .orderBy(desc(timeOffRequests.createdAt), timeOffRequests.requestDate);

    return rows.map((r) => mapPrnAvailabilityDay(r));
  }

  /**
   * PRN monthly submissions awaiting corporate review (`status = submitted`).
   */
  async countPendingSubmissions(filters: PrnAvailabilityFilters): Promise<number> {
    const profileWhere = this.buildProfileWhere(filters);
    const result = await this.dbClient.db
      .select({ count: sql<number>`count(*)::int` })
      .from(monthlyAvailabilityRequests)
      .innerJoin(profiles, eq(profiles.userId, monthlyAvailabilityRequests.providerId))
      .where(and(profileWhere, eq(monthlyAvailabilityRequests.status, 'submitted')));
    return result[0]?.count ?? 0;
  }

  private buildProfileWhere(filters: PrnAvailabilityFilters): SQL {
    const conditions: SQL[] = [
      eq(profiles.company, filters.company),
      eq(profiles.scheduleType, 'prn'),
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

    if (filters.liaisonIds?.length) {
      conditions.push(inArray(profiles.liaisonId, filters.liaisonIds));
    }
    if (filters.regions?.length) {
      const regionConds = filters.regions.map(
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
      );
      conditions.push(or(...regionConds)!);
    }
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

    return and(...conditions)!;
  }
}

