/** Sunday remains the statutory default only when no weekly day was assigned. */
export function getPayrollRestDay(value?: string | null): number | null {
  const normalized = value?.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!normalized || normalized === 'sin asignar') return 0;
  const days = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const index = days.indexOf(normalized);
  // Rotation lengths are not weekdays. Do not silently treat them as Sundays.
  return index === -1 ? null : index;
}
