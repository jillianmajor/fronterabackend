/**
 * schedule-change-approvals persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, exists, gte, ilike, inArray, lte, or, sql, type SQL } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  IDbClient,
  IScheduleChangeApprovalsRepository,
  PacrDocumentMeta,
  ScheduleChangeApprovalsFilterOptions,
  ScheduleChangeApprovalsFilters,
  ScheduleChangeRequestRow,
} from './interface';
import {
  assignments,
  documents,
  onboardingCompanies,
  profiles,
  providerWorkSites,
  timeOffRequests,
  userRoles,
  workSites,
} from './db/schema';
import { mapRowToScheduleChangeRequest } from './utils/schedule-change-approvals.util';

// =============================================================================
// Schedule Change Approvals
// Used by: TOKENS.ScheduleChangeApprovalsRepository — /admin/schedule-change-approvals/*
// =============================================================================

/**
 * ScheduleChangeApprovalsRepository — pending time-off review queue and decisions.
 */
@Injectable()
export class ScheduleChangeApprovalsRepository implements IScheduleChangeApprovalsRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  /**
   * Liaison and region options for the approvals filter bar.
   */
  async getFilterOptions(company: string): Promise<ScheduleChangeApprovalsFilterOptions> {
    const profileWhere = this.buildProfileWhere({ company });

    const companyRows = await this.dbClient.db
      .select({ name: onboardingCompanies.name })
      .from(onboardingCompanies)
      .where(eq(onboardingCompanies.isActive, true))
      .orderBy(onboardingCompanies.sortOrder);

    const liaisonRows = await this.dbClient.db
      .selectDistinct({
        id: profiles.liaisonId,
        name: profiles.liaisonName,
      })
      .from(profiles)
      .where(and(profileWhere, sql`${profiles.liaisonId} IS NOT NULL`));

    const profileRegionRows = await this.dbClient.db
      .selectDistinct({ region: profiles.region })
      .from(profiles)
      .where(and(profileWhere, sql`${profiles.region} IS NOT NULL`));

    const siteRegionRows = await this.dbClient.db
      .selectDistinct({ region: workSites.region })
      .from(profiles)
      .innerJoin(providerWorkSites, eq(providerWorkSites.providerId, profiles.userId))
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(and(profileWhere, sql`${workSites.region} IS NOT NULL`));

    const regions = new Set<string>();
    for (const r of [...profileRegionRows, ...siteRegionRows]) {
      const v = r.region?.trim();
      if (v) regions.add(v);
    }

    return {
      companies: companyRows.map((c) => c.name),
      liaisons: liaisonRows
        .filter((l) => l.id && l.name)
        .map((l) => ({ id: l.id!, name: l.name! }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      regions: [...regions].sort((a, b) => a.localeCompare(b)),
    };
  }

  /**
   * Time-off rows for list/calendar (newest per provider+date first for dedupe).
   */
  async listRequests(
    filters: ScheduleChangeApprovalsFilters,
    dateRange?: { start: string; end: string },
  ): Promise<ScheduleChangeRequestRow[]> {
    const profileWhere = this.buildProfileWhere(filters);
    const conditions: SQL[] = [
      profileWhere,
      inArray(timeOffRequests.changeType, ['remove_day', 'modify_shift', 'swap']),
    ];
    if (dateRange) {
      conditions.push(gte(timeOffRequests.requestDate, dateRange.start));
      conditions.push(lte(timeOffRequests.requestDate, dateRange.end));
    }

    const rows = await this.dbClient.db
      .select({
        requestId: timeOffRequests.id,
        requestDate: timeOffRequests.requestDate,
        startTime: timeOffRequests.startTime,
        endTime: timeOffRequests.endTime,
        isUnavailable: timeOffRequests.isUnavailable,
        changeType: timeOffRequests.changeType,
        status: timeOffRequests.status,
        notes: timeOffRequests.notes,
        reviewNotes: timeOffRequests.reviewNotes,
        reviewedBy: timeOffRequests.reviewedBy,
        reviewedAt: timeOffRequests.reviewedAt,
        pacrDocumentId: timeOffRequests.pacrDocumentId,
        createdAt: timeOffRequests.createdAt,
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        providerEmail: profiles.email,
        liaisonId: profiles.liaisonId,
        liaisonName: profiles.liaisonName,
        profileRegion: profiles.region,
        primarySiteRegion: workSites.region,
        weeklySchedule: providerWorkSites.weeklySchedule,
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
      .where(and(...conditions))
      .orderBy(desc(timeOffRequests.createdAt), timeOffRequests.requestDate);

    return rows.map((r) => mapRowToScheduleChangeRequest(r));
  }

  /**
   * Count of pending_review rows matching filters (list tab header).
   */
  async countPending(filters: ScheduleChangeApprovalsFilters): Promise<number> {
    const profileWhere = this.buildProfileWhere(filters);
    const result = await this.dbClient.db
      .select({ count: sql<number>`count(*)::int` })
      .from(timeOffRequests)
      .innerJoin(profiles, eq(profiles.userId, timeOffRequests.providerId))
      .where(
        and(
          profileWhere,
          eq(timeOffRequests.status, 'pending_review'),
          inArray(timeOffRequests.changeType, ['remove_day', 'modify_shift', 'swap']),
        ),
      );
    return result[0]?.count ?? 0;
  }

  /**
   * Single request for the review dialog.
   */
  async findRequestById(id: string): Promise<ScheduleChangeRequestRow | null> {
    const rows = await this.dbClient.db
      .select({
        requestId: timeOffRequests.id,
        requestDate: timeOffRequests.requestDate,
        startTime: timeOffRequests.startTime,
        endTime: timeOffRequests.endTime,
        isUnavailable: timeOffRequests.isUnavailable,
        changeType: timeOffRequests.changeType,
        status: timeOffRequests.status,
        notes: timeOffRequests.notes,
        reviewNotes: timeOffRequests.reviewNotes,
        reviewedBy: timeOffRequests.reviewedBy,
        reviewedAt: timeOffRequests.reviewedAt,
        pacrDocumentId: timeOffRequests.pacrDocumentId,
        createdAt: timeOffRequests.createdAt,
        providerUserId: profiles.userId,
        providerName: profiles.fullName,
        providerEmail: profiles.email,
        liaisonId: profiles.liaisonId,
        liaisonName: profiles.liaisonName,
        profileRegion: profiles.region,
        primarySiteRegion: workSites.region,
        weeklySchedule: providerWorkSites.weeklySchedule,
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
      .where(eq(timeOffRequests.id, id))
      .limit(1);
    const row = rows[0];
    return row ? mapRowToScheduleChangeRequest(row) : null;
  }

  /**
   * PACR document metadata linked on a time-off request.
   */
  async findPacrDocument(requestId: string): Promise<PacrDocumentMeta | null> {
    const rows = await this.dbClient.db
      .select({
        documentId: documents.id,
        fileName: documents.originalFilename,
        mimeType: documents.mimeType,
        storagePath: documents.storagePath,
        bucket: documents.bucket,
      })
      .from(timeOffRequests)
      .innerJoin(documents, eq(documents.id, timeOffRequests.pacrDocumentId))
      .where(eq(timeOffRequests.id, requestId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      documentId: row.documentId,
      fileName: row.fileName,
      mimeType: row.mimeType,
      storagePath: row.storagePath,
      bucket: row.bucket,
    };
  }

  /**
   * Approve a pending request; optional hour adjustment writes start/end times.
   */
  async approveRequest(
    id: string,
    input: {
      reviewedBy?: string;
      reviewNotes?: string;
      adjustHours?: boolean;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<ScheduleChangeRequestRow | null> {
    const patch: Record<string, unknown> = {
      status: 'approved',
      reviewedBy: input.reviewedBy ?? null,
      reviewedAt: new Date(),
      reviewNotes: input.reviewNotes ?? null,
      updatedAt: new Date(),
    };
    if (input.adjustHours) {
      if (input.startTime) patch.startTime = input.startTime;
      if (input.endTime) patch.endTime = input.endTime;
      patch.isUnavailable = false;
    }

    const updated = await this.dbClient.db
      .update(timeOffRequests)
      .set(patch)
      .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.status, 'pending_review')))
      .returning({ id: timeOffRequests.id });

    if (!updated.length) return null;
    return this.findRequestById(id);
  }

  /**
   * Deny a pending request (review notes required at service layer).
   */
  async denyRequest(
    id: string,
    input: { reviewedBy?: string; reviewNotes: string },
  ): Promise<ScheduleChangeRequestRow | null> {
    const updated = await this.dbClient.db
      .update(timeOffRequests)
      .set({
        status: 'denied',
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes,
        updatedAt: new Date(),
      })
      .where(and(eq(timeOffRequests.id, id), eq(timeOffRequests.status, 'pending_review')))
      .returning({ id: timeOffRequests.id });

    if (!updated.length) return null;
    return this.findRequestById(id);
  }

  /**
   * Approve or deny many pending requests with shared review notes.
   */
  async bulkDecide(
    ids: string[],
    decision: 'approved' | 'denied',
    input: { reviewedBy?: string; reviewNotes?: string },
  ): Promise<{ updatedIds: string[]; skippedIds: string[] }> {
    if (ids.length === 0) {
      return { updatedIds: [], skippedIds: [] };
    }

    const status = decision === 'approved' ? 'approved' : 'denied';
    const updated = await this.dbClient.db
      .update(timeOffRequests)
      .set({
        status,
        reviewedBy: input.reviewedBy ?? null,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(and(inArray(timeOffRequests.id, ids), eq(timeOffRequests.status, 'pending_review')))
      .returning({ id: timeOffRequests.id });

    const updatedIds = updated.map((r) => r.id);
    const updatedSet = new Set(updatedIds);
    const skippedIds = ids.filter((id) => !updatedSet.has(id));
    return { updatedIds, skippedIds };
  }

  private buildProfileWhere(filters: ScheduleChangeApprovalsFilters): SQL {
    const conditions: SQL[] = [
      eq(profiles.company, filters.company),
      eq(profiles.scheduleType, 'set'),
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

