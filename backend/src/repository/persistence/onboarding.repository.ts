/**
 * onboarding persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { DomainErrors } from '../../common/errors/domain-errors';
import { TOKENS } from '../../config/tokens';
import type {
  CreateProviderInput,
  CreateProviderResult,
  IDbClient,
  IOnboardingRepository,
  ProviderInviteByToken,
  StaffOption,
  WeeklyShift,
  WorkSiteSearchRow,
} from './interface';
import {
  assignments,
  organizations,
  profiles,
  providerInvites,
  providerWorkSites,
  userRoles,
  workSites,
} from './db/schema';
import { setSupabaseUserPassword } from './utils/supabase-admin-auth.util';
import {
  ensureAuthIdentity,
  normalizeAuthUserTokenFields,
} from './utils/supabase-auth.util';

// =============================================================================
// Onboard new provider
// Used by: TOKENS.OnboardingRepository — POST /admin/onboarding
// =============================================================================

/**
 * OnboardingRepository — Drizzle implementation of persistence contracts.
 */
@Injectable()
export class OnboardingRepository implements IOnboardingRepository {
  constructor(
    @Inject(TOKENS.DbClient) private readonly dbClient: IDbClient,
    private readonly config: ConfigService,
  ) {}

  /**
   * Legacy distinct specialties from profiles (fallback).
   */
  async listDistinctSpecialties(): Promise<string[]> {
    const rows = await this.dbClient.db
      .selectDistinct({ specialty: profiles.specialty })
      .from(profiles)
      .where(sql`${profiles.specialty} IS NOT NULL`);
    return rows.map((r) => r.specialty?.trim()).filter((s): s is string => !!s);
  }

  /**
   * Legacy distinct companies from profiles (fallback).
   */
  async listDistinctCompanies(): Promise<string[]> {
    const rows = await this.dbClient.db
      .selectDistinct({ company: profiles.company })
      .from(profiles);
    return rows.map((r) => r.company?.trim()).filter((c): c is string => !!c);
  }

  /**
   * Internal staff rows for recruiter and liaison dropdowns.
   */
  async listStaffForDropdown(): Promise<{ recruiters: StaffOption[]; liaisons: StaffOption[] }> {
    const rows = await this.dbClient.db
      .select({
        userId: profiles.userId,
        fullName: profiles.fullName,
        email: profiles.email,
      })
      .from(profiles)
      .innerJoin(userRoles, eq(userRoles.userId, profiles.userId))
      .where(eq(userRoles.role, 'internal_staff'))
      .orderBy(profiles.fullName);

    const staff = rows
      .filter((r) => r.fullName)
      .map((r) => ({
        userId: r.userId,
        fullName: r.fullName!,
        email: r.email,
      }));

    return { recruiters: staff, liaisons: staff };
  }

  /**
   * Legacy distinct regions from work_sites (fallback).
   */
  async listDistinctRegions(): Promise<string[]> {
    const rows = await this.dbClient.db
      .selectDistinct({ region: workSites.region })
      .from(workSites)
      .where(sql`${workSites.region} IS NOT NULL`);
    return rows.map((r) => r.region?.trim()).filter((v): v is string => !!v);
  }

  /**
   * Facilities for onboarding picker (optional state filter, capped limit).
   */
  async listWorkSites(filters: { state?: string; limit: number }): Promise<WorkSiteSearchRow[]> {
    const stateFilter = filters.state?.trim();
    const where = stateFilter ? ilike(workSites.state, stateFilter) : undefined;

    return this.dbClient.db
      .select({
        id: workSites.id,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        region: workSites.region,
        clientName: workSites.clientName,
      })
      .from(workSites)
      .where(where)
      .orderBy(workSites.facilityName)
      .limit(filters.limit);
  }

  /**
   * Typeahead facility search by name, city, state, or region.
   */
  async searchWorkSites(query: string, limit: number): Promise<WorkSiteSearchRow[]> {
    const pattern = `%${query.trim()}%`;
    return this.dbClient.db
      .select({
        id: workSites.id,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        region: workSites.region,
        clientName: workSites.clientName,
      })
      .from(workSites)
      .where(
        or(
          ilike(workSites.facilityName, pattern),
          ilike(workSites.city, pattern),
          ilike(workSites.state, pattern),
          ilike(workSites.region, pattern),
        ),
      )
      .orderBy(workSites.facilityName)
      .limit(limit);
  }

  /**
   * Recruiter or liaison profile for onboarding validation.
   */
  async findStaffByUserId(userId: string): Promise<StaffOption | null> {
    const rows = await this.dbClient.db
      .select({
        userId: profiles.userId,
        fullName: profiles.fullName,
        email: profiles.email,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row?.fullName) return null;
    return { userId: row.userId, fullName: row.fullName, email: row.email };
  }

  /**
   * Facility row for onboarding validation and picker display.
   */
  async findWorkSiteById(id: string): Promise<WorkSiteSearchRow | null> {
    const rows = await this.dbClient.db
      .select({
        id: workSites.id,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        region: workSites.region,
        clientName: workSites.clientName,
      })
      .from(workSites)
      .where(eq(workSites.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Match catalog facilities by name (optional city/state disambiguation).
   */
  async findWorkSitesByFacilityName(
    facilityName: string,
    filters?: { city?: string; state?: string },
  ): Promise<WorkSiteSearchRow[]> {
    const name = facilityName.trim();
    if (!name) return [];

    const conditions = [sql`lower(${workSites.facilityName}) = lower(${name})`];
    const city = filters?.city?.trim();
    const state = filters?.state?.trim();
    if (city) {
      conditions.push(sql`lower(${workSites.city}) = lower(${city})`);
    }
    if (state) {
      conditions.push(sql`lower(${workSites.state}) = lower(${state})`);
    }

    return this.dbClient.db
      .select({
        id: workSites.id,
        facilityName: workSites.facilityName,
        city: workSites.city,
        state: workSites.state,
        region: workSites.region,
        clientName: workSites.clientName,
      })
      .from(workSites)
      .where(and(...conditions))
      .orderBy(workSites.facilityName);
  }

  /**
   * Detect duplicate onboard attempts by provider email.
   */
  async findProfileByEmail(email: string): Promise<{ userId: string } | null> {
    const normalized = email.trim().toLowerCase();
    const rows = await this.dbClient.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(sql`lower(${profiles.email}) = ${normalized}`)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * First client organization id (seed dependency).
   */
  async getDefaultClientOrgId(): Promise<string> {
    const rows = await this.dbClient.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.type, 'client'))
      .limit(1);
    if (!rows[0]) {
      throw DomainErrors.noClientOrganization();
    }
    return rows[0].id;
  }

  /**
   * Corporate onboard — single transaction for all provider rows (ADR 0004).
   *
   * Pre-validates recruiter, liaison, and work sites outside the transaction, then inserts:
   * `auth.users` (placeholder password until `/accept-invite`), `profiles`, `user_roles`,
   * `provider_work_sites`, `assignments`, and `provider_invites`.
   *
   * `profiles.user_id` and `auth.users.id` share `providerUserId` so accept-invite only sets
   * the real password. Invite token is 64 hex chars (two UUIDs); valid 7 days (`expires_at`).
   *
   * SES invite is sent by OnboardingService after this returns — not inside this method.
   */
  async createProviderOnboarding(input: CreateProviderInput): Promise<CreateProviderResult> {
    // --- IDs: providerUserId is the stable key across auth.users, profiles, and scheduling FKs ---
    const providerUserId = randomUUID();
    const profileId = randomUUID();
    const inviteId = randomUUID();
    // Long opaque token for email link — not a JWT; redeemed once via POST /accept-invite.
    const inviteToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const fullName = `${input.firstName.trim()} ${input.lastName.trim()}`.trim();
    const employmentType = input.employmentType.toUpperCase() === '1099' ? '1099' : 'W2';
    const isPrn = input.scheduleType === 'prn';
    const defaultSchedule = isPrn ? [] : (input.defaultWeeklySchedule ?? []);
    // Primary site drives profile facility fields and work_schedule summary text.
    const primarySite = input.workSites.find((s) => s.isPrimary) ?? input.workSites[0];

    // --- Pre-flight: fail fast before opening the transaction ---
    const recruiter = await this.findStaffByUserId(input.recruiterId);
    if (!recruiter) {
      throw DomainErrors.recruiterNotFound();
    }

    const liaison = input.liaisonId ? await this.findStaffByUserId(input.liaisonId) : null;
    if (input.liaisonId && !liaison) {
      throw DomainErrors.liaisonNotFound();
    }

    for (const site of input.workSites) {
      const ws = await this.findWorkSiteById(site.workSiteId);
      if (!ws) {
        throw DomainErrors.workSiteNotFound(site.workSiteId);
      }
    }

    // Optum-only v1: single default client org on assignments (ADR 0001).
    const clientOrgId = await this.getDefaultClientOrgId();

    // Human-readable schedule line on profiles / invite snapshot (e.g. "Monday 8:00 AM - 5:00 PM").
    const workScheduleText = isPrn
      ? null
      : this.formatScheduleText(
          primarySite.weeklySchedule.length > 0 ? primarySite.weeklySchedule : defaultSchedule,
        );

    // Frozen JSON on provider_invites — what was submitted at onboard time (audit / resend).
    const workSiteAssignmentsSnapshot = await Promise.all(
      input.workSites.map(async (site) => {
        const ws = await this.findWorkSiteById(site.workSiteId);
        // Per-site schedule wins; else fall back to defaultWeeklySchedule from the form.
        const schedule = isPrn
          ? []
          : site.weeklySchedule.length > 0
            ? site.weeklySchedule
            : defaultSchedule;
        return {
          workSiteId: site.workSiteId,
          facilityName: site.facility,
          city: ws!.city,
          state: ws!.state,
          region: site.region ?? ws!.region,
          isPrimary: site.isPrimary,
          weeklySchedule: schedule,
        };
      }),
    );

    const primaryWs = await this.findWorkSiteById(primarySite.workSiteId);
    const profileRegion = primarySite.region ?? primaryWs?.region ?? null;
    const primaryFacilityLocation = [primaryWs?.city, primaryWs?.state].filter(Boolean).join(', ');

    // --- All writes atomic: partial onboard must not leave orphan auth.users ---
    await this.dbClient.db.transaction(async (tx) => {
      // Supabase requires a valid auth.instances row; local Docker stub uses all-zero fallback.
      const inst = await tx.execute<{ id: string }>(sql`SELECT id FROM auth.instances LIMIT 1`);
      const instanceId =
        (inst.rows[0] as { id: string } | undefined)?.id ?? '00000000-0000-0000-0000-000000000000';

      // Placeholder bcrypt — replaced on accept-invite; email_confirmed_at stays null until then.
      await tx.execute(sql`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          confirmation_token, recovery_token, email_change_token_new, email_change
        ) VALUES (
          ${instanceId}::uuid, ${providerUserId}::uuid, 'authenticated', 'authenticated',
          ${input.email},
          crypt('pending-invite-not-for-login', gen_salt('bf')),
          NULL, now(), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{}'::jsonb,
          '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          confirmation_token = '',
          recovery_token = '',
          email_change_token_new = '',
          email_change = '',
          updated_at = now()
      `);

      await ensureAuthIdentity(tx, providerUserId, input.email);

      // Denormalized recruiter/liaison names for admin lists without extra joins.
      await tx.insert(profiles).values({
        id: profileId,
        userId: providerUserId,
        email: input.email,
        fullName,
        phone: input.phone ?? null,
        specialty: input.specialty,
        state: input.licenseState,
        employmentType,
        scheduleType: input.scheduleType,
        company: input.company,
        providerId: input.providerIdExternal ?? null,
        workSchedule: workScheduleText,
        region: profileRegion,
        primaryFacilityId: primarySite.workSiteId,
        facilityName: primarySite.facility,
        facilityLocation: primaryFacilityLocation || null,
        recruiterId: input.recruiterId,
        recruiterName: recruiter.fullName,
        recruiterEmail: recruiter.email,
        liaisonId: input.liaisonId ?? null,
        liaisonName: liaison?.fullName ?? null,
        liaisonEmail: liaison?.email ?? null,
        portalType: 'provider',
      });

      // Gates provider portal and provider/* APIs (once JWT guard ships).
      await tx.insert(userRoles).values({
        userId: providerUserId,
        role: 'provider_user',
      });

      // Set-schedule pattern per facility; PRN providers have empty weekly_schedule.
      for (const site of input.workSites) {
        const schedule = isPrn
          ? []
          : site.weeklySchedule.length > 0
            ? site.weeklySchedule
            : defaultSchedule;
        await tx.insert(providerWorkSites).values({
          providerId: providerUserId,
          workSiteId: site.workSiteId,
          isPrimary: site.isPrimary,
          weeklySchedule: schedule,
        });
      }

      // Corporate assignment row — recruiter + Optum client org + active status.
      await tx.insert(assignments).values({
        providerId: providerUserId,
        recruiterId: input.recruiterId,
        clientOrgId,
        specialty: input.specialty,
        status: 'active',
      });

      // Pending invite — used_at set when provider completes Nest accept-invite form.
      await tx.insert(providerInvites).values({
        id: inviteId,
        token: inviteToken,
        email: input.email,
        fullName,
        phone: input.phone ?? null,
        specialty: input.specialty,
        state: input.licenseState,
        employmentType,
        workSchedule: workScheduleText,
        region: profileRegion,
        company: input.company,
        providerIdExternal: input.providerIdExternal ?? null,
        recruiterId: input.recruiterId,
        liaisonId: input.liaisonId ?? null,
        workSiteAssignments: workSiteAssignmentsSnapshot,
        expiresAt: inviteExpiresAt,
      });
    });

    // OnboardingService uses inviteToken for SES link; inviteId for resend.
    return {
      profileId,
      userId: providerUserId,
      inviteId,
      inviteToken,
      inviteExpiresAt,
    };
  }

  /**
   * Latest unused invite for a provider user.
   */
  async findInviteByProviderUserId(
    userId: string,
  ): Promise<{ id: string; token: string; email: string } | null> {
    const rows = await this.dbClient.db
      .select({
        id: providerInvites.id,
        token: providerInvites.token,
        email: providerInvites.email,
      })
      .from(providerInvites)
      .innerJoin(profiles, eq(profiles.email, providerInvites.email))
      .where(and(eq(profiles.userId, userId), sql`${providerInvites.usedAt} IS NULL`))
      .orderBy(sql`${providerInvites.createdAt} DESC`)
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Rotates invite token and expiry on resend.
   */
  async refreshInviteToken(inviteId: string, token: string, expiresAt: Date): Promise<void> {
    await this.dbClient.db
      .update(providerInvites)
      .set({ token, expiresAt })
      .where(eq(providerInvites.id, inviteId));
  }

  async findInviteByToken(token: string): Promise<ProviderInviteByToken | null> {
    const trimmed = token?.trim();
    if (!trimmed) return null;

    const inviteRows = await this.dbClient.db
      .select({
        inviteId: providerInvites.id,
        token: providerInvites.token,
        email: providerInvites.email,
        fullName: providerInvites.fullName,
        expiresAt: providerInvites.expiresAt,
        usedAt: providerInvites.usedAt,
      })
      .from(providerInvites)
      .where(eq(providerInvites.token, trimmed))
      .limit(1);

    const invite = inviteRows[0];
    if (!invite) return null;

    const profileRows = await this.dbClient.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(ilike(profiles.email, invite.email))
      .limit(1);

    const providerUserId = profileRows[0]?.userId;
    if (!providerUserId) return null;

    return {
      inviteId: invite.inviteId,
      token: invite.token,
      email: invite.email,
      fullName: invite.fullName,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
      providerUserId,
    };
  }

  async activateProviderInvite(
    inviteId: string,
    providerUserId: string,
    email: string,
    password: string,
  ): Promise<void> {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')?.trim();
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const useAdminApi = Boolean(supabaseUrl && serviceRoleKey);

    if (useAdminApi) {
      await setSupabaseUserPassword(supabaseUrl!, serviceRoleKey!, providerUserId, password);
    }

    await this.dbClient.db.transaction(async (tx) => {
      // Prefer Admin API when configured; otherwise match `db:repair-invite-auth` SQL.
      if (!useAdminApi) {
        await tx.execute(sql`
          UPDATE auth.users
          SET
            encrypted_password = crypt(${password}, gen_salt('bf')),
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            confirmation_token = COALESCE(confirmation_token, ''),
            recovery_token = COALESCE(recovery_token, ''),
            email_change_token_new = COALESCE(email_change_token_new, ''),
            email_change = COALESCE(email_change, ''),
            updated_at = now()
          WHERE id = ${providerUserId}::uuid
        `);
      } else {
        await normalizeAuthUserTokenFields(tx, providerUserId);
      }

      await ensureAuthIdentity(tx, providerUserId, email);

      await tx
        .update(providerInvites)
        .set({
          usedAt: new Date(),
          createdUserId: providerUserId,
        })
        .where(eq(providerInvites.id, inviteId));
    });
  }

  private formatScheduleText(shifts: WeeklyShift[]): string | null {
    if (!shifts.length) return null;
    const byDay = new Map<string, WeeklyShift[]>();
    for (const s of shifts) {
      const list = byDay.get(s.day) ?? [];
      list.push(s);
      byDay.set(s.day, list);
    }
    const days = [...byDay.keys()];
    const allSame =
      days.length >= 5 &&
      days.every((d) => {
        const a = byDay.get(d)![0];
        return a.startTime === shifts[0].startTime && a.endTime === shifts[0].endTime;
      });
    if (allSame && days.length === 5) {
      return `Monday - Friday, ${shifts[0].startTime} - ${shifts[0].endTime}`;
    }
    return shifts.map((s) => `${s.day} ${s.startTime} - ${s.endTime}`).join(', ');
  }
}

