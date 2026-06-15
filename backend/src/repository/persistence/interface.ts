/**
 * =============================================================================
 * Frontera — persistence layer contracts
 * Repository interfaces and shared row/DTO types for Drizzle implementations.
 * Implementation: repository.ts (all Drizzle query methods). Schema: db/schema.ts
 * =============================================================================
 */

import type { InferSelectModel } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/node-postgres';
import type * as schema from './db/schema';
import type {
  profiles,
  providerInvites,
  scheduleFinalizations,
  timeOffRequests,
  workSites,
} from './db/schema';

// -----------------------------------------------------------------------------
// Database client
// Used by: all *Repository classes via TOKENS.DbClient
// -----------------------------------------------------------------------------

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

export interface IDbClient {
  readonly db: DrizzleDb;
}

// -----------------------------------------------------------------------------
// Shared table row types (Drizzle select models)
// Used by: scheduling repository, future domain repos
// -----------------------------------------------------------------------------

export type ProfileRow = InferSelectModel<typeof profiles>;
export type TimeOffRequestRow = InferSelectModel<typeof timeOffRequests>;
/** Full `work_sites` table row. */
export type WorkSiteRow = InferSelectModel<typeof workSites>;
export type ScheduleFinalizationRow = InferSelectModel<typeof scheduleFinalizations>;
export type ProviderInviteRow = InferSelectModel<typeof providerInvites>;

// -----------------------------------------------------------------------------
// Scheduling (Q1–Q4)
// Used by: SchedulingRepository, AdminSchedulingService
// -----------------------------------------------------------------------------

export interface ISchedulingRepository {
  findProfileByUserId(userId: string): Promise<ProfileRow | null>;
  findWorkSiteById(id: string): Promise<WorkSiteRow | null>;
  listPendingTimeOffForReview(filters: {
    recruiterId?: string;
    workSiteId?: string;
    limit: number;
    offset: number;
  }): Promise<TimeOffRequestRow[]>;
}

// -----------------------------------------------------------------------------
// Active providers (admin list / export)
// Used by: ProvidersRepository, ProvidersService, GET /admin/providers
// -----------------------------------------------------------------------------

export interface ActiveProviderFilters {
  q?: string;
  recruiterId?: string;
  recruiterIds?: string[];
  liaisonId?: string;
  liaisonIds?: string[];
  state?: string;
  states?: string[];
  city?: string;
  cities?: string[];
  region?: string;
  regions?: string[];
  specialty?: string;
  specialties?: string[];
  employmentType?: string;
  employmentTypes?: string[];
}

export interface ActiveProviderRow {
  userId: string;
  profileId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  scheduleSummary: string | null;
  specialty: string | null;
  state: string | null;
  region: string | null;
  employmentType: string | null;
  recruiterId: string | null;
  recruiterName: string | null;
  liaisonId: string | null;
  liaisonName: string | null;
  workSites: string[];
}

export interface ActiveProviderFilterOptions {
  recruiters: { id: string; name: string }[];
  liaisons: { id: string; name: string }[];
  states: string[];
  cities: string[];
  regions: string[];
  specialties: string[];
  employmentTypes: string[];
}

export interface IProvidersRepository {
  listActiveProviders(
    filters: ActiveProviderFilters,
    pagination: { limit: number; offset: number },
  ): Promise<ActiveProviderRow[]>;

  countActiveProviders(filters: ActiveProviderFilters): Promise<number>;

  getActiveProviderFilterOptions(): Promise<ActiveProviderFilterOptions>;
}

// -----------------------------------------------------------------------------
// Onboard new provider
// Used by: OnboardingRepository, OnboardingService, POST /admin/onboarding
// -----------------------------------------------------------------------------

/** Weekly shift row in provider_work_sites.weekly_schedule JSON. */
export interface WeeklyShift {
  day: string;
  startTime: string;
  endTime: string;
}

/** Recruiter or liaison option for onboarding form dropdowns. */
export interface StaffOption {
  userId: string;
  fullName: string;
  email: string | null;
}

/** Facility row for onboarding picker (list + search). */
export interface WorkSiteSearchRow {
  id: string;
  facilityName: string;
  city: string | null;
  state: string | null;
  region: string | null;
  clientName: string;
}

export interface CreateProviderInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  specialty: string;
  licenseState: string;
  employmentType: string;
  scheduleType: string;
  company: string;
  providerIdExternal?: string;
  defaultWeeklySchedule?: WeeklyShift[];
  recruiterId: string;
  liaisonId?: string;
  workSites: {
    workSiteId: string;
    /** Facility label from search selection; must match catalog `work_sites.facility_name`. */
    facility: string;
    isPrimary: boolean;
    /** From form-options.regions; defaults to catalog site region when omitted. */
    region?: string;
    weeklySchedule: WeeklyShift[];
  }[];
}

export interface CreateProviderResult {
  profileId: string;
  userId: string;
  inviteId: string;
  inviteToken: string;
  inviteExpiresAt: Date;
}

/** Invite row resolved from URL token (accept-invite page). */
export interface ProviderInviteByToken {
  inviteId: string;
  token: string;
  email: string;
  fullName: string | null;
  expiresAt: Date;
  usedAt: Date | null;
  providerUserId: string;
}

export interface IOnboardingRepository {
  listStaffForDropdown(): Promise<{ recruiters: StaffOption[]; liaisons: StaffOption[] }>;
  listDistinctSpecialties(): Promise<string[]>;
  listDistinctCompanies(): Promise<string[]>;
  listDistinctRegions(): Promise<string[]>;
  /** Full catalog for facility dropdown (no search text). */
  listWorkSites(filters: { state?: string; limit: number }): Promise<WorkSiteSearchRow[]>;
  /** Typeahead while user types in facility combobox. */
  searchWorkSites(query: string, limit: number): Promise<WorkSiteSearchRow[]>;
  findStaffByUserId(userId: string): Promise<StaffOption | null>;
  findWorkSiteById(id: string): Promise<WorkSiteSearchRow | null>;
  findWorkSitesByFacilityName(
    facilityName: string,
    filters?: { city?: string; state?: string },
  ): Promise<WorkSiteSearchRow[]>;
  findProfileByEmail(email: string): Promise<{ userId: string } | null>;
  getDefaultClientOrgId(): Promise<string>;
  createProviderOnboarding(input: CreateProviderInput): Promise<CreateProviderResult>;
  findInviteByProviderUserId(
    userId: string,
  ): Promise<{ id: string; token: string; email: string } | null>;
  refreshInviteToken(inviteId: string, token: string, expiresAt: Date): Promise<void>;
  findInviteByToken(token: string): Promise<ProviderInviteByToken | null>;
  activateProviderInvite(
    inviteId: string,
    providerUserId: string,
    email: string,
    password: string,
  ): Promise<void>;
}

// -----------------------------------------------------------------------------
// Onboarding reference catalog (dropdowns, presets, facility CRUD)
// Used by: OnboardingCatalogRepository (read in form-options); seed via db:seed:catalog
// -----------------------------------------------------------------------------

/** Row from onboarding_* catalog tables or weekly_schedule_presets. */
export type CatalogRow = {
  id: string;
  name?: string;
  code?: string;
  label?: string;
  slug?: string;
  shifts?: unknown[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Work site payload for admin catalog CRUD (distinct from WorkSiteSearchRow). */
export type WorkSiteCatalogRow = {
  id: string;
  facilityName: string;
  clientName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  region: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface IOnboardingCatalogRepository {
  listSpecialties(includeInactive?: boolean): Promise<CatalogRow[]>;
  createSpecialty(name: string, sortOrder?: number): Promise<CatalogRow>;
  updateSpecialty(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null>;
  deleteSpecialty(id: string): Promise<boolean>;

  listCompanies(includeInactive?: boolean): Promise<CatalogRow[]>;
  createCompany(name: string, sortOrder?: number): Promise<CatalogRow>;
  updateCompany(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null>;
  deleteCompany(id: string): Promise<boolean>;

  listRegions(includeInactive?: boolean): Promise<CatalogRow[]>;
  createRegion(name: string, sortOrder?: number): Promise<CatalogRow>;
  updateRegion(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null>;
  deleteRegion(id: string): Promise<boolean>;

  listEmploymentTypes(includeInactive?: boolean): Promise<CatalogRow[]>;
  createEmploymentType(code: string, label: string, sortOrder?: number): Promise<CatalogRow>;
  updateEmploymentType(
    id: string,
    patch: { code?: string; label?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null>;
  deleteEmploymentType(id: string): Promise<boolean>;

  listScheduleTypes(includeInactive?: boolean): Promise<CatalogRow[]>;
  createScheduleType(code: string, label: string, sortOrder?: number): Promise<CatalogRow>;
  updateScheduleType(
    id: string,
    patch: { code?: string; label?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null>;
  deleteScheduleType(id: string): Promise<boolean>;

  listClinicDays(includeInactive?: boolean): Promise<CatalogRow[]>;
  createClinicDay(name: string, sortOrder?: number): Promise<CatalogRow>;
  updateClinicDay(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null>;
  deleteClinicDay(id: string): Promise<boolean>;

  listWeeklyPresets(includeInactive?: boolean): Promise<CatalogRow[]>;
  createWeeklyPreset(input: {
    slug: string;
    label: string;
    shifts: unknown[];
    sortOrder?: number;
  }): Promise<CatalogRow>;
  updateWeeklyPreset(
    id: string,
    patch: {
      slug?: string;
      label?: string;
      shifts?: unknown[];
      sortOrder?: number;
      isActive?: boolean;
    },
  ): Promise<CatalogRow | null>;
  deleteWeeklyPreset(id: string): Promise<boolean>;

  getActiveSpecialtyNames(): Promise<string[]>;
  getActiveCompanyNames(): Promise<string[]>;
  getActiveRegionNames(): Promise<string[]>;

  createWorkSite(input: {
    facilityName: string;
    clientName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    region?: string;
  }): Promise<WorkSiteCatalogRow>;
  updateWorkSite(
    id: string,
    patch: {
      facilityName?: string;
      clientName?: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zip?: string | null;
      region?: string | null;
    },
  ): Promise<WorkSiteCatalogRow | null>;
  deleteWorkSite(id: string): Promise<boolean>;
  findWorkSiteById(id: string): Promise<WorkSiteCatalogRow | null>;
}

// -----------------------------------------------------------------------------
// Master Availability Calendar
// Used by: MasterAvailabilityRepository, GET /admin/master-availability/*
// -----------------------------------------------------------------------------

export interface MasterAvailabilityFilters {
  company: string;
  monthYear: string;
  liaisonId?: string;
  liaisonIds?: string[];
  recruiterIds?: string[];
  status?: string;
  statuses?: string[];
  region?: string;
  regions?: string[];
  displayStatuses?: string[];
  q?: string;
}

/** One row in table/calendar (time_off row or set-schedule baseline). */
export interface MasterAvailabilityEntry {
  requestId: string | null;
  providerUserId: string;
  providerName: string;
  liaisonName: string | null;
  recruiterName: string | null;
  date: string;
  timeAvailable: string | null;
  status: string;
  displayStatus: string;
  specialty: string | null;
  region: string | null;
  facilityName: string | null;
  notes: string | null;
  changeType: string | null;
  createdAt: string | null;
  source: 'time_off' | 'baseline';
}

export interface LiaisonSubmissionProgressCard {
  liaisonId: string;
  liaisonName: string;
  submitted: number;
  total: number;
  percent: number;
}

export interface MasterAvailabilitySubmissionProgress {
  targetMonthYear: string;
  targetMonthLabel: string;
  deadline: string;
  liaisonCards: LiaisonSubmissionProgressCard[];
}

export interface SetProviderScheduleRow {
  providerUserId: string;
  providerName: string;
  liaisonName: string | null;
  specialty: string | null;
  region: string | null;
  scheduleType: string;
  weeklySchedule: unknown;
}

export interface MasterAvailabilityFilterOptions {
  companies: string[];
  liaisons: { id: string; name: string }[];
  recruiters: { id: string; name: string }[];
  statuses: string[];
  displayStatuses: string[];
  regions: string[];
}

export interface IMasterAvailabilityRepository {
  listTimeOffEntries(
    filters: MasterAvailabilityFilters,
    startDate: string,
    endDate: string,
  ): Promise<MasterAvailabilityEntry[]>;

  listSetProvidersForBaseline(
    filters: MasterAvailabilityFilters,
  ): Promise<SetProviderScheduleRow[]>;

  getFilterOptions(company: string): Promise<MasterAvailabilityFilterOptions>;

  getSubmissionProgress(company: string): Promise<MasterAvailabilitySubmissionProgress>;

  listProvidersForClientExport(
    filters: MasterAvailabilityFilters,
    startDate: string,
    endDate: string,
  ): Promise<MasterAvailabilityClientExportProvider[]>;
}

/** Provider + site context for region / ACE-IMO Excel exports. */
export interface MasterAvailabilityClientExportProvider {
  providerUserId: string;
  providerName: string;
  specialty: string | null;
  recruiterId: string | null;
  recruiterName: string | null;
  liaisonName: string | null;
  region: string | null;
  facilityName: string;
  workSiteId: string;
  weeklySchedule: unknown;
  scheduleType: string;
}

// -----------------------------------------------------------------------------
// Schedule Change Approvals
// Used by: ScheduleChangeApprovalsRepository, GET|POST /admin/schedule-change-approvals/*
// -----------------------------------------------------------------------------

export interface ScheduleChangeApprovalsFilters {
  company: string;
  /** Optional scope for list/calendar; omitted = all months with matching rows. */
  monthYear?: string;
  liaisonIds?: string[];
  regions?: string[];
  q?: string;
}

/** One deduped time-off row for list/calendar/review. */
export interface ScheduleChangeRequestRow {
  requestId: string;
  providerUserId: string;
  providerName: string;
  providerEmail: string | null;
  liaisonId: string | null;
  liaisonName: string | null;
  region: string | null;
  requestDate: string;
  startTime: string | null;
  endTime: string | null;
  isUnavailable: boolean;
  changeType: string;
  status: string;
  providerNotes: string | null;
  reviewNotes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  pacrDocumentId: string | null;
  hasPacr: boolean;
  isPastDeadline: boolean;
  timeLabel: string | null;
  createdAt: Date;
  /** Primary site weekly schedule (overload warning). */
  weeklySchedule: unknown;
}

export interface ScheduleChangeApprovalsFilterOptions {
  companies: string[];
  liaisons: { id: string; name: string }[];
  regions: string[];
}

export interface PacrDocumentMeta {
  documentId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  bucket: string;
}

export interface IScheduleChangeApprovalsRepository {
  getFilterOptions(company: string): Promise<ScheduleChangeApprovalsFilterOptions>;

  listRequests(
    filters: ScheduleChangeApprovalsFilters,
    dateRange?: { start: string; end: string },
  ): Promise<ScheduleChangeRequestRow[]>;

  countPending(filters: ScheduleChangeApprovalsFilters): Promise<number>;

  findRequestById(id: string): Promise<ScheduleChangeRequestRow | null>;

  findPacrDocument(requestId: string): Promise<PacrDocumentMeta | null>;

  approveRequest(
    id: string,
    input: {
      reviewedBy?: string;
      reviewNotes?: string;
      adjustHours?: boolean;
      startTime?: string;
      endTime?: string;
    },
  ): Promise<ScheduleChangeRequestRow | null>;

  denyRequest(
    id: string,
    input: { reviewedBy?: string; reviewNotes: string },
  ): Promise<ScheduleChangeRequestRow | null>;

  bulkDecide(
    ids: string[],
    decision: 'approved' | 'denied',
    input: { reviewedBy?: string; reviewNotes?: string },
  ): Promise<{ updatedIds: string[]; skippedIds: string[] }>;
}

// -----------------------------------------------------------------------------
// PRN Availability (admin review — queue & calendar)
// Used by: PrnAvailabilityRepository, GET /admin/prn-availability/*
// -----------------------------------------------------------------------------

export interface PrnAvailabilityFilters {
  company: string;
  monthYear?: string;
  liaisonIds?: string[];
  regions?: string[];
  q?: string;
}

export interface PrnMonthlySubmissionRow {
  monthlyRequestId: string;
  providerUserId: string;
  providerName: string;
  liaisonName: string | null;
  monthYear: string;
  monthlyStatus: string;
  deadline: string;
  submittedAt: string | null;
  noChanges: boolean;
}

export interface PrnAvailabilityDayRow {
  requestId: string;
  providerUserId: string;
  providerName: string;
  liaisonName: string | null;
  region: string | null;
  requestDate: string;
  monthYear: string;
  startTime: string | null;
  endTime: string | null;
  changeType: string;
  status: string;
  timeLabel: string | null;
  providerNotes: string | null;
  monthlyRequestId: string | null;
  monthlyStatus: string | null;
}

export interface PrnAvailabilityFilterOptions {
  companies: string[];
  liaisons: { id: string; name: string }[];
  regions: string[];
}

export interface IPrnAvailabilityRepository {
  getFilterOptions(company: string): Promise<PrnAvailabilityFilterOptions>;

  listMonthlySubmissions(
    filters: PrnAvailabilityFilters,
    dateRange?: { start: string; end: string },
  ): Promise<PrnMonthlySubmissionRow[]>;

  listDaysInRange(
    filters: PrnAvailabilityFilters,
    startDate: string,
    endDate: string,
  ): Promise<PrnAvailabilityDayRow[]>;

  countPendingSubmissions(filters: PrnAvailabilityFilters): Promise<number>;
}

// -----------------------------------------------------------------------------
// Provider portal — PRN availability calendar (ADR 0009)
// Used by: ProviderSchedulingRepository, GET|POST /provider/scheduling/*
// -----------------------------------------------------------------------------

export interface ProviderSchedulingContext {
  fullName: string | null;
  email: string | null;
  scheduleType: string;
  recruiterName: string | null;
  liaisonName: string | null;
  clientName: string | null;
  workSites: {
    workSiteId: string;
    facilityName: string;
    city: string | null;
    state: string | null;
    isPrimary: boolean;
  }[];
}

export interface ProviderPrnMonthSubmission {
  monthlyRequestId: string;
  monthYear: string;
  status: string;
  deadline: string;
  submittedAt: string | null;
  noChanges: boolean;
}

export interface ProviderPrnAvailabilityDay {
  requestId: string;
  requestDate: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  workSiteId: string | null;
  changeType: string;
  status: string;
}

export interface ProviderPrnAvailabilityMonthView {
  monthYear: string;
  deadline: string;
  isPastDeadline: boolean;
  pacrRequired: boolean;
  monthlyRequest: ProviderPrnMonthSubmission | null;
  days: ProviderPrnAvailabilityDay[];
}

export interface SubmitPrnAvailabilityDayInput {
  requestDate: string;
  startTime: string;
  endTime: string;
  notes?: string;
  workSiteId: string;
}

export interface SubmitPrnAvailabilityInput {
  providerUserId: string;
  monthYear: string;
  noChanges: boolean;
  pacrDocumentId?: string;
  days: SubmitPrnAvailabilityDayInput[];
}

export interface SubmitPrnAvailabilityResult {
  monthlyRequestId: string;
  submissionGroupId: string;
  dayCount: number;
  status: string;
}

export interface ProviderSetTimeOffDay {
  requestId: string;
  requestDate: string;
  startTime: string | null;
  endTime: string | null;
  notes: string | null;
  workSiteId: string | null;
  changeType: string;
  status: string;
}

export interface ProviderSetTimeOffMonthView {
  monthYear: string;
  deadline: string;
  isPastDeadline: boolean;
  pacrRequired: boolean;
  monthlyRequest: ProviderPrnMonthSubmission | null;
  weeklySchedule: unknown;
  days: ProviderSetTimeOffDay[];
}

export interface SubmitSetTimeOffDayInput {
  requestDate: string;
  changeType: 'remove_day' | 'modify_shift' | 'swap';
  workSiteId: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface SubmitSetTimeOffInput {
  providerUserId: string;
  monthYear: string;
  noChanges: boolean;
  pacrDocumentId?: string;
  days: SubmitSetTimeOffDayInput[];
}

export interface SubmitSetTimeOffResult {
  monthlyRequestId: string;
  submissionGroupId: string;
  dayCount: number;
  status: string;
}

export interface ProviderDocumentInsertInput {
  providerUserId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  bucket: string;
}

export interface IProviderSchedulingRepository {
  getSchedulingContext(providerUserId: string): Promise<ProviderSchedulingContext>;

  assertPrnProvider(providerUserId: string): Promise<ProviderSchedulingContext>;

  assertSetProvider(providerUserId: string): Promise<ProviderSchedulingContext>;

  getAvailabilityMonth(
    providerUserId: string,
    monthYear: string,
  ): Promise<ProviderPrnAvailabilityMonthView>;

  submitPrnAvailability(input: SubmitPrnAvailabilityInput): Promise<SubmitPrnAvailabilityResult>;

  getTimeOffMonth(providerUserId: string, monthYear: string): Promise<ProviderSetTimeOffMonthView>;

  submitSetTimeOff(input: SubmitSetTimeOffInput): Promise<SubmitSetTimeOffResult>;

  findPacrDocumentForProvider(
    documentId: string,
    providerUserId: string,
  ): Promise<PacrDocumentMeta | null>;

  insertPacrDocument(input: ProviderDocumentInsertInput): Promise<{ id: string }>;
}

// -----------------------------------------------------------------------------
// Holidays
// -----------------------------------------------------------------------------

export interface HolidayRow {
  id: string;
  name: string;
  holidayDate: string;
  year: number;
}

export interface IHolidaysRepository {
  list(from?: string, to?: string): Promise<HolidayRow[]>;
}

// -----------------------------------------------------------------------------
// Client portal schedules
// -----------------------------------------------------------------------------

export interface ClientScheduleShift {
  day: string;
  start: string;
  end: string;
}

export interface ClientScheduleRow {
  providerUserId: string;
  fullName: string | null;
  specialty: string | null;
  region: string | null;
  recruiterName: string | null;
  recruiterEmail: string | null;
  recruiterPhone: string | null;
  liaisonName: string | null;
  liaisonEmail: string | null;
  liaisonPhone: string | null;
  site: {
    id: string;
    facilityName: string;
    city: string | null;
    state: string | null;
  };
  weeklySchedule: ClientScheduleShift[];
  timeOffDates: string[];
}

export interface IClientSchedulesRepository {
  listOptumSchedules(monthYear: string): Promise<ClientScheduleRow[]>;
}
