import type { WeeklyShiftDto } from './dto/weekly-shift.dto';

const mf = (start: string, end: string): WeeklyShiftDto[] =>
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => ({
    day,
    startTime: start,
    endTime: end,
  }));

export const WEEKLY_SCHEDULE_PRESETS = [
  { id: 'mf-8-5', label: 'M-F 8a-5p', shifts: mf('8:00 AM', '5:00 PM') },
  { id: 'mf-9-4', label: 'M-F 9a-4p', shifts: mf('9:00 AM', '4:00 PM') },
  { id: 'mf-10-6', label: 'M-F 10a-6p', shifts: mf('10:00 AM', '6:00 PM') },
  {
    id: 'tue-wed-thu-sat-8-5',
    label: 'Tue/Wed/Thu/Sat 8a-5p',
    shifts: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'].map((day) => ({
      day,
      startTime: '8:00 AM',
      endTime: '5:00 PM',
    })),
  },
  { id: 'clear', label: 'Clear', shifts: [] as WeeklyShiftDto[] },
] as const;
