export function formatTrainingDuration(durationMinutes: number | string | null | undefined) {
  const minutes = Number(durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return '-';

  if (minutes < 60) return `${Math.round(minutes)} minutos`;

  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `${hours} hora${hours === 1 ? '' : 's'}`;

  return `${Number(hours.toFixed(1))} horas`;
}

export function trainingMinutesToHours(durationMinutes: number | string | null | undefined) {
  const minutes = Number(durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes / 60;
}
