import { scopeFiltersForCalendarContext } from './master-calendar-context.util';

describe('scopeFiltersForCalendarContext', () => {
  const base = {
    company: 'Frontera',
    monthYear: '2026-06-01',
  };

  it('scopes PRN master availability to prn add_day rows', () => {
    const scoped = scopeFiltersForCalendarContext(base, 'prn');
    expect(scoped.scheduleTypes).toEqual(['prn']);
    expect(scoped.changeTypes).toEqual(['add_day']);
  });

  it('scopes master PTO to SET time-off change types', () => {
    const scoped = scopeFiltersForCalendarContext(base, 'pto');
    expect(scoped.scheduleTypes).toBeUndefined();
    expect(scoped.changeTypes).toEqual(['remove_day', 'modify_shift', 'swap']);
  });
});
