const colombianCalendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function familyCalendarDate(now = new Date()): string {
  const parts = colombianCalendar.formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function isFamilyBirthDate(value: string, today = familyCalendarDate()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01' || value > today) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function familyAgeOn(birthDate: string | null | undefined, today = familyCalendarDate()): number | null {
  if (!birthDate || !isFamilyBirthDate(birthDate, today)) return null;
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return years - Number(today.slice(5) < birthDate.slice(5));
}

export function familyAgeLabel(birthDate?: string | null, recordedAge?: number | null): string {
  const age = familyAgeOn(birthDate);
  if (age !== null) return age === 1 ? '1 año' : `${age} años`;
  if (recordedAge != null) return `Edad registrada: ${recordedAge} ${recordedAge === 1 ? 'año' : 'años'}`;
  return 'Sin fecha registrada';
}

export const familyBirthDateError = 'Ingrese una fecha de nacimiento válida que no sea futura.';
