import { resolveStaffByName } from './resolve-staff-name.util';

describe('resolveStaffByName', () => {
  const staff = [
    { userId: '1', fullName: 'Amy Guy', email: 'amy@example.com' },
    { userId: '2', fullName: 'Anthony Kendall', email: 'anthony@example.com' },
  ];

  it('matches exact full name', () => {
    expect(resolveStaffByName('Anthony Kendall', staff)?.userId).toBe('2');
  });

  it('matches recruiter shorthand', () => {
    expect(resolveStaffByName('Amy', staff)?.userId).toBe('1');
  });
});
