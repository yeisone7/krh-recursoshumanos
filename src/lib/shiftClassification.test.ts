import { describe, expect, it } from 'vitest';
import {
  getShiftClassification,
  getShiftClassificationCode,
  getShiftClassificationLabel,
  getExclusiveShiftClassificationFlags,
  isNonWorkingShift,
  normalizeNonWorkingShiftValues,
} from './shiftClassification';

describe('shiftClassification', () => {
  it.each([
    [{}, 'work', 'Laboral', null, false],
    [{ is_rest_day: true }, 'rest', 'Descanso', 'D', true],
    [{ is_not_worked_day: true }, 'not_worked', 'No trabajado', 'NT', true],
    [{ is_suspension_day: true }, 'suspension', 'Suspensión', 'S', true],
  ] as const)('classifies shift flags', (shift, classification, label, code, nonWorking) => {
    expect(getShiftClassification(shift)).toBe(classification);
    expect(getShiftClassificationLabel(shift)).toBe(label);
    expect(getShiftClassificationCode(shift)).toBe(code);
    expect(isNonWorkingShift(shift)).toBe(nonWorking);
  });

  it('keeps the three non-working switches mutually exclusive and allows returning to work', () => {
    expect(getExclusiveShiftClassificationFlags('is_suspension_day', true)).toEqual({
      is_rest_day: false,
      is_not_worked_day: false,
      is_suspension_day: true,
    });
    expect(getExclusiveShiftClassificationFlags('is_suspension_day', false)).toEqual({
      is_rest_day: false,
      is_not_worked_day: false,
      is_suspension_day: false,
    });
  });

  it('normalizes a non-working shift to zero hours without changing a work shift', () => {
    const suspension = {
      is_rest_day: false,
      is_not_worked_day: false,
      is_suspension_day: true,
      start_time: '06:00',
      end_time: '14:00',
      break_minutes: 30,
      crosses_midnight: true,
    };
    expect(normalizeNonWorkingShiftValues(suspension)).toMatchObject({
      start_time: '00:00', end_time: '00:00', break_minutes: 0, crosses_midnight: false,
    });
    const work = { ...suspension, is_suspension_day: false };
    expect(normalizeNonWorkingShiftValues(work)).toBe(work);
  });
});
