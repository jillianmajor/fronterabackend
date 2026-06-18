import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { readdirSync } from 'fs';
import { join } from 'path';
import { AdminAnnouncementsController } from '../admin/announcements/admin-announcements.controller';
import { InvitesController } from '../admin/invites/invites.controller';
import { MasterAvailabilityController } from '../admin/master-availability/master-availability.controller';
import { OnboardingController } from '../admin/onboarding/onboarding.controller';
import { PrnAvailabilityController } from '../admin/prn-availability/prn-availability.controller';
import { ProvidersController } from '../admin/providers/providers.controller';
import { ScheduleChangeApprovalsController } from '../admin/schedule-change-approvals/schedule-change-approvals.controller';
import { AnnouncementsInboxController } from '../announcements/announcements-inbox.controller';
import { ClientSchedulesController } from '../client/client-schedules.controller';
import { HolidaysController } from '../holidays/holidays.controller';
import { MainController } from '../main.controller';
import { ProviderController } from '../provider/provider.controller';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { ROLES_KEY } from './decorators/roles.decorator';

/** Register every `*.controller.ts` here so the audit fails when a new controller ships without auth metadata. */
const ROUTE_CONTROLLERS = [
  MainController,
  InvitesController,
  OnboardingController,
  ProvidersController,
  MasterAvailabilityController,
  PrnAvailabilityController,
  ScheduleChangeApprovalsController,
  AdminAnnouncementsController,
  ProviderController,
  HolidaysController,
  AnnouncementsInboxController,
  ClientSchedulesController,
] as const;

function listControllerFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listControllerFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith('.controller.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function describeHttpRoute(
  reflector: Reflector,
  Controller: (typeof ROUTE_CONTROLLERS)[number],
  methodName: string,
  handler: (...args: unknown[]) => unknown,
): string {
  const httpMethod = reflector.get<number | undefined>(METHOD_METADATA, handler);
  const path = reflector.get<string | undefined>(PATH_METADATA, handler);
  if (httpMethod === undefined) {
    return '';
  }

  const controllerPath = reflector.get<string | undefined>(PATH_METADATA, Controller) ?? '';
  const routePath = [controllerPath, path].filter(Boolean).join('/').replace(/\/+/g, '/');
  return `${Controller.name}.${methodName} → ${routePath || '/'}`;
}

describe('Route auth audit', () => {
  const reflector = new Reflector();
  const srcRoot = join(__dirname, '..');
  const controllerFiles = listControllerFiles(srcRoot);

  it('includes every controller file in ROUTE_CONTROLLERS', () => {
    expect(ROUTE_CONTROLLERS).toHaveLength(controllerFiles.length);
  });

  it.each(ROUTE_CONTROLLERS.map((Controller) => [Controller.name, Controller] as const))(
    '%s — protected routes declare @Roles or @Public',
    (_name, Controller) => {
      const classPublic = reflector.get<boolean | undefined>(IS_PUBLIC_KEY, Controller);
      const classRoles = reflector.get<string[] | undefined>(ROLES_KEY, Controller);
      const prototype = Controller.prototype as object;
      const violations: string[] = [];

      for (const methodName of Object.getOwnPropertyNames(prototype)) {
        if (methodName === 'constructor') {
          continue;
        }

        const handler = (prototype as Record<string, unknown>)[methodName];
        if (typeof handler !== 'function') {
          continue;
        }

        const routeLabel = describeHttpRoute(
          reflector,
          Controller,
          methodName,
          handler as (...args: unknown[]) => unknown,
        );
        if (!routeLabel) {
          continue;
        }

        const isPublic =
          reflector.get<boolean | undefined>(IS_PUBLIC_KEY, handler) ?? classPublic ?? false;
        const roles = reflector.get<string[] | undefined>(ROLES_KEY, handler) ?? classRoles;

        if (!isPublic && (!roles || roles.length === 0)) {
          violations.push(routeLabel);
        }
      }

      expect(violations).toEqual([]);
    },
  );
});
