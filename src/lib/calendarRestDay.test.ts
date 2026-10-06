import { describe, expect, it } from 'vitest';
import { calendarRestWeekday, hasWorkOnMandatoryRestDay, type CalendarRestSchedule } from './calendarRestDay';

const work = { is_rest_day: false, is_not_worked_day: false, is_suspension_day: false };
const scheduledWork = { date: '2026-10-07', restWeekday: 3, hasAssignment: true, shift: work, adminIsWorkDay: false, hasAbsence: false };
const schedule = (rest_day: string | null, overrides: Partial<CalendarRestSchedule> = {}): CalendarRestSchedule => ({
  id: 's1', employee_id: 'e1', employment_cycle_id: null, rest_day, valid_from: '2026-01-01', valid_to: null, ...overrides,
});

describe('mandatory rest work in the calendar', () => {
  it.each(['domingo', 'lunes', 'martes', 'MIÉRCOLES', 'jueves', 'viernes', 'SÁBADO'])('recognizes work on %s', (name) => {
    const restWeekday = calendarRestWeekday([schedule(name)], [], '2026-10-07');
    const dates = ['2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'];
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, date: dates[restWeekday!], restWeekday })).toBe(true);
  });
  it('does not flag Sunday when the rest day is Wednesday', () => {
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, date: '2026-10-04' })).toBe(false);
  });
  it.each([null, '', 'sin asignar'])('uses Sunday for unassigned value %s', value => {
    expect(calendarRestWeekday([schedule(value)], [], '2026-10-04')).toBe(0);
  });
  it.each(['2_dias', '3_dias', '4_dias', '7_dias', 'unknown'])('does not guess a weekday for %s', value => {
    const restWeekday = calendarRestWeekday([schedule(value)], [], '2026-10-07');
    expect(restWeekday).toBeNull();
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, restWeekday })).toBe(false);
  });
  it.each(['is_rest_day', 'is_not_worked_day', 'is_suspension_day'])('excludes %s even when an administrative schedule exists', flag => {
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, shift: { ...work, [flag]: true }, adminIsWorkDay: true })).toBe(false);
  });
  it('covers administrative work, empty cells, absences and explicit work overriding an absence', () => {
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, hasAssignment: false, shift: null, adminIsWorkDay: true })).toBe(true);
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, hasAssignment: false, shift: null })).toBe(false);
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, hasAssignment: false, shift: null, adminIsWorkDay: true, hasAbsence: true })).toBe(false);
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, hasAbsence: true })).toBe(true);
    expect(hasWorkOnMandatoryRestDay({ ...scheduledWork, shift: null, adminIsWorkDay: true })).toBe(false);
  });
  it('resolves changes by effective date, including ended versions', () => {
    const rows = [schedule('lunes', { valid_to: '2026-06-30' }), schedule('miercoles', { id: 's2', valid_from: '2026-07-01' })];
    expect(calendarRestWeekday(rows, [], '2026-06-30')).toBe(1);
    expect(calendarRestWeekday(rows, [], '2026-07-01')).toBe(3);
  });
  it('does not borrow rest days from a previous employment cycle', () => {
    const cycles = [{ id: 'c1', start_date: '2026-01-01', end_date: '2026-06-30' }, { id: 'c2', start_date: '2026-08-01', end_date: null }];
    const rows = [schedule('lunes', { employment_cycle_id: 'c1' }), schedule('miercoles', { id: 's2', employment_cycle_id: 'c2', valid_from: '2026-08-01' })];
    expect(calendarRestWeekday(rows, cycles, '2026-06-30')).toBe(1);
    expect(calendarRestWeekday(rows, cycles, '2026-08-01')).toBe(3);
    expect(calendarRestWeekday(rows, cycles, '2026-07-15')).toBeNull();
    expect(calendarRestWeekday(rows.slice(0, 1), cycles, '2026-08-01')).toBe(0);
  });
});
