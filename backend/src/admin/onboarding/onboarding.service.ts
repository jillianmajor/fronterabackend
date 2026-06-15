import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { AppErrors } from '../../common/errors/app-errors';
import { rethrowAsHttp } from '../../common/errors/to-http.exception';
import { TOKENS } from '../../config/tokens';
import type { IAwsSesGateway } from '../../repository/aws/ses.interface';
import type {
  IOnboardingCatalogRepository,
  IOnboardingRepository,
} from '../../repository/persistence/interface';
import type { IInvitesService } from '../invites/invites.interface';
import { resolveInviteAcceptBaseUrl } from '../onboarding-public-url.util';
import type { CreateProviderDto } from './dto/create-provider.dto';
import type { BulkCreateProvidersDto, BulkProviderInputDto } from './dto/bulk-create-providers.dto';
import type { BulkProviderResultDto } from './dto/bulk-onboarding-response.dto';
import { bulkRowErrorMessage, normalizeCompany, splitProviderName } from './bulk-onboarding.util';
import { parseBulkWorkSchedule } from './bulk-work-schedule.parser';
import { resolveStaffByName } from './resolve-staff-name.util';
import { validateOnboardingWeeklySchedules } from './weekly-schedule.validation';
import type { WorkSiteAssignmentDto } from './dto/work-site-assignment.dto';
import type { StaffOption } from '../../repository/persistence/interface';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @Inject(TOKENS.OnboardingRepository)
    private readonly onboardingRepository: IOnboardingRepository,
    @Inject(TOKENS.OnboardingCatalogRepository)
    private readonly catalogRepository: IOnboardingCatalogRepository,
    @Inject(TOKENS.SesGateway)
    private readonly sesGateway: IAwsSesGateway,
    @Inject(TOKENS.InvitesService)
    private readonly invites: IInvitesService,
    private readonly config: ConfigService,
  ) {}

  async getFormOptions() {
    const [
      staff,
      profileSpecialties,
      profileCompanies,
      workSiteRegions,
      catalogSpecialties,
      catalogCompanies,
      catalogRegions,
      clinicDays,
      employmentTypes,
      scheduleTypes,
      weeklyPresets,
    ] = await Promise.all([
      this.onboardingRepository.listStaffForDropdown(),
      this.onboardingRepository.listDistinctSpecialties(),
      this.onboardingRepository.listDistinctCompanies(),
      this.onboardingRepository.listDistinctRegions(),
      this.catalogRepository.getActiveSpecialtyNames(),
      this.catalogRepository.getActiveCompanyNames(),
      this.catalogRepository.getActiveRegionNames(),
      this.catalogRepository.listClinicDays(false),
      this.catalogRepository.listEmploymentTypes(false),
      this.catalogRepository.listScheduleTypes(false),
      this.catalogRepository.listWeeklyPresets(false),
    ]);

    const specialties = [...new Set([...catalogSpecialties, ...profileSpecialties])].sort((a, b) =>
      a.localeCompare(b),
    );
    const companies = [...new Set([...catalogCompanies, ...profileCompanies])].sort((a, b) =>
      a.localeCompare(b),
    );
    const regions = [...new Set([...catalogRegions, ...workSiteRegions])].sort((a, b) =>
      a.localeCompare(b),
    );

    return {
      recruiters: staff.recruiters,
      liaisons: staff.liaisons,
      specialties,
      companies,
      regions,
      clinicShiftDays: clinicDays.map((d) => d.name),
      weeklySchedulePresets: weeklyPresets.map((p) => ({
        id: p.slug,
        label: p.label,
        shifts: Array.isArray(p.shifts) ? p.shifts : [],
      })),
      employmentTypes: employmentTypes.map((e) => e.code),
      scheduleTypes: scheduleTypes.map((s) => s.code),
    };
  }

  async listWorkSites(state?: string, limit?: number) {
    const rows = await this.onboardingRepository.listWorkSites({
      state: state?.trim() || undefined,
      limit: Math.min(limit ?? 500, 500),
    });
    return this.mapWorkSiteRows(rows);
  }

  async searchWorkSites(query: string, limit = 25) {
    if (!query?.trim()) {
      return [];
    }
    const rows = await this.onboardingRepository.searchWorkSites(
      query.trim(),
      Math.min(limit, 50),
    );
    return this.mapWorkSiteRows(rows);
  }

  private mapWorkSiteRows(
    rows: Awaited<ReturnType<IOnboardingRepository['listWorkSites']>>,
  ) {
    return rows.map((r) => ({
      ...r,
      displayLabel: [r.facilityName, r.city, r.state, r.region].filter(Boolean).join(' — '),
    }));
  }

  async create(dto: CreateProviderDto) {
    return this.executeCreate(dto);
  }

  async bulkCreate(dto: BulkCreateProvidersDto) {
    const sendInvite = dto.sendInvite !== false;
    const [staff, allowedSpecialties, allowedCompanies] = await Promise.all([
      this.onboardingRepository.listStaffForDropdown(),
      this.getAllowedSpecialtiesSet(),
      this.getAllowedCompaniesSet(),
    ]);
    const staffPool = [...staff.recruiters, ...staff.liaisons];
    const seenEmails = new Set<string>();
    const results: BulkProviderResultDto[] = [];

    for (const row of dto.providers) {
      const email = row.email.toLowerCase().trim();
      if (!email) {
        results.push({ email: row.email ?? '', status: 'skipped', error: 'Missing email' });
        continue;
      }
      if (seenEmails.has(email)) {
        results.push({
          email,
          status: 'skipped',
          error: 'Duplicate email in bulk request',
        });
        continue;
      }
      seenEmails.add(email);

      try {
        const existing = await this.onboardingRepository.findProfileByEmail(email);
        if (existing) {
          results.push({
            email,
            status: 'failed',
            error: `Provider with email ${email} already exists`,
          });
          continue;
        }

        const createDto = await this.mapBulkRowToCreateDto(row, {
          staffPool,
          allowedSpecialties,
          allowedCompanies,
          sendInvite,
        });
        const created = await this.executeCreate(createDto);
        results.push({
          email,
          status: 'created',
          userId: created.userId,
          profileId: created.profileId,
          inviteId: created.inviteId,
          inviteSent: created.inviteSent,
          inviteEmailMessageId: created.inviteEmailMessageId,
          inviteError: created.inviteError,
        });
      } catch (err) {
        results.push({
          email,
          status: 'failed',
          error: bulkRowErrorMessage(err),
        });
      }
    }

    return {
      results,
      createdCount: results.filter((r) => r.status === 'created').length,
      failedCount: results.filter((r) => r.status === 'failed').length,
      skippedCount: results.filter((r) => r.status === 'skipped').length,
    };
  }

  private async executeCreate(dto: CreateProviderDto) {
    const primaryCount = dto.workSites.filter((s) => s.isPrimary).length;
    if (primaryCount !== 1) {
      throw AppErrors.primaryWorkSiteRequired();
    }

    const allowedSpecialties = await this.getAllowedSpecialtiesSet();
    const allowedCompanies = await this.getAllowedCompaniesSet();
    if (!allowedSpecialties.has(dto.specialty)) {
      throw AppErrors.invalidSpecialty();
    }
    if (!allowedCompanies.has(dto.company)) {
      throw AppErrors.invalidCompany();
    }

    const allowedRegions = await this.getAllowedRegionsSet();
    const siteIds = new Set<string>();
    for (const site of dto.workSites) {
      if (siteIds.has(site.workSiteId)) {
        throw AppErrors.duplicateWorkSiteId();
      }
      siteIds.add(site.workSiteId);
      if (site.region && !allowedRegions.has(site.region)) {
        throw AppErrors.invalidRegion(site.region);
      }
      const catalogSite = await this.onboardingRepository.findWorkSiteById(site.workSiteId);
      if (!catalogSite) {
        throw AppErrors.workSiteNotFound(site.workSiteId);
      }
      if (site.facility.trim().toLowerCase() !== catalogSite.facilityName.trim().toLowerCase()) {
        throw AppErrors.facilityMismatch(
          site.facility,
          site.workSiteId,
          catalogSite.facilityName,
        );
      }
    }

    validateOnboardingWeeklySchedules({
      scheduleType: dto.scheduleType as 'set' | 'prn',
      defaultWeeklySchedule: dto.defaultWeeklySchedule,
      workSites: dto.workSites.map((s) => ({
        facility: s.facility,
        weeklySchedule: s.weeklySchedule,
      })),
    });

    const isPrn = dto.scheduleType === 'prn';

    const input = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone,
      specialty: dto.specialty,
      licenseState: dto.licenseState,
      employmentType: dto.employmentType,
      scheduleType: dto.scheduleType,
      company: dto.company,
      providerIdExternal: dto.providerIdExternal,
      defaultWeeklySchedule: isPrn ? [] : dto.defaultWeeklySchedule,
      recruiterId: dto.recruiterId,
      liaisonId: dto.liaisonId,
      workSites: dto.workSites.map((s) => ({
        workSiteId: s.workSiteId,
        facility: s.facility.trim(),
        isPrimary: s.isPrimary,
        region: s.region,
        weeklySchedule: isPrn ? [] : (s.weeklySchedule ?? dto.defaultWeeklySchedule ?? []),
      })),
    };

    let created;
    try {
      created = await this.onboardingRepository.createProviderOnboarding(input);
    } catch (err) {
      rethrowAsHttp(err);
    }

    const sendInvite = dto.sendInvite !== false;
    let inviteSent = false;
    let inviteEmailMessageId: string | undefined;
    let inviteError: string | undefined;

    if (sendInvite) {
      try {
        const sent = await this.sendInviteEmail(
          created.inviteToken,
          input.email,
          input.firstName,
        );
        inviteSent = true;
        inviteEmailMessageId = sent.messageId;
      } catch (err) {
        inviteError = err instanceof Error ? err.message : 'Failed to send invite email';
        this.logger.warn(`Invite email failed for ${input.email}: ${inviteError}`);
      }
    }

    return {
      profileId: created.profileId,
      userId: created.userId,
      inviteId: created.inviteId,
      inviteToken: created.inviteToken,
      inviteExpiresAt: created.inviteExpiresAt.toISOString(),
      inviteSent,
      inviteEmailMessageId,
      inviteError,
    };
  }

  private async mapBulkRowToCreateDto(
    row: BulkProviderInputDto,
    context: {
      staffPool: StaffOption[];
      allowedSpecialties: Set<string>;
      allowedCompanies: Set<string>;
      sendInvite: boolean;
    },
  ): Promise<CreateProviderDto> {
    const { firstName, lastName } = splitProviderName(row);
    const scheduleType = (row.scheduleType ?? row.schedule_type ?? 'set').toLowerCase() as
      | 'set'
      | 'prn';
    const employmentRaw = (row.employmentType ?? row.employment_type ?? '').toUpperCase();
    if (employmentRaw !== 'W2' && employmentRaw !== '1099') {
      throw new Error('employment_type must be W2 or 1099');
    }
    const company = normalizeCompany(row.company);
    const licenseState = (row.licenseState ?? row.state ?? '').trim();
    if (!licenseState) {
      throw new Error('state (license state) is required');
    }

    const recruiter =
      row.recruiterId != null
        ? context.staffPool.find((s) => s.userId === row.recruiterId) ??
          (await this.onboardingRepository.findStaffByUserId(row.recruiterId))
        : resolveStaffByName(row.recruiterName ?? row.recruiter_name, context.staffPool);
    if (!recruiter) {
      throw new Error(
        `Recruiter not found: ${row.recruiterName ?? row.recruiter_name ?? row.recruiterId ?? '(missing)'}`,
      );
    }

    const liaisonName = row.liaisonName ?? row.liaison_name;
    const liaison =
      row.liaisonId != null
        ? context.staffPool.find((s) => s.userId === row.liaisonId) ??
          (await this.onboardingRepository.findStaffByUserId(row.liaisonId))
        : resolveStaffByName(liaisonName, context.staffPool);
    if (liaisonName?.trim() && !liaison) {
      throw new Error(`Liaison not found: ${liaisonName}`);
    }

    const workSites = await this.resolveBulkWorkSites(row);
    const defaultWeeklySchedule = parseBulkWorkSchedule(
      scheduleType,
      row.workSchedule ?? row.work_schedule,
    );

    const createDto: CreateProviderDto = {
      firstName,
      lastName,
      email: row.email,
      phone: row.phone,
      specialty: row.specialty.trim(),
      licenseState,
      employmentType: employmentRaw,
      scheduleType,
      company,
      providerIdExternal: row.providerIdExternal ?? row.provider_id_external,
      defaultWeeklySchedule,
      recruiterId: recruiter.userId,
      liaisonId: liaison?.userId,
      workSites,
      sendInvite: context.sendInvite,
    };

    if (!context.allowedSpecialties.has(createDto.specialty)) {
      throw new Error(`Invalid specialty: ${createDto.specialty}`);
    }
    if (!context.allowedCompanies.has(createDto.company)) {
      throw new Error(`Invalid company: ${createDto.company}`);
    }

    return createDto;
  }

  private async resolveBulkWorkSites(row: BulkProviderInputDto): Promise<WorkSiteAssignmentDto[]> {
    if (row.workSites?.length) {
      return row.workSites;
    }

    const assignments = row.workSiteAssignments ?? row.work_site_assignments ?? [];
    const source =
      assignments.length > 0
        ? assignments
        : row.work_site_facility
          ? [
              {
                facility_name: row.work_site_facility,
                city: row.work_site_city,
                state: row.work_site_state,
                is_primary: true,
              },
            ]
          : [];

    if (source.length === 0) {
      throw new Error('At least one work site is required');
    }

    const resolved: WorkSiteAssignmentDto[] = [];
    for (const assignment of source) {
      if (assignment.workSiteId) {
        const site = await this.onboardingRepository.findWorkSiteById(assignment.workSiteId);
        if (!site) {
          throw new Error(`Work site not found: ${assignment.workSiteId}`);
        }
        resolved.push({
          workSiteId: assignment.workSiteId,
          facility: site.facilityName,
          isPrimary: assignment.isPrimary ?? assignment.is_primary ?? false,
          region: site.region ?? undefined,
        });
        continue;
      }

      const facilityName = (assignment.facilityName ?? assignment.facility_name ?? '').trim();
      if (!facilityName) {
        throw new Error('Work site facility name is required');
      }

      const matches = await this.onboardingRepository.findWorkSitesByFacilityName(facilityName, {
        city: assignment.city,
        state: assignment.state,
      });
      if (matches.length === 0) {
        throw new Error(`Work site not found: ${facilityName}`);
      }
      if (matches.length > 1) {
        throw new Error(
          `Ambiguous work site "${facilityName}" — include city and state to disambiguate`,
        );
      }

      const site = matches[0];
      resolved.push({
        workSiteId: site.id,
        facility: site.facilityName,
        isPrimary: assignment.isPrimary ?? assignment.is_primary ?? false,
        region: site.region ?? undefined,
      });
    }

    const primaryCount = resolved.filter((site) => site.isPrimary).length;
    if (primaryCount === 0 && resolved.length === 1) {
      resolved[0].isPrimary = true;
    } else if (primaryCount !== 1) {
      throw new Error('Exactly one work site must be marked primary');
    }

    return resolved;
  }

  async sendInvite(providerUserId: string) {
    const profile = await this.onboardingRepository.findStaffByUserId(providerUserId);
    if (!profile) {
      throw AppErrors.providerProfileNotFound();
    }

    let invite = await this.onboardingRepository.findInviteByProviderUserId(providerUserId);
    const token =
      randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (invite) {
      await this.onboardingRepository.refreshInviteToken(invite.id, token, expiresAt);
      invite = { ...invite, token };
    } else {
      throw AppErrors.noPendingInvite();
    }

    const sent = await this.sendInviteEmail(
      token,
      profile.email ?? '',
      profile.fullName.split(' ')[0] ?? 'Provider',
    );

    return {
      userId: providerUserId,
      inviteSent: true,
      inviteEmailMessageId: sent.messageId,
      inviteExpiresAt: expiresAt.toISOString(),
    };
  }

  private async getAllowedSpecialtiesSet() {
    const [catalog, profiles] = await Promise.all([
      this.catalogRepository.getActiveSpecialtyNames(),
      this.onboardingRepository.listDistinctSpecialties(),
    ]);
    return new Set([...catalog, ...profiles]);
  }

  private async getAllowedCompaniesSet() {
    const [catalog, profiles] = await Promise.all([
      this.catalogRepository.getActiveCompanyNames(),
      this.onboardingRepository.listDistinctCompanies(),
    ]);
    return new Set([...catalog, ...profiles]);
  }

  private async getAllowedRegionsSet() {
    const [catalog, sites] = await Promise.all([
      this.catalogRepository.getActiveRegionNames(),
      this.onboardingRepository.listDistinctRegions(),
    ]);
    return new Set([...catalog, ...sites]);
  }

  private async sendInviteEmail(token: string, email: string, firstName: string) {
    const acceptUrl = `${resolveInviteAcceptBaseUrl(this.config)}/accept-invite?token=${encodeURIComponent(token)}`;
    const { subject, htmlBody, textBody } = this.invites.renderProviderInvite({
      firstName,
      acceptUrl,
    });
    return this.sesGateway.sendEmail({
      to: [email],
      subject,
      htmlBody,
      textBody,
    });
  }
}
