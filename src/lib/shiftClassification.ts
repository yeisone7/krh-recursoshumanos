import type { Shift } from '@/types/schedule';

export type ShiftClassification = 'work' | 'rest' | 'not_worked' | 'suspension';

export type ShiftClassificationSource = Pick<
  Shift,
  'is_rest_day' | 'is_not_worked_day' | 'is_suspension_day'
>;

export type NonWorkingShiftField = keyof ShiftClassificationSource;

export const SHIFT_CLASSIFICATION_LABELS: Record<ShiftClassification, string> = {
  work: 'Laboral',
  rest: 'Descanso',
  not_worked: 'No trabajado',
  suspension: 'Suspensión',
};

export const SHIFT_CLASSIFICATION_CODES: Record<Exclude<ShiftClassification, 'work'>, string> = {
  rest: 'D',
  not_worked: 'NT',
  suspension: 'S',
};

export function getShiftClassification(
  shift?: Partial<ShiftClassificationSource> | null,
): ShiftClassification {
  if (shift?.is_rest_day) return 'rest';
  if (shift?.is_not_worked_day) return 'not_worked';
  if (shift?.is_suspension_day) return 'suspension';
  return 'work';
}

export function isNonWorkingShift(
  shift?: Partial<ShiftClassificationSource> | null,
): boolean {
  return getShiftClassification(shift) !== 'work';
}

export function getShiftClassificationLabel(
  shift?: Partial<ShiftClassificationSource> | null,
): string {
  return SHIFT_CLASSIFICATION_LABELS[getShiftClassification(shift)];
}

export function getShiftClassificationCode(
  shift?: Partial<ShiftClassificationSource> | null,
): string | null {
  const classification = getShiftClassification(shift);
  return classification === 'work' ? null : SHIFT_CLASSIFICATION_CODES[classification];
}

export function getExclusiveShiftClassificationFlags(
  field: NonWorkingShiftField,
  checked: boolean,
): ShiftClassificationSource {
  return {
    is_rest_day: field === 'is_rest_day' && checked,
    is_not_worked_day: field === 'is_not_worked_day' && checked,
    is_suspension_day: field === 'is_suspension_day' && checked,
  };
}

export function normalizeNonWorkingShiftValues<T extends ShiftClassificationSource & {
  start_time: string;
  end_time: string;
  break_minutes: number;
  crosses_midnight: boolean;
}>(shift: T): T {
  if (!isNonWorkingShift(shift)) return shift;
  return {
    ...shift,
    start_time: '00:00',
    end_time: '00:00',
    break_minutes: 0,
    crosses_midnight: false,
  };
}
