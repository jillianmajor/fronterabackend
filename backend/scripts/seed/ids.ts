/**
 * Stable UUIDs for idempotent seed data. Safe to reference in tests and .env.
 * Prefix pattern: a=auth user, b=org, c=work site, d=time off, e=profile, f=assignment/pws/poc
 */

export const SEED = {
  users: {
    recruiter: 'a0000000-0000-4000-8000-000000000001',
    provider1: 'a0000000-0000-4000-8000-000000000002',
    provider2: 'a0000000-0000-4000-8000-000000000003',
    recruiterAmy: 'a0000000-0000-4000-8000-000000000004',
    liaisonAnthony: 'a0000000-0000-4000-8000-000000000005',
    provider3: 'a0000000-0000-4000-8000-000000000006',
  },
  profiles: {
    recruiter: 'e0000000-0000-4000-8000-000000000001',
    provider1: 'e0000000-0000-4000-8000-000000000002',
    provider2: 'e0000000-0000-4000-8000-000000000003',
    recruiterAmy: 'e0000000-0000-4000-8000-000000000004',
    liaisonAnthony: 'e0000000-0000-4000-8000-000000000005',
    provider3: 'e0000000-0000-4000-8000-000000000006',
    onboardingStaff: {
      'amy.guy': 'e0000000-0000-4000-8000-000000000004',
      'audrey.williams': 'e0000000-0000-4000-8000-000000000007',
      'clint.robinson': 'e0000000-0000-4000-8000-000000000008',
      'gray.rodgers': 'e0000000-0000-4000-8000-000000000009',
      'richard.montgomery': 'e0000000-0000-4000-8000-000000000010',
      'anthony.kendall': 'e0000000-0000-4000-8000-000000000005',
      'paige.estes': 'e0000000-0000-4000-8000-000000000011',
      'veronica.raddi': 'e0000000-0000-4000-8000-000000000012',
      'stephanie.navarro': 'e0000000-0000-4000-8000-000000000013',
    },
  },
  org: {
    optum: 'b0000000-0000-4000-8000-000000000001',
  },
  workSites: {
    dallas: 'c0000000-0000-4000-8000-000000000001',
    houston: 'c0000000-0000-4000-8000-000000000002',
    phoenix: 'c0000000-0000-4000-8000-000000000003',
    aceImoDallas: 'c0000000-0000-4000-8000-000000000004',
    austin: 'c0000000-0000-4000-8000-000000000005',
    denver: 'c0000000-0000-4000-8000-000000000006',
  },
  assignments: {
    provider1: 'f0000000-0000-4000-8000-000000000001',
    provider2: 'f0000000-0000-4000-8000-000000000002',
    provider3: 'f0000000-0000-4000-8000-000000000003',
  },
  providerWorkSites: {
    p1Dallas: 'f0000000-0000-4000-8000-000000000011',
    p1Houston: 'f0000000-0000-4000-8000-000000000012',
    p2Dallas: 'f0000000-0000-4000-8000-000000000021',
    p3Phoenix: 'f0000000-0000-4000-8000-000000000031',
  },
  /** PRN Availability Calendar (provider3 / Casey Provider). */
  prnAvailability: {
    monthlyRequest: 'd0000000-0000-4000-8000-000000000010',
    day1: 'd0000000-0000-4000-8000-000000000011',
    day2: 'd0000000-0000-4000-8000-000000000012',
    submissionGroup: 'd0000000-0000-4000-8000-000000000099',
  },
  /** SET time-off (provider1 / Admin Provider) — same target month as PRN seed. */
  setTimeOff: {
    monthlyRequest: 'd0000000-0000-4000-8000-000000000020',
    day1: 'd0000000-0000-4000-8000-000000000021',
    submissionGroup: 'd0000000-0000-4000-8000-000000000098',
  },
  timeOff: {
    pending1: 'd0000000-0000-4000-8000-000000000001',
    pending2: 'd0000000-0000-4000-8000-000000000002',
    pendingOtherSite: 'd0000000-0000-4000-8000-000000000003',
    approved: 'd0000000-0000-4000-8000-000000000004',
    masterCalApproved: 'd0000000-0000-4000-8000-000000000005',
    masterCalPending: 'd0000000-0000-4000-8000-000000000006',
  },
  optumPoc: 'f0000000-0000-4000-8000-000000000099',
  /** PDF recruiters + liaisons (slug keys match seed-onboarding-catalog.ts). */
  onboardingStaff: {
    'amy.guy': 'a0000000-0000-4000-8000-000000000004',
    'audrey.williams': 'a0000000-0000-4000-8000-000000000007',
    'clint.robinson': 'a0000000-0000-4000-8000-000000000008',
    'gray.rodgers': 'a0000000-0000-4000-8000-000000000009',
    'richard.montgomery': 'a0000000-0000-4000-8000-000000000010',
    'anthony.kendall': 'a0000000-0000-4000-8000-000000000005',
    'paige.estes': 'a0000000-0000-4000-8000-000000000011',
    'veronica.raddi': 'a0000000-0000-4000-8000-000000000012',
    'stephanie.navarro': 'a0000000-0000-4000-8000-000000000013',
  },
} as const;

export const SEED_EMAIL = {
  recruiter: 'recruiter.seed@frontera.local',
  provider1: 'admin@fronterasearch.com',
  provider2: 'provider2.seed@frontera.local',
  recruiterAmy: 'amy.recruiter@fronterasearch.com',
  liaisonAnthony: 'anthony.liaison@fronterasearch.com',
  provider3: 'provider3.seed@frontera.local',
  onboardingStaff: {
    'amy.guy': 'amy.recruiter@fronterasearch.com',
    'audrey.williams': 'audrey.williams@fronterasearch.com',
    'clint.robinson': 'clint.robinson@fronterasearch.com',
    'gray.rodgers': 'gray.rodgers@fronterasearch.com',
    'richard.montgomery': 'richard.montgomery@fronterasearch.com',
    'anthony.kendall': 'anthony.liaison@fronterasearch.com',
    'paige.estes': 'paige.estes@fronterasearch.com',
    'veronica.raddi': 'veronica.raddi@fronterasearch.com',
    'stephanie.navarro': 'stephanie.navarro@fronterasearch.com',
  },
} as const;

/** JSON for provider_work_sites.weekly_schedule (Mon–Fri 8–4). */
export const SEED_WEEKLY_SCHEDULE = [
  { day: 'Monday', start: '8:00 AM', end: '4:00 PM' },
  { day: 'Tuesday', start: '8:00 AM', end: '4:00 PM' },
  { day: 'Wednesday', start: '8:00 AM', end: '4:00 PM' },
  { day: 'Thursday', start: '8:00 AM', end: '4:00 PM' },
  { day: 'Friday', start: '8:00 AM', end: '4:00 PM' },
];
