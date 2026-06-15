/**
 * scheduling persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type {
  IDbClient,
  ISchedulingRepository,
  ProfileRow,
  TimeOffRequestRow,
  WorkSiteRow,
} from './interface';
import { profiles, timeOffRequests, workSites } from './db/schema';

// =============================================================================
// Scheduling (Q1–Q4)
// Used by: TOKENS.SchedulingRepository — future corporate review queue
// =============================================================================

/**
 * SchedulingRepository — Drizzle implementation of persistence contracts.
 */
@Injectable()
export class SchedulingRepository implements ISchedulingRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  /**
   * Loads a provider or staff profile by Supabase auth user id.
   */
  async findProfileByUserId(userId: string): Promise<ProfileRow | null> {
    const rows = await this.dbClient.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Loads a work site row by primary key (scheduling context).
   */
  async findWorkSiteById(id: string): Promise<WorkSiteRow | null> {
    const rows = await this.dbClient.db
      .select()
      .from(workSites)
      .where(eq(workSites.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Lists time-off requests in `pending_review` for the corporate review queue.
   */
  async listPendingTimeOffForReview(filters: {
    recruiterId?: string;
    workSiteId?: string;
    limit: number;
    offset: number;
  }): Promise<TimeOffRequestRow[]> {
    const conditions = [eq(timeOffRequests.status, 'pending_review')];
    if (filters.recruiterId) {
      conditions.push(eq(timeOffRequests.recruiterId, filters.recruiterId));
    }
    if (filters.workSiteId) {
      conditions.push(eq(timeOffRequests.workSiteId, filters.workSiteId));
    }

    return this.dbClient.db
      .select()
      .from(timeOffRequests)
      .where(and(...conditions))
      .orderBy(desc(timeOffRequests.requestDate))
      .limit(filters.limit)
      .offset(filters.offset);
  }
}

