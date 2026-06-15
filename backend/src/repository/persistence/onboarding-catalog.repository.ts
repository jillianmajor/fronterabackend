/**
 * onboarding-catalog persistence repository.
 * Contracts: interface.ts
 */

import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { TOKENS } from '../../config/tokens';
import type { CatalogRow, IDbClient, IOnboardingCatalogRepository, WorkSiteCatalogRow } from './interface';
import {
  onboardingClinicDays,
  onboardingCompanies,
  onboardingEmploymentTypes,
  onboardingRegions,
  onboardingScheduleTypes,
  onboardingSpecialties,
  onboardingWeeklySchedulePresets,
  workSites,
} from './db/schema';

@Injectable()
export class OnboardingCatalogRepository implements IOnboardingCatalogRepository {
  constructor(@Inject(TOKENS.DbClient) private readonly dbClient: IDbClient) {}

  /**
   * Onboarding catalog specialties (active by default).
   */
  async listSpecialties(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingSpecialties)
      .orderBy(asc(onboardingSpecialties.sortOrder), asc(onboardingSpecialties.name));
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapNameRow(r));
  }

  /**
   * Inserts an onboarding specialty catalog row.
   */
  async createSpecialty(name: string, sortOrder = 0): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingSpecialties)
      .values({ name, sortOrder })
      .returning();
    return this.mapNameRow(row);
  }

  /**
   * Updates an onboarding specialty catalog row.
   */
  async updateSpecialty(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingSpecialties)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingSpecialties.id, id))
      .returning();
    return row ? this.mapNameRow(row) : null;
  }

  /**
   * Deletes an onboarding specialty catalog row.
   */
  async deleteSpecialty(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingSpecialties)
      .where(eq(onboardingSpecialties.id, id))
      .returning({ id: onboardingSpecialties.id });
    return deleted.length > 0;
  }

  /**
   * Onboarding catalog companies (active by default).
   */
  async listCompanies(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingCompanies)
      .orderBy(asc(onboardingCompanies.sortOrder), asc(onboardingCompanies.name));
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapNameRow(r));
  }

  /**
   * Inserts an onboarding company catalog row.
   */
  async createCompany(name: string, sortOrder = 0): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingCompanies)
      .values({ name, sortOrder })
      .returning();
    return this.mapNameRow(row);
  }

  /**
   * Updates an onboarding company catalog row.
   */
  async updateCompany(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingCompanies)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingCompanies.id, id))
      .returning();
    return row ? this.mapNameRow(row) : null;
  }

  /**
   * Deletes an onboarding company catalog row.
   */
  async deleteCompany(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingCompanies)
      .where(eq(onboardingCompanies.id, id))
      .returning({ id: onboardingCompanies.id });
    return deleted.length > 0;
  }

  /**
   * Onboarding catalog regions (active by default).
   */
  async listRegions(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingRegions)
      .orderBy(asc(onboardingRegions.sortOrder), asc(onboardingRegions.name));
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapNameRow(r));
  }

  /**
   * Inserts an onboarding region catalog row.
   */
  async createRegion(name: string, sortOrder = 0): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingRegions)
      .values({ name, sortOrder })
      .returning();
    return this.mapNameRow(row);
  }

  /**
   * Updates an onboarding region catalog row.
   */
  async updateRegion(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingRegions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingRegions.id, id))
      .returning();
    return row ? this.mapNameRow(row) : null;
  }

  /**
   * Deletes an onboarding region catalog row.
   */
  async deleteRegion(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingRegions)
      .where(eq(onboardingRegions.id, id))
      .returning({ id: onboardingRegions.id });
    return deleted.length > 0;
  }

  /**
   * Onboarding employment types (W2 / 1099).
   */
  async listEmploymentTypes(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingEmploymentTypes)
      .orderBy(asc(onboardingEmploymentTypes.sortOrder), asc(onboardingEmploymentTypes.code));
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapCodeRow(r));
  }

  /**
   * Inserts an employment type catalog row.
   */
  async createEmploymentType(code: string, label: string, sortOrder = 0): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingEmploymentTypes)
      .values({ code, label, sortOrder })
      .returning();
    return this.mapCodeRow(row);
  }

  /**
   * Updates an employment type catalog row.
   */
  async updateEmploymentType(
    id: string,
    patch: { code?: string; label?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingEmploymentTypes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingEmploymentTypes.id, id))
      .returning();
    return row ? this.mapCodeRow(row) : null;
  }

  /**
   * Deletes an employment type catalog row.
   */
  async deleteEmploymentType(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingEmploymentTypes)
      .where(eq(onboardingEmploymentTypes.id, id))
      .returning({ id: onboardingEmploymentTypes.id });
    return deleted.length > 0;
  }

  /**
   * Onboarding schedule types (set / prn).
   */
  async listScheduleTypes(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingScheduleTypes)
      .orderBy(asc(onboardingScheduleTypes.sortOrder), asc(onboardingScheduleTypes.code));
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapCodeRow(r));
  }

  /**
   * Inserts a schedule type catalog row.
   */
  async createScheduleType(code: string, label: string, sortOrder = 0): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingScheduleTypes)
      .values({ code, label, sortOrder })
      .returning();
    return this.mapCodeRow(row);
  }

  /**
   * Updates a schedule type catalog row.
   */
  async updateScheduleType(
    id: string,
    patch: { code?: string; label?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingScheduleTypes)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingScheduleTypes.id, id))
      .returning();
    return row ? this.mapCodeRow(row) : null;
  }

  /**
   * Deletes a schedule type catalog row.
   */
  async deleteScheduleType(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingScheduleTypes)
      .where(eq(onboardingScheduleTypes.id, id))
      .returning({ id: onboardingScheduleTypes.id });
    return deleted.length > 0;
  }

  /**
   * Clinic shift day labels for the onboarding form.
   */
  async listClinicDays(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingClinicDays)
      .orderBy(asc(onboardingClinicDays.sortOrder), asc(onboardingClinicDays.name));
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapNameRow(r));
  }

  /**
   * Inserts a clinic day catalog row.
   */
  async createClinicDay(name: string, sortOrder = 0): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingClinicDays)
      .values({ name, sortOrder })
      .returning();
    return this.mapNameRow(row);
  }

  /**
   * Updates a clinic day catalog row.
   */
  async updateClinicDay(
    id: string,
    patch: { name?: string; sortOrder?: number; isActive?: boolean },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingClinicDays)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingClinicDays.id, id))
      .returning();
    return row ? this.mapNameRow(row) : null;
  }

  /**
   * Deletes a clinic day catalog row.
   */
  async deleteClinicDay(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingClinicDays)
      .where(eq(onboardingClinicDays.id, id))
      .returning({ id: onboardingClinicDays.id });
    return deleted.length > 0;
  }

  /**
   * Weekly schedule presets for the onboarding form.
   */
  async listWeeklyPresets(includeInactive = false): Promise<CatalogRow[]> {
    const rows = await this.dbClient.db
      .select()
      .from(onboardingWeeklySchedulePresets)
      .orderBy(
        asc(onboardingWeeklySchedulePresets.sortOrder),
        asc(onboardingWeeklySchedulePresets.label),
      );
    return rows.filter((r) => includeInactive || r.isActive).map((r) => this.mapPresetRow(r));
  }

  /**
   * Inserts a weekly schedule preset.
   */
  async createWeeklyPreset(input: {
    slug: string;
    label: string;
    shifts: unknown[];
    sortOrder?: number;
  }): Promise<CatalogRow> {
    const [row] = await this.dbClient.db
      .insert(onboardingWeeklySchedulePresets)
      .values({
        slug: input.slug,
        label: input.label,
        shifts: input.shifts,
        sortOrder: input.sortOrder ?? 0,
      })
      .returning();
    return this.mapPresetRow(row);
  }

  /**
   * Updates a weekly schedule preset.
   */
  async updateWeeklyPreset(
    id: string,
    patch: {
      slug?: string;
      label?: string;
      shifts?: unknown[];
      sortOrder?: number;
      isActive?: boolean;
    },
  ): Promise<CatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(onboardingWeeklySchedulePresets)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(onboardingWeeklySchedulePresets.id, id))
      .returning();
    return row ? this.mapPresetRow(row) : null;
  }

  /**
   * Deletes a weekly schedule preset.
   */
  async deleteWeeklyPreset(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(onboardingWeeklySchedulePresets)
      .where(eq(onboardingWeeklySchedulePresets.id, id))
      .returning({ id: onboardingWeeklySchedulePresets.id });
    return deleted.length > 0;
  }

  /**
   * Active specialty names for form-options.
   */
  async getActiveSpecialtyNames(): Promise<string[]> {
    const rows = await this.listSpecialties(false);
    return rows.map((r) => r.name!).filter(Boolean);
  }

  /**
   * Active company names for form-options.
   */
  async getActiveCompanyNames(): Promise<string[]> {
    const rows = await this.listCompanies(false);
    return rows.map((r) => r.name!).filter(Boolean);
  }

  /**
   * Active region names for form-options.
   */
  async getActiveRegionNames(): Promise<string[]> {
    const rows = await this.listRegions(false);
    return rows.map((r) => r.name!).filter(Boolean);
  }

  /**
   * Inserts a work site (catalog admin; seed uses scripts).
   */
  async createWorkSite(input: {
    facilityName: string;
    clientName?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    region?: string;
  }): Promise<WorkSiteCatalogRow> {
    const [row] = await this.dbClient.db
      .insert(workSites)
      .values({
        facilityName: input.facilityName,
        clientName: input.clientName ?? 'Optum',
        address: input.address,
        city: input.city,
        state: input.state,
        zip: input.zip,
        region: input.region,
      })
      .returning();
    return this.mapWorkSiteRow(row);
  }

  /**
   * Updates a work site catalog row.
   */
  async updateWorkSite(
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
  ): Promise<WorkSiteCatalogRow | null> {
    const [row] = await this.dbClient.db
      .update(workSites)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(workSites.id, id))
      .returning();
    return row ? this.mapWorkSiteRow(row) : null;
  }

  /**
   * Deletes a work site catalog row.
   */
  async deleteWorkSite(id: string): Promise<boolean> {
    const deleted = await this.dbClient.db
      .delete(workSites)
      .where(eq(workSites.id, id))
      .returning({ id: workSites.id });
    return deleted.length > 0;
  }

  /**
   * Full work site row for catalog admin operations.
   */
  async findWorkSiteById(id: string): Promise<WorkSiteCatalogRow | null> {
    const [row] = await this.dbClient.db
      .select()
      .from(workSites)
      .where(eq(workSites.id, id))
      .limit(1);
    return row ? this.mapWorkSiteRow(row) : null;
  }

  private mapNameRow(row: {
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CatalogRow {
    return {
      id: row.id,
      name: row.name,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapCodeRow(row: {
    id: string;
    code: string;
    label: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CatalogRow {
    return {
      id: row.id,
      code: row.code,
      label: row.label,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapPresetRow(row: {
    id: string;
    slug: string;
    label: string;
    shifts: unknown;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): CatalogRow {
    return {
      id: row.id,
      slug: row.slug,
      label: row.label,
      shifts: Array.isArray(row.shifts) ? row.shifts : [],
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapWorkSiteRow(row: typeof workSites.$inferSelect): WorkSiteCatalogRow {
    return {
      id: row.id,
      facilityName: row.facilityName,
      clientName: row.clientName,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      region: row.region,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

