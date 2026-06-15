import { parseBulkWorkSchedule } from './bulk-work-schedule.parser';

describe('parseBulkWorkSchedule', () => {
  it('returns empty schedule for PRN', () => {
    expect(parseBulkWorkSchedule('prn', 'PRN — variable')).toEqual([]);
  });

  it('parses Mon-Fri preset variants', () => {
    const shifts = parseBulkWorkSchedule('set', 'Mon-Fri 8a-5p');
    expect(shifts).toHaveLength(5);
    expect(shifts[0]).toMatchObject({ day: 'Monday', startTime: '8:00 AM', endTime: '5:00 PM' });
  });

  it('parses Tue/Wed/Thu/Sat preset', () => {
    const shifts = parseBulkWorkSchedule('set', 'Tue/Wed/Thu/Sat 8a-5p');
    expect(shifts.map((s) => s.day)).toEqual([
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Saturday',
    ]);
  });

  it('rejects unknown schedule text', () => {
    expect(() => parseBulkWorkSchedule('set', 'Every other Sunday')).toThrow(/Unrecognized work_schedule/);
  });
});
