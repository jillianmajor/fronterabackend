import { DomainError } from '../../common/errors/exception';
import { ErrorCode } from '../../common/errors/error-codes';
import {
  findOverlapBetweenSchedules,
  findOverlapWithinSchedule,
  parseClockTimeToMinutes,
  validateOnboardingWeeklySchedules,
} from './weekly-schedule.validation';

describe('parseClockTimeToMinutes', () => {
  it('parses 12-hour times', () => {
    expect(parseClockTimeToMinutes('8:00 AM')).toBe(8 * 60);
    expect(parseClockTimeToMinutes('5:00 PM')).toBe(17 * 60);
    expect(parseClockTimeToMinutes('12:00 PM')).toBe(12 * 60);
    expect(parseClockTimeToMinutes('12:00 AM')).toBe(0);
  });

  it('parses 24-hour times', () => {
    expect(parseClockTimeToMinutes('08:30')).toBe(8 * 60 + 30);
  });

  it('throws on invalid format', () => {
    expect(() => parseClockTimeToMinutes('nope')).toThrow(DomainError);
    try {
      parseClockTimeToMinutes('nope');
    } catch (e) {
      expect(e).toMatchObject({ code: ErrorCode.SCHEDULE_VALIDATION });
    }
  });
});

describe('findOverlapWithinSchedule', () => {
  it('returns null for a single shift', () => {
    expect(
      findOverlapWithinSchedule(
        [{ day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' }],
        'ctx',
      ),
    ).toBeNull();
  });

  it('detects overlap on the same day', () => {
    const msg = findOverlapWithinSchedule(
      [
        { day: 'Monday', startTime: '8:00 AM', endTime: '12:00 PM' },
        { day: 'Monday', startTime: '11:00 AM', endTime: '3:00 PM' },
      ],
      'test',
    );
    expect(msg).toContain('overlapping shifts on monday');
  });
});

describe('findOverlapBetweenSchedules', () => {
  it('returns overlapping day', () => {
    expect(
      findOverlapBetweenSchedules(
        [{ day: 'Tuesday', startTime: '9:00 AM', endTime: '5:00 PM' }],
        [{ day: 'Tuesday', startTime: '10:00 AM', endTime: '2:00 PM' }],
      ),
    ).toBe('tuesday');
  });
});

describe('validateOnboardingWeeklySchedules', () => {
  it('passes for non-overlapping default and sites', () => {
    expect(() =>
      validateOnboardingWeeklySchedules({
        scheduleType: 'set',
        defaultWeeklySchedule: [
          { day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' },
        ],
        workSites: [{ facility: 'Site A' }],
      }),
    ).not.toThrow();
  });

  it('rejects defaultWeeklySchedule when scheduleType is prn', () => {
    expect(() =>
      validateOnboardingWeeklySchedules({
        scheduleType: 'prn',
        defaultWeeklySchedule: [
          { day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' },
        ],
        workSites: [{ facility: 'Site A' }],
      }),
    ).toThrow(DomainError);
  });

  it('rejects per-site weeklySchedule when scheduleType is prn', () => {
    expect(() =>
      validateOnboardingWeeklySchedules({
        scheduleType: 'prn',
        workSites: [
          {
            facility: 'Site A',
            weeklySchedule: [{ day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' }],
          },
        ],
      }),
    ).toThrow(DomainError);
  });

  it('passes for prn with no schedules', () => {
    expect(() =>
      validateOnboardingWeeklySchedules({
        scheduleType: 'prn',
        workSites: [{ facility: 'Site A' }],
      }),
    ).not.toThrow();
  });

  it('rejects overlapping default shifts', () => {
    expect(() =>
      validateOnboardingWeeklySchedules({
        scheduleType: 'set',
        defaultWeeklySchedule: [
          { day: 'Monday', startTime: '8:00 AM', endTime: '12:00 PM' },
          { day: 'Monday', startTime: '11:00 AM', endTime: '3:00 PM' },
        ],
        workSites: [{ facility: 'Site A' }],
      }),
    ).toThrow(DomainError);
  });
});
