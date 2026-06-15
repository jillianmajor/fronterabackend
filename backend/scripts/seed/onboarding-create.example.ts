/**
 * Ready-to-test body for `POST /admin/onboarding` (Swagger UI + curl).
 * UUIDs match `scripts/seed/ids.ts` after `npm run db:seed`.
 *
 * Not a DB seed script — reference payload only. Specialty/company must exist in
 * catalog (`npm run db:seed:catalog`) or `GET /admin/onboarding/form-options`.
 *
 * Before re-running with the same email, delete the prior auth user / profile
 * (see docs/onboarding-invite-flow.md).
 */
export const ONBOARDING_CREATE_EXAMPLE = {
  firstName: 'Hamza',
  lastName: 'Jamshed',
  email: 'hamzajamshed.cs@gmail.com',
  phone: '(555) 555-0100',
  specialty: 'Nurse Practitioner',
  licenseState: 'TX',
  employmentType: 'W2',
  scheduleType: 'set',
  company: 'Frontera',
  defaultWeeklySchedule: [
    { day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' },
    { day: 'Tuesday', startTime: '8:00 AM', endTime: '5:00 PM' },
    { day: 'Wednesday', startTime: '8:00 AM', endTime: '5:00 PM' },
    { day: 'Thursday', startTime: '8:00 AM', endTime: '5:00 PM' },
    { day: 'Friday', startTime: '8:00 AM', endTime: '5:00 PM' },
  ],
  recruiterId: 'a0000000-0000-4000-8000-000000000001',
  liaisonId: 'a0000000-0000-4000-8000-000000000005',
  workSites: [
    {
      workSiteId: 'c0000000-0000-4000-8000-000000000001',
      facility: 'Dallas Medical Center',
      isPrimary: true,
      region: 'South',
    },
  ],
  sendInvite: true,
} as const;
