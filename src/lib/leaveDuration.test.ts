import { describe, expect, it } from 'vitest';
import { calculateLeaveCalendarDays } from './leaveDuration';

describe('full-day leave duration', () => {
  it.each([
    ['2026-10-22', '2026-10-26', 5],
    ['2026-10-25', '2026-10-25', 1],
    ['2026-10-24', '2026-10-25', 2],
    ['2026-12-24', '2026-12-26', 3],
    ['2026-12-31', '2027-01-02', 3],
    ['2028-02-28', '2028-03-01', 3],
    ['2026-10-26', '2026-10-22', 0],
    ['', '2026-10-26', 0],
  ])('counts %s through %s as %i calendar days', (start, end, expected) => {
    expect(calculateLeaveCalendarDays(start, end)).toBe(expected);
  });

  it('uses calendar dates regardless of the time selected', () => {
    expect(calculateLeaveCalendarDays(new Date(2026, 9, 22, 23), new Date(2026, 9, 26, 0))).toBe(5);
    expect(calculateLeaveCalendarDays(new Date(2026, 9, 25, 23), new Date(2026, 9, 25, 0))).toBe(1);
  });

  it('does not show a duration for missing or invalid dates', () => {
    expect(calculateLeaveCalendarDays(undefined, undefined)).toBe(0);
    expect(calculateLeaveCalendarDays(new Date('invalid'), new Date())).toBe(0);
  });
});
