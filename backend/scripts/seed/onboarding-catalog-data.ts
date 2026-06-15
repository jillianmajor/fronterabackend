/** Reference lists from onboarding-options.pdf (Corporate Portal → Onboard New Provider). */

export const ONBOARDING_SPECIALTIES = [
  'Admin',
  'Audiologist',
  'Chaperone',
  'Psychologist',
  'Dental',
  'Medical Assistant',
  'Nurse Practitioner',
  'Optometrist/Opthalmologist',
  'Physician Assistant',
  'TBI',
  'X-Ray',
] as const;

export const ONBOARDING_COMPANIES = ['Frontera', '4tress'] as const;

export const ONBOARDING_REGIONS = [
  'Region 1',
  'Region 2',
  'Region 3',
  'Region 4',
  'Chaperone',
  'Telehealth',
  'Travel/IMO',
] as const;

export const ONBOARDING_EMPLOYMENT_TYPES = [
  { code: 'W2', label: 'W2' },
  { code: '1099', label: '1099' },
] as const;

export const ONBOARDING_SCHEDULE_TYPES = [
  { code: 'set', label: 'Set Schedule' },
  { code: 'prn', label: 'PRN (Variable / As-Needed)' },
] as const;

export const ONBOARDING_CLINIC_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const mf = (start: string, end: string) =>
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({
    day,
    startTime: start,
    endTime: end,
  }));

export const ONBOARDING_WEEKLY_PRESETS = [
  { slug: 'mf-8-5', label: 'M-F 8a-5p', shifts: mf('8:00 AM', '5:00 PM') },
  { slug: 'mf-9-4', label: 'M-F 9a-4p', shifts: mf('9:00 AM', '4:00 PM') },
  { slug: 'mf-10-6', label: 'M-F 10a-6p', shifts: mf('10:00 AM', '6:00 PM') },
  {
    slug: 'tue-wed-thu-sat-8-5',
    label: 'Tue/Wed/Thu/Sat 8a-5p',
    shifts: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'].map((day) => ({
      day,
      startTime: '8:00 AM',
      endTime: '5:00 PM',
    })),
  },
  { slug: 'clear', label: 'Clear', shifts: [] },
] as const;

/** Recruiters and liaisons from PDF — seeded as internal_staff profiles. */
export const ONBOARDING_RECRUITERS = [
  'Amy Guy',
  'Audrey Williams',
  'Clint Robinson',
  'Gray Rodgers',
  'Richard Montgomery',
] as const;

export const ONBOARDING_LIAISONS = [
  'Anthony Kendall',
  'Paige Estes',
  'Veronica Raddi',
  'Stephanie Navarro',
] as const;
