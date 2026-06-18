import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, exists, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  AnnouncementAudienceFilters,
  AnnouncementAudienceRow,
  AnnouncementFilterOptions,
  AnnouncementHistoryRow,
  AnnouncementInboxItem,
  AnnouncementRow,
  IAnnouncementsRepository,
  IDbClient,
} from './interface';
import {
  announcementRecipients,
  announcements,
  assignments,
  profiles,
  userRoles,
  workSites,
} from './db/schema';

@Injectable()
export class AnnouncementsRepository implements IAnnouncementsRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  async listAudience(filters: AnnouncementAudienceFilters): Promise<AnnouncementAudienceRow[]> {
    const where = this.buildAudienceWhere(filters);
    const rows = await this.dbClient.db
      .select({
        userId: profiles.userId,
        fullName: profiles.fullName,
        email: profiles.email,
        company: profiles.company,
        region: profiles.region,
        liaisonName: profiles.liaisonName,
        recruiterName: profiles.recruiterName,
        scheduleType: profiles.scheduleType,
        facilityName: profiles.facilityName,
        specialty: profiles.specialty,
      })
      .from(profiles)
      .where(where)
      .orderBy(profiles.fullName);

    return rows.map((r) => ({
      userId: r.userId,
      fullName: r.fullName,
      email: r.email,
      company: r.company,
      region: r.region,
      liaisonName: r.liaisonName,
      recruiterName: r.recruiterName,
      scheduleType: r.scheduleType,
      facilityName: r.facilityName,
      specialty: r.specialty,
    }));
  }

  async getFilterOptions(): Promise<AnnouncementFilterOptions> {
    const audienceWhere = this.buildAudienceWhere({});

    const liaisonRows = await this.dbClient.db
      .selectDistinct({ name: profiles.liaisonName })
      .from(profiles)
      .where(and(audienceWhere, sql`${profiles.liaisonName} IS NOT NULL`));

    const recruiterRows = await this.dbClient.db
      .selectDistinct({ name: profiles.recruiterName })
      .from(profiles)
      .where(and(audienceWhere, sql`${profiles.recruiterName} IS NOT NULL`));

    const regionRows = await this.dbClient.db
      .selectDistinct({ region: profiles.region })
      .from(profiles)
      .where(and(audienceWhere, sql`${profiles.region} IS NOT NULL`));

    const specialtyRows = await this.dbClient.db
      .selectDistinct({ specialty: profiles.specialty })
      .from(profiles)
      .where(and(audienceWhere, sql`${profiles.specialty} IS NOT NULL`));

    const facilityRows = await this.dbClient.db
      .selectDistinct({ facilityName: workSites.facilityName })
      .from(workSites)
      .orderBy(asc(workSites.facilityName));

    const profileFacilityRows = await this.dbClient.db
      .selectDistinct({ facilityName: profiles.facilityName })
      .from(profiles)
      .where(and(audienceWhere, sql`${profiles.facilityName} IS NOT NULL`));

    const facilities = new Set<string>();
    for (const r of [...facilityRows, ...profileFacilityRows]) {
      const name = r.facilityName?.trim();
      if (name) facilities.add(name);
    }

    return {
      facilities: [...facilities].sort((a, b) => a.localeCompare(b)),
      liaisonNames: liaisonRows
        .map((r) => r.name)
        .filter((n): n is string => !!n?.trim())
        .sort((a, b) => a.localeCompare(b)),
      recruiterNames: recruiterRows
        .map((r) => r.name)
        .filter((n): n is string => !!n?.trim())
        .sort((a, b) => a.localeCompare(b)),
      regions: regionRows
        .map((r) => r.region)
        .filter((n): n is string => !!n?.trim())
        .sort((a, b) => a.localeCompare(b)),
      specialties: specialtyRows
        .map((r) => r.specialty)
        .filter((n): n is string => !!n?.trim())
        .sort((a, b) => a.localeCompare(b)),
    };
  }

  async createAnnouncement(input: {
    title: string;
    body: string;
    type: string;
    createdBy?: string;
    recipientUserIds: string[];
  }): Promise<{ announcementId: string; recipientCount: number }> {
    return this.dbClient.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(announcements)
        .values({
          title: input.title,
          body: input.body,
          type: input.type,
          createdBy: input.createdBy ?? null,
        })
        .returning({ id: announcements.id });

      const announcementId = inserted[0]?.id;
      if (!announcementId) {
        throw new Error('Failed to create announcement');
      }

      if (input.recipientUserIds.length > 0) {
        await tx.insert(announcementRecipients).values(
          input.recipientUserIds.map((userId) => ({
            announcementId,
            userId,
          })),
        );
      }

      return {
        announcementId,
        recipientCount: input.recipientUserIds.length,
      };
    });
  }

  async listAdminHistory(limit: number): Promise<AnnouncementHistoryRow[]> {
    const rows = await this.dbClient.db
      .select({
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        type: announcements.type,
        createdBy: announcements.createdBy,
        createdAt: announcements.createdAt,
        recipientCount: sql<number>`count(${announcementRecipients.id})::int`,
      })
      .from(announcements)
      .leftJoin(
        announcementRecipients,
        eq(announcementRecipients.announcementId, announcements.id),
      )
      .groupBy(announcements.id)
      .orderBy(desc(announcements.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      type: r.type,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      recipientCount: r.recipientCount ?? 0,
    }));
  }

  async listInboxForUser(userId: string): Promise<AnnouncementInboxItem[]> {
    const rows = await this.dbClient.db
      .select({
        recipientId: announcementRecipients.id,
        readAt: announcementRecipients.readAt,
        id: announcements.id,
        title: announcements.title,
        body: announcements.body,
        type: announcements.type,
        createdBy: announcements.createdBy,
        createdAt: announcements.createdAt,
      })
      .from(announcementRecipients)
      .innerJoin(announcements, eq(announcements.id, announcementRecipients.announcementId))
      .where(eq(announcementRecipients.userId, userId))
      .orderBy(desc(announcements.createdAt));

    return rows.map((r) => ({
      recipientId: r.recipientId,
      readAt: r.readAt,
      announcementId: r.id,
      title: r.title,
      body: r.body,
      type: r.type,
      createdAt: r.createdAt,
    }));
  }

  async markRecipientsRead(userId: string, recipientIds?: string[]): Promise<number> {
    const conditions: SQL[] = [
      eq(announcementRecipients.userId, userId),
      sql`${announcementRecipients.readAt} IS NULL`,
    ];
    if (recipientIds?.length) {
      conditions.push(inArray(announcementRecipients.id, recipientIds));
    }

    const updated = await this.dbClient.db
      .update(announcementRecipients)
      .set({ readAt: new Date() })
      .where(and(...conditions))
      .returning({ id: announcementRecipients.id });

    return updated.length;
  }

  private buildAudienceWhere(filters: AnnouncementAudienceFilters): SQL {
    const conditions: SQL[] = [
      eq(profiles.portalType, 'provider'),
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

    if (filters.company?.trim()) {
      conditions.push(eq(profiles.company, filters.company.trim()));
    }

    if (filters.scheduleType) {
      conditions.push(eq(profiles.scheduleType, filters.scheduleType));
    }

    if (filters.q?.trim()) {
      const pattern = `%${filters.q.trim()}%`;
      conditions.push(
        or(ilike(profiles.fullName, pattern), ilike(profiles.email, pattern))!,
      );
    }

    if (filters.regions?.length) {
      conditions.push(inArray(profiles.region, filters.regions));
    }

    if (filters.liaisonNames?.length) {
      conditions.push(inArray(profiles.liaisonName, filters.liaisonNames));
    }

    if (filters.recruiterNames?.length) {
      conditions.push(inArray(profiles.recruiterName, filters.recruiterNames));
    }

    if (filters.specialties?.length) {
      conditions.push(inArray(profiles.specialty, filters.specialties));
    }

    if (filters.facilityNames?.length) {
      conditions.push(inArray(profiles.facilityName, filters.facilityNames));
    }

    return and(...conditions)!;
  }
}
