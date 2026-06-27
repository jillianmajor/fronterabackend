/**
 * master-availability persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { and, eq, exists, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  IDbClient,
  IMasterAvailabilityRepository,
  MasterAvailabilityClientExportProvider,
  MasterAvailabilityEntry,
  MasterAvailabilityFilterOptions,
  MasterAvailabilityFilters,
  MasterAvailabilitySubmissionProgress,
  SetProviderScheduleRow,
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
import {
  listCatalogCompanyNames,
  listCatalogRegionNames,
  listCatalogStaffPeople,
  mergePeopleOptions,
  mergeStringOptions,
} from './utils/filter-options-catalog.util';
import {
  MASTER_AVAILABILITY_STATUSES,
  PTO_DISPLAY_STATUSES,
  parseMonthYear,
  targetCollectionMonthStart,
  timeAvailableForTimeOff,
  toPtoDisplayStatus,
} from './utils/master-availability.util';
import { submissionDeadlineForTargetMonth } from './utils/schedule-change-approvals.util';

// =============================================================================
// Master Availability Calendar
// Used by: TOKENS.MasterAvailabilityRepository — GET /admin/master-availability/*
// =============================================================================

/**
 * MasterAvailabilityRepository — Drizzle implementation of persistence contracts.
 */
@Injectable()
export class MasterAvailabilityRepository implements IMasterAvailabilityRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  /**
   * Time-off rows in a date range for Master Availability (table/calendar).
   */
  async listTimeOffEntries(
    filters: MasterAvailabilityFilters,
    startDate: string,
    endDate: string,
  ): Promise<MasterAvailabilityEntry[]> {
    const profileWhere = this.buildProfileWhere(filters);
    const conditions: SQL[] = [
      profileWhere,
      gte(timeOffRequests.requestDate, startDate),
      lte(timeOffRequests.requestDate, endDate),
    ];
    const statusFilter = filters.statuses?.length
      ? filters.statuses
      : filters.status
        ? [filters.status]
        : undefined;
    if (statusFilter?.length) {
      conditions.push(inArray(timeOffRequests.status, statusFilter as never));
    }

    if (filters.scheduleTypes?.length) {
      conditions.push(inArray(profiles.scheduleType, filters.scheduleTypes as never));
    }

    if (filters.changeTypes?.length) {
      conditions.push(inArray(timeOffRequests.changeType, filters.changeTypes as never));
    }

    const rows = await this.dbClient.db
      .select({
        requestId: timeOffRequests.id,
        requestDate: timeOffRequests.requestDate,
        startTime: timeOffRequests.startTime,
        endTime: timeOffRequests.endTime,
        changeType: timeOffRequests.changeType,
        status: timeOffRequests.status,
        notes: timeOffRequests.notes,
        createdAt: timeOffRequests.createdAt,
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        liaisonName: profiles.liaisonName,
        recruiterName: profiles.recruiterName,
        specialty: profiles.specialty,
        profileRegion: profiles.region,
        primarySiteRegion: workSites.region,
        facilityName: workSites.facilityName,
      })
      .from(timeOffRequests)
      .innerJoin(profiles, eq(profiles.userId, timeOffRequests.providerId))
      .leftJoin(workSites, eq(workSites.id, timeOffRequests.workSiteId))
      .leftJoin(
        providerWorkSites,
        and(
          eq(providerWorkSites.providerId, profiles.userId),
          eq(providerWorkSites.isPrimary, true),
        ),
      )
      .where(and(...conditions))
      .orderBy(timeOffRequests.requestDate, profiles.fullName);

    return rows.map((r) => ({
      requestId: r.requestId,
      providerUserId: r.providerUserId,
      providerName: r.providerName ?? 'Unknown',
      liaisonName: r.liaisonName,
      recruiterName: r.recruiterName,
      date: String(r.requestDate),
      timeAvailable: timeAvailableForTimeOff(r.changeType, r.startTime, r.endTime),
      status: r.status,
      displayStatus: toPtoDisplayStatus(r.status, 'time_off'),
      specialty: r.specialty,
      region: r.profileRegion?.trim() || r.primarySiteRegion?.trim() || null,
      facilityName: r.facilityName,
      notes: r.notes,
      changeType: r.changeType,
      createdAt: r.createdAt?.toISOString() ?? null,
      source: 'time_off' as const,
    }));
  }

  /**
   * Set-schedule providers and weekly_schedule for baseline calendar cells.
   */
  async listSetProvidersForBaseline(
    filters: MasterAvailabilityFilters,
  ): Promise<SetProviderScheduleRow[]> {
    const where = and(this.buildProfileWhere(filters), eq(profiles.scheduleType, 'set'));

    const rows = await this.dbClient.db
      .select({
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        liaisonName: profiles.liaisonName,
        specialty: profiles.specialty,
        profileRegion: profiles.region,
        scheduleType: profiles.scheduleType,
        weeklySchedule: providerWorkSites.weeklySchedule,
        primarySiteRegion: workSites.region,
        primaryFacilityName: workSites.facilityName,
      })
      .from(profiles)
      .leftJoin(
        providerWorkSites,
        and(
          eq(providerWorkSites.providerId, profiles.userId),
          eq(providerWorkSites.isPrimary, true),
        ),
      )
      .leftJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(where);

    return rows.map((r) => ({
      providerUserId: r.providerUserId,
      providerName: r.providerName ?? 'Unknown',
      liaisonName: r.liaisonName,
      specialty: r.specialty,
      region: r.profileRegion?.trim() || r.primarySiteRegion?.trim() || null,
      scheduleType: r.scheduleType,
      weeklySchedule: r.weeklySchedule,
      facilityName: r.primaryFacilityName,
    }));
  }

  /**
   * Filter dropdown values for Master Availability.
   */
  async getFilterOptions(company: string): Promise<MasterAvailabilityFilterOptions> {
    const profileWhere = this.buildProfileWhere({ company, monthYear: '2000-01-01' });

    const [
      companies,
      catalogStaff,
      catalogRegions,
      liaisonRows,
      recruiterRows,
      profileRegionRows,
      siteRegionRows,
    ] = await Promise.all([
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
        .selectDistinct({
          id: profiles.recruiterId,
          name: profiles.recruiterName,
        })
        .from(profiles)
        .where(and(profileWhere, sql`${profiles.recruiterId} IS NOT NULL`)),
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
    const recruiterFromProviders = recruiterRows
      .filter((r) => r.id && r.name)
      .map((r) => ({ id: r.id!, name: r.name! }));

    return {
      companies,
      liaisons: mergePeopleOptions(catalogStaff, liaisonFromProviders),
      recruiters: mergePeopleOptions(catalogStaff, recruiterFromProviders),
      statuses: [...MASTER_AVAILABILITY_STATUSES],
      displayStatuses: [...PTO_DISPLAY_STATUSES],
      regions: mergeStringOptions(
        catalogRegions,
        profileRegionRows.map((r) => r.region ?? ''),
        siteRegionRows.map((r) => r.region ?? ''),
      ),
    };
  }

  async getSubmissionProgress(
    company: string,
    monthYear?: string,
    scheduleTypes: Array<'prn' | 'set'> = ['prn'],
  ): Promise<MasterAvailabilitySubmissionProgress> {
    const targetMonthYear = monthYear ?? targetCollectionMonthStart();
    const { label } = parseMonthYear(targetMonthYear);
    const deadline = submissionDeadlineForTargetMonth(targetMonthYear);
    const profileWhere = this.buildProfileWhere({ company, monthYear: targetMonthYear });
    const scheduleWhere = inArray(profiles.scheduleType, scheduleTypes);

    const providerRows = await this.dbClient.db
      .select({
        providerUserId: profiles.userId,
        liaisonId: profiles.liaisonId,
        liaisonName: profiles.liaisonName,
      })
      .from(profiles)
      .where(and(profileWhere, scheduleWhere, sql`${profiles.liaisonId} IS NOT NULL`));

    const submittedRows = await this.dbClient.db
      .selectDistinct({ providerId: monthlyAvailabilityRequests.providerId })
      .from(monthlyAvailabilityRequests)
      .innerJoin(profiles, eq(profiles.userId, monthlyAvailabilityRequests.providerId))
      .where(
        and(
          profileWhere,
          scheduleWhere,
          eq(monthlyAvailabilityRequests.monthYear, targetMonthYear),
          sql`${monthlyAvailabilityRequests.status} != 'requested'`,
        ),
      );

    const submittedIds = new Set(submittedRows.map((r) => r.providerId));
    const byLiaison = new Map<
      string,
      { liaisonName: string; total: number; submitted: number }
    >();

    for (const p of providerRows) {
      if (!p.liaisonId || !p.liaisonName) continue;
      const card = byLiaison.get(p.liaisonId) ?? {
        liaisonName: p.liaisonName,
        total: 0,
        submitted: 0,
      };
      card.total += 1;
      if (submittedIds.has(p.providerUserId)) {
        card.submitted += 1;
      }
      byLiaison.set(p.liaisonId, card);
    }

    const liaisonCards = [...byLiaison.entries()]
      .map(([liaisonId, card]) => ({
        liaisonId,
        liaisonName: card.liaisonName,
        submitted: card.submitted,
        total: card.total,
        percent: card.total > 0 ? Math.round((card.submitted / card.total) * 100) : 0,
      }))
      .sort((a, b) => a.liaisonName.localeCompare(b.liaisonName));

    return {
      targetMonthYear,
      targetMonthLabel: label,
      deadline,
      liaisonCards,
    };
  }

  async listProvidersForClientExport(
    filters: MasterAvailabilityFilters,
    startDate: string,
    endDate: string,
  ): Promise<MasterAvailabilityClientExportProvider[]> {
    const profileWhere = this.buildProfileWhere(filters);
    const rows = await this.dbClient.db
      .select({
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        specialty: profiles.specialty,
        recruiterId: profiles.recruiterId,
        recruiterName: profiles.recruiterName,
        liaisonName: profiles.liaisonName,
        profileRegion: profiles.region,
        scheduleType: profiles.scheduleType,
        workSiteId: providerWorkSites.workSiteId,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        siteRegion: workSites.region,
        weeklySchedule: providerWorkSites.weeklySchedule,
      })
      .from(profiles)
      .innerJoin(providerWorkSites, eq(providerWorkSites.providerId, profiles.userId))
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(profileWhere)
      .orderBy(profiles.fullName, workSites.facilityName);

    return rows.map((r) => ({
      providerUserId: r.providerUserId,
      providerName: r.providerName ?? 'Unknown',
      specialty: r.specialty,
      recruiterId: r.recruiterId,
      recruiterName: r.recruiterName,
      liaisonName: r.liaisonName,
      region: r.profileRegion?.trim() || r.siteRegion?.trim() || null,
      facilityName: r.facilityName,
      city: r.city,
      state: r.state,
      workSiteId: r.workSiteId,
      weeklySchedule: r.weeklySchedule,
      scheduleType: r.scheduleType,
    }));
  }

  private buildProfileWhere(filters: MasterAvailabilityFilters): SQL {
    const conditions: SQL[] = [
      eq(profiles.company, filters.company),
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

    const liaisonFilter = filters.liaisonIds?.length
      ? filters.liaisonIds
      : filters.liaisonId
        ? [filters.liaisonId]
        : undefined;
    if (liaisonFilter?.length) {
      conditions.push(inArray(profiles.liaisonId, liaisonFilter));
    }

    if (filters.recruiterIds?.length) {
      conditions.push(inArray(profiles.recruiterId, filters.recruiterIds));
    }

    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim()}%`;
      conditions.push(
        or(
          ilike(profiles.fullName, pattern),
          ilike(profiles.email, pattern),
          ilike(profiles.specialty, pattern),
        )!,
      );
    }
    const regionFilter = filters.regions?.length
      ? filters.regions
      : filters.region
        ? [filters.region]
        : undefined;
    if (regionFilter?.length) {
      const regionConditions = regionFilter.map(
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
      conditions.push(or(...regionConditions)!);
    }

    return and(...conditions)!;
  }
}

