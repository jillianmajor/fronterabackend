import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { DomainErrors } from '../../common/errors/domain-errors';
import { TOKENS } from '../../config/tokens';
import type {
  IDbClient,
  IProviderSchedulingRepository,
  ProviderPrnAvailabilityDay,
  ProviderPrnAvailabilityMonthView,
  ProviderSchedulingContext,
  ProviderSetTimeOffDay,
  ProviderSetTimeOffMonthView,
  SubmitPrnAvailabilityInput,
  SubmitPrnAvailabilityResult,
  SubmitSetTimeOffInput,
  SubmitSetTimeOffResult,
  ProviderDocumentInsertInput,
  PacrDocumentMeta,
} from './interface';
import {
  assignments,
  documents,
  monthlyAvailabilityRequests,
  profiles,
  providerWorkSites,
  timeOffRequests,
  userRoles,
  workSites,
} from './db/schema';
import { submissionDeadlineForTargetMonth } from './utils/schedule-change-approvals.util';
import { formatTimeFromDb, parseMonthYear } from './utils/master-availability.util';

@Injectable()
export class ProviderSchedulingRepository implements IProviderSchedulingRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  async getSchedulingContext(providerUserId: string): Promise<ProviderSchedulingContext> {
    const context = await this.loadProviderContext(providerUserId);
    return context;
  }

  async assertPrnProvider(providerUserId: string): Promise<ProviderSchedulingContext> {
    const context = await this.loadProviderContext(providerUserId);
    if (context.scheduleType !== 'prn') {
      throw DomainErrors.providerNotPrn();
    }
    return context;
  }

  async assertSetProvider(providerUserId: string): Promise<ProviderSchedulingContext> {
    const context = await this.loadProviderContext(providerUserId);
    if (context.scheduleType !== 'set') {
      throw DomainErrors.providerNotSet();
    }
    return context;
  }

  private async loadProviderContext(providerUserId: string): Promise<ProviderSchedulingContext> {
    const row = await this.dbClient.db
      .select({
        userId: profiles.userId,
        fullName: profiles.fullName,
        email: profiles.email,
        scheduleType: profiles.scheduleType,
        recruiterName: profiles.recruiterName,
        liaisonName: profiles.liaisonName,
      })
      .from(profiles)
      .where(eq(profiles.userId, providerUserId))
      .limit(1);

    const profile = row[0];
    if (!profile) {
      throw DomainErrors.providerProfileNotFound();
    }

    const role = await this.dbClient.db
      .select({ role: userRoles.role })
      .from(userRoles)
      .where(
        and(eq(userRoles.userId, providerUserId), eq(userRoles.role, 'provider_user')),
      )
      .limit(1);

    if (!role[0]) {
      throw DomainErrors.notProviderUser();
    }

    const sites = await this.dbClient.db
      .select({
        workSiteId: providerWorkSites.workSiteId,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        isPrimary: providerWorkSites.isPrimary,
        clientName: workSites.clientName,
      })
      .from(providerWorkSites)
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(eq(providerWorkSites.providerId, providerUserId))
      .orderBy(desc(providerWorkSites.isPrimary), workSites.facilityName);

    const primary = sites.find((s) => s.isPrimary) ?? sites[0];

    return {
      fullName: profile.fullName,
      email: profile.email,
      scheduleType: profile.scheduleType,
      recruiterName: profile.recruiterName,
      liaisonName: profile.liaisonName,
      clientName: primary?.clientName ?? 'Optum',
      workSites: sites.map((s) => ({
        workSiteId: s.workSiteId,
        facilityName: s.facilityName,
        city: s.city,
        state: s.state,
        isPrimary: s.isPrimary,
      })),
    };
  }

  async getAvailabilityMonth(
    providerUserId: string,
    monthYear: string,
  ): Promise<ProviderPrnAvailabilityMonthView> {
    const { end } = parseMonthYear(monthYear);
    const deadline = submissionDeadlineForTargetMonth(monthYear);
    const today = new Date().toISOString().slice(0, 10);
    const isPastDeadline = today > deadline;

    const monthlyRows = await this.dbClient.db
      .select({
        monthlyRequestId: monthlyAvailabilityRequests.id,
        monthYear: monthlyAvailabilityRequests.monthYear,
        status: monthlyAvailabilityRequests.status,
        deadline: monthlyAvailabilityRequests.deadline,
        submittedAt: monthlyAvailabilityRequests.submittedAt,
        noChanges: monthlyAvailabilityRequests.noChanges,
      })
      .from(monthlyAvailabilityRequests)
      .where(
        and(
          eq(monthlyAvailabilityRequests.providerId, providerUserId),
          eq(monthlyAvailabilityRequests.monthYear, monthYear),
        ),
      )
      .limit(1);

    const dayRows = await this.dbClient.db
      .select({
        requestId: timeOffRequests.id,
        requestDate: timeOffRequests.requestDate,
        startTime: timeOffRequests.startTime,
        endTime: timeOffRequests.endTime,
        notes: timeOffRequests.notes,
        workSiteId: timeOffRequests.workSiteId,
        changeType: timeOffRequests.changeType,
        status: timeOffRequests.status,
        createdAt: timeOffRequests.createdAt,
      })
      .from(timeOffRequests)
      .where(
        and(
          eq(timeOffRequests.providerId, providerUserId),
          gte(timeOffRequests.requestDate, monthYear),
          lte(timeOffRequests.requestDate, end),
        ),
      )
      .orderBy(desc(timeOffRequests.createdAt), timeOffRequests.requestDate);

    const seen = new Set<string>();
    const days: ProviderPrnAvailabilityDay[] = [];
    for (const r of dayRows) {
      const dateKey = String(r.requestDate);
      if (seen.has(dateKey)) continue;
      seen.add(dateKey);
      days.push({
        requestId: r.requestId,
        requestDate: dateKey,
        startTime: formatTimeFromDb(r.startTime),
        endTime: formatTimeFromDb(r.endTime),
        notes: r.notes,
        workSiteId: r.workSiteId,
        changeType: r.changeType,
        status: r.status,
      });
    }

    const m = monthlyRows[0];
    return {
      monthYear,
      deadline,
      isPastDeadline,
      pacrRequired: isPastDeadline,
      monthlyRequest: m
        ? {
            monthlyRequestId: m.monthlyRequestId,
            monthYear: String(m.monthYear),
            status: m.status,
            deadline: String(m.deadline),
            submittedAt: m.submittedAt?.toISOString() ?? null,
            noChanges: m.noChanges,
          }
        : null,
      days,
    };
  }

  async submitPrnAvailability(
    input: SubmitPrnAvailabilityInput,
  ): Promise<SubmitPrnAvailabilityResult> {
    const profileRows = await this.dbClient.db
      .select({
        recruiterId: profiles.recruiterId,
        liaisonId: profiles.liaisonId,
        specialty: profiles.specialty,
      })
      .from(profiles)
      .where(eq(profiles.userId, input.providerUserId))
      .limit(1);

    const profile = profileRows[0];
    if (!profile) {
      throw DomainErrors.providerProfileNotFound();
    }

    const deadline = submissionDeadlineForTargetMonth(input.monthYear);
    const submissionGroupId = randomUUID();
    const now = new Date();

    return this.dbClient.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: monthlyAvailabilityRequests.id })
        .from(monthlyAvailabilityRequests)
        .where(
          and(
            eq(monthlyAvailabilityRequests.providerId, input.providerUserId),
            eq(monthlyAvailabilityRequests.monthYear, input.monthYear),
          ),
        )
        .limit(1);

      let monthlyRequestId: string;

      if (existing[0]) {
        monthlyRequestId = existing[0].id;
        await tx
          .update(monthlyAvailabilityRequests)
          .set({
            deadline,
            status: 'submitted',
            noChanges: input.noChanges,
            submittedAt: now,
            submissionGroupId,
            updatedAt: now,
          })
          .where(eq(monthlyAvailabilityRequests.id, monthlyRequestId));

        const { end } = parseMonthYear(input.monthYear);
        await tx
          .delete(timeOffRequests)
          .where(
            and(
              eq(timeOffRequests.providerId, input.providerUserId),
              gte(timeOffRequests.requestDate, input.monthYear),
              lte(timeOffRequests.requestDate, end),
              eq(timeOffRequests.status, 'pending_review'),
            ),
          );
      } else {
        monthlyRequestId = randomUUID();
        await tx.insert(monthlyAvailabilityRequests).values({
          id: monthlyRequestId,
          providerId: input.providerUserId,
          monthYear: input.monthYear,
          deadline,
          status: 'submitted',
          noChanges: input.noChanges,
          submittedAt: now,
          submissionGroupId,
        });
      }

      if (!input.noChanges && input.days.length > 0) {
        await tx.insert(timeOffRequests).values(
          input.days.map((day) => ({
            providerId: input.providerUserId,
            recruiterId: profile.recruiterId,
            liaisonId: profile.liaisonId,
            workSiteId: day.workSiteId,
            requestDate: day.requestDate,
            startTime: day.startTime,
            endTime: day.endTime,
            isUnavailable: false,
            changeType: 'add_day' as const,
            status: 'pending_review' as const,
            clientName: 'Optum',
            specialty: profile.specialty,
            notes: day.notes ?? null,
            submissionGroupId,
            pacrDocumentId: input.pacrDocumentId ?? null,
          })),
        );
      }

      return {
        monthlyRequestId,
        submissionGroupId,
        dayCount: input.noChanges ? 0 : input.days.length,
        status: 'submitted',
      };
    });
  }

  async getTimeOffMonth(
    providerUserId: string,
    monthYear: string,
  ): Promise<ProviderSetTimeOffMonthView> {
    const { end } = parseMonthYear(monthYear);
    const deadline = submissionDeadlineForTargetMonth(monthYear);
    const today = new Date().toISOString().slice(0, 10);
    const isPastDeadline = today > deadline;

    const siteRows = await this.dbClient.db
      .select({ weeklySchedule: providerWorkSites.weeklySchedule })
      .from(providerWorkSites)
      .where(
        and(
          eq(providerWorkSites.providerId, providerUserId),
          eq(providerWorkSites.isPrimary, true),
        ),
      )
      .limit(1);

    const monthlyRows = await this.dbClient.db
      .select({
        monthlyRequestId: monthlyAvailabilityRequests.id,
        monthYear: monthlyAvailabilityRequests.monthYear,
        status: monthlyAvailabilityRequests.status,
        deadline: monthlyAvailabilityRequests.deadline,
        submittedAt: monthlyAvailabilityRequests.submittedAt,
        noChanges: monthlyAvailabilityRequests.noChanges,
      })
      .from(monthlyAvailabilityRequests)
      .where(
        and(
          eq(monthlyAvailabilityRequests.providerId, providerUserId),
          eq(monthlyAvailabilityRequests.monthYear, monthYear),
        ),
      )
      .limit(1);

    const dayRows = await this.dbClient.db
      .select({
        requestId: timeOffRequests.id,
        requestDate: timeOffRequests.requestDate,
        startTime: timeOffRequests.startTime,
        endTime: timeOffRequests.endTime,
        notes: timeOffRequests.notes,
        workSiteId: timeOffRequests.workSiteId,
        changeType: timeOffRequests.changeType,
        status: timeOffRequests.status,
      })
      .from(timeOffRequests)
      .where(
        and(
          eq(timeOffRequests.providerId, providerUserId),
          gte(timeOffRequests.requestDate, monthYear),
          lte(timeOffRequests.requestDate, end),
          inArray(timeOffRequests.changeType, ['remove_day', 'modify_shift', 'swap']),
        ),
      )
      .orderBy(desc(timeOffRequests.createdAt), timeOffRequests.requestDate);

    const seen = new Set<string>();
    const days: ProviderSetTimeOffDay[] = [];
    for (const r of dayRows) {
      const dateKey = String(r.requestDate);
      if (seen.has(dateKey)) continue;
      seen.add(dateKey);
      days.push({
        requestId: r.requestId,
        requestDate: dateKey,
        startTime: formatTimeFromDb(r.startTime),
        endTime: formatTimeFromDb(r.endTime),
        notes: r.notes,
        workSiteId: r.workSiteId,
        changeType: r.changeType,
        status: r.status,
      });
    }

    const m = monthlyRows[0];
    return {
      monthYear,
      deadline,
      isPastDeadline,
      pacrRequired: isPastDeadline,
      weeklySchedule: siteRows[0]?.weeklySchedule ?? [],
      monthlyRequest: m
        ? {
            monthlyRequestId: m.monthlyRequestId,
            monthYear: String(m.monthYear),
            status: m.status,
            deadline: String(m.deadline),
            submittedAt: m.submittedAt?.toISOString() ?? null,
            noChanges: m.noChanges,
          }
        : null,
      days,
    };
  }

  async submitSetTimeOff(input: SubmitSetTimeOffInput): Promise<SubmitSetTimeOffResult> {
    const profileRows = await this.dbClient.db
      .select({
        recruiterId: profiles.recruiterId,
        liaisonId: profiles.liaisonId,
        specialty: profiles.specialty,
      })
      .from(profiles)
      .where(eq(profiles.userId, input.providerUserId))
      .limit(1);

    const profile = profileRows[0];
    if (!profile) {
      throw DomainErrors.providerProfileNotFound();
    }

    const deadline = submissionDeadlineForTargetMonth(input.monthYear);
    const submissionGroupId = randomUUID();
    const now = new Date();

    return this.dbClient.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: monthlyAvailabilityRequests.id })
        .from(monthlyAvailabilityRequests)
        .where(
          and(
            eq(monthlyAvailabilityRequests.providerId, input.providerUserId),
            eq(monthlyAvailabilityRequests.monthYear, input.monthYear),
          ),
        )
        .limit(1);

      let monthlyRequestId: string;

      if (existing[0]) {
        monthlyRequestId = existing[0].id;
        await tx
          .update(monthlyAvailabilityRequests)
          .set({
            deadline,
            status: 'submitted',
            noChanges: input.noChanges,
            submittedAt: now,
            submissionGroupId,
            updatedAt: now,
          })
          .where(eq(monthlyAvailabilityRequests.id, monthlyRequestId));

        const { end } = parseMonthYear(input.monthYear);
        await tx
          .delete(timeOffRequests)
          .where(
            and(
              eq(timeOffRequests.providerId, input.providerUserId),
              gte(timeOffRequests.requestDate, input.monthYear),
              lte(timeOffRequests.requestDate, end),
              eq(timeOffRequests.status, 'pending_review'),
              inArray(timeOffRequests.changeType, ['remove_day', 'modify_shift', 'swap']),
            ),
          );
      } else {
        monthlyRequestId = randomUUID();
        await tx.insert(monthlyAvailabilityRequests).values({
          id: monthlyRequestId,
          providerId: input.providerUserId,
          monthYear: input.monthYear,
          deadline,
          status: 'submitted',
          noChanges: input.noChanges,
          submittedAt: now,
          submissionGroupId,
        });
      }

      if (!input.noChanges && input.days.length > 0) {
        await tx.insert(timeOffRequests).values(
          input.days.map((day) => {
            const isRemove = day.changeType === 'remove_day';
            return {
              providerId: input.providerUserId,
              recruiterId: profile.recruiterId,
              liaisonId: profile.liaisonId,
              workSiteId: day.workSiteId,
              requestDate: day.requestDate,
              startTime: isRemove ? null : day.startTime,
              endTime: isRemove ? null : day.endTime,
              isUnavailable: isRemove,
              changeType: day.changeType,
              status: 'pending_review' as const,
              clientName: 'Optum',
              specialty: profile.specialty,
              notes: day.notes ?? null,
              submissionGroupId,
              pacrDocumentId: input.pacrDocumentId ?? null,
            };
          }),
        );
      }

      return {
        monthlyRequestId,
        submissionGroupId,
        dayCount: input.noChanges ? 0 : input.days.length,
        status: 'submitted',
      };
    });
  }

  async findPacrDocumentForProvider(
    documentId: string,
    providerUserId: string,
  ): Promise<PacrDocumentMeta | null> {
    const rows = await this.dbClient.db
      .select({
        documentId: documents.id,
        fileName: documents.originalFilename,
        mimeType: documents.mimeType,
        storagePath: documents.storagePath,
        bucket: documents.bucket,
      })
      .from(documents)
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.ownerId, providerUserId),
          eq(documents.category, 'pacr'),
        ),
      )
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

  async insertPacrDocument(input: ProviderDocumentInsertInput): Promise<{ id: string }> {
    const id = randomUUID();
    await this.dbClient.db.insert(documents).values({
      id,
      fileName: input.originalFilename,
      originalFilename: input.originalFilename,
      storagePath: input.storagePath,
      bucket: input.bucket,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      category: 'pacr',
      roleVisibility: ['provider_user', 'internal_staff', 'admin'],
      ownerId: input.providerUserId,
      uploaderId: input.providerUserId,
    });
    return { id };
  }
}
