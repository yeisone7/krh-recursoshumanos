export type TrainingPeriodInput = {
  year: number;
  month: number;
};

export const TRAINING_MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const TRAINING_PERIOD_YEARS = Array.from({ length: 7 }, (_, index) => 2024 + index);

export function getTrainingPeriodKey(period: TrainingPeriodInput) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

export function getTrainingPeriodLabel(period: TrainingPeriodInput) {
  const month = TRAINING_MONTHS.find((item) => item.value === period.month);
  return `${month?.label || period.month} ${period.year}`;
}

export function sortTrainingPeriods<T extends TrainingPeriodInput>(periods: T[]) {
  return [...periods].sort((a, b) => a.year - b.year || a.month - b.month);
}
