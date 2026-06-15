import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  ClientScheduleRow,
  IClientSchedulesRepository,
  IDbClient,
} from './interface';
import {
  profiles,
  providerWorkSites,
  timeOffRequests,
  userRoles,
  workSites,
} from './db/schema';
import { parseMonthYear } from './utils/master-availability.util';

@Injectable()
export class ClientSchedulesRepository implements IClientSchedulesRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  async listOptumSchedules(monthYear: string): Promise<ClientScheduleRow[]> {
    const { start, end } = parseMonthYear(monthYear);

    const roleRows = await this.dbClient.db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.role, 'provider_user'));

    const providerIds = roleRows.map((r) => r.userId);
    if (providerIds.length === 0) return [];

    const assignmentRows = await this.dbClient.db
      .select({
        providerUserId: profiles.userId,
        fullName: profiles.fullName,
        specialty: profiles.specialty,
        region: profiles.region,
        recruiterName: profiles.recruiterName,
        recruiterEmail: profiles.recruiterEmail,
        recruiterPhone: profiles.recruiterPhone,
        liaisonName: profiles.liaisonName,
        liaisonEmail: profiles.liaisonEmail,
        liaisonPhone: profiles.liaisonPhone,
        workSiteId: workSites.id,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        weeklySchedule: providerWorkSites.weeklySchedule,
      })
      .from(providerWorkSites)
      .innerJoin(profiles, eq(profiles.userId, providerWorkSites.providerId))
      .innerJoin(workSites, eq(workSites.id, providerWorkSites.workSiteId))
      .where(
        and(inArray(profiles.userId, providerIds), eq(workSites.clientName, 'Optum')),
      );

    const timeOffRows = await this.dbClient.db
      .select({
        providerId: timeOffRequests.providerId,
        requestDate: timeOffRequests.requestDate,
      })
      .from(timeOffRequests)
      .where(
        and(
          inArray(timeOffRequests.providerId, providerIds),
          gte(timeOffRequests.requestDate, start),
          lte(timeOffRequests.requestDate, end),
          ne(timeOffRequests.status, 'denied'),
        ),
      );

    const timeOffByProvider = new Map<string, string[]>();
    for (const row of timeOffRows) {
      const list = timeOffByProvider.get(row.providerId) ?? [];
      list.push(String(row.requestDate));
      timeOffByProvider.set(row.providerId, list);
    }

    return assignmentRows.map((r) => ({
      providerUserId: r.providerUserId,
      fullName: r.fullName,
      specialty: r.specialty,
      region: r.region,
      recruiterName: r.recruiterName,
      recruiterEmail: r.recruiterEmail,
      recruiterPhone: r.recruiterPhone,
      liaisonName: r.liaisonName,
      liaisonEmail: r.liaisonEmail,
      liaisonPhone: r.liaisonPhone,
      site: {
        id: r.workSiteId,
        facilityName: r.facilityName,
        city: r.city,
        state: r.state,
      },
      weeklySchedule: (Array.isArray(r.weeklySchedule) ? r.weeklySchedule : []).flatMap((shift) => {
        if (
          shift &&
          typeof shift === 'object' &&
          'day' in shift &&
          'start' in shift &&
          'end' in shift
        ) {
          const s = shift as { day: string; start: string; end: string };
          return [{ day: s.day, start: s.start, end: s.end }];
        }
        return [];
      }),
      timeOffDates: timeOffByProvider.get(r.providerUserId) ?? [],
    }));
  }
}
