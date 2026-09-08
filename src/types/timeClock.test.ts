import { describe, expect, it } from 'vitest';
import { getNextTimeClockActions } from './timeClock';

describe('time clock action sequence', () => {
  it('starts a new work period with clock in', () => {
    expect(getNextTimeClockActions()).toEqual(['clock_in']);
    expect(getNextTimeClockActions('clock_out')).toEqual(['clock_in']);
  });

  it('allows a pause or checkout while working', () => {
    expect(getNextTimeClockActions('clock_in')).toEqual(['break_start', 'clock_out']);
    expect(getNextTimeClockActions('break_end')).toEqual(['break_start', 'clock_out']);
  });

  it('requires ending an open pause', () => {
    expect(getNextTimeClockActions('break_start')).toEqual(['break_end']);
  });
});
