import { addDays, format, parseISO } from 'date-fns';

export type HourConcept = 'hedo' | 'heno' | 'hedf' | 'henf' | 'rn' | 'rnf';
export const HOUR_CONCEPTS: HourConcept[] = ['hedo', 'heno', 'hedf', 'henf', 'rn', 'rnf'];
export type HourTotals = Record<HourConcept, number>;
export const emptyHourTotals = (): HourTotals => ({ hedo: 0, heno: 0, hedf: 0, henf: 0, rn: 0, rnf: 0 });

// Work in local civil seconds, independent of the browser's timezone and DST.
export function clockSeconds(value?: string | null): number | null {
  if (!value || !/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const [h, m, s = 0] = value.split(':').map(Number);
  return h < 24 && m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
}

export function scheduleHours(schedule: { start_time?: string; end_time?: string; break_duration_minutes?: number | null }): number | null {
  const start = clockSeconds(schedule.start_time), end = clockSeconds(schedule.end_time);
  const pause = Number(schedule.break_duration_minutes ?? 0) * 60;
  if (start === null || end === null || start === end || !Number.isFinite(pause) || pause < 0) return null;
  const duration = (end - start + 86400) % 86400 - pause;
  return duration > 0 ? duration / 3600 : null;
}

export interface ShiftHoursInput {
  date: string;
  shift: { start_time?: string; end_time?: string; break_minutes?: number; crosses_midnight?: boolean };
  ordinaryHours: number;
  nightStart: string;
  nightEnd: string;
  specialAt: (date: string) => boolean;
}

/** Each second belongs to one base/extra category; RN/RNF apply only to base hours.
 * With no timestamp for the pause, distribute it uniformly over the whole shift.
 */
export function calculateShiftHours(input: ShiftHoursInput) {
  const { date, shift, ordinaryHours, specialAt } = input;
  const start = clockSeconds(shift.start_time), end = clockSeconds(shift.end_time);
  const nightStart = clockSeconds(input.nightStart), nightEnd = clockSeconds(input.nightEnd);
  const pause = Number(shift.break_minutes ?? 0) * 60;
  if (start === null || end === null || nightStart === null || nightEnd === null || nightStart === nightEnd
    || !Number.isFinite(ordinaryHours) || ordinaryHours <= 0 || ordinaryHours > 24
    || !Number.isFinite(pause) || pause < 0) throw new Error('Horario, jornada o franja nocturna inválidos');
  // A midnight flag contradicting the clocks must not create a 30+ hour shift.
  if (end < start && shift.crosses_midnight === false || end > start && shift.crosses_midnight === true
    || end === start && !shift.crosses_midnight) throw new Error('Cruce de medianoche inconsistente');
  const finish = end + (end <= start ? 86400 : 0);
  const gross = finish - start;
  if (pause >= gross) throw new Error('El descanso debe ser menor que la duración del turno');
  const rate = (gross - pause) / gross;
  const ordinaryEnd = Math.min(finish, start + ordinaryHours * 3600 / rate);
  const boundaries = new Set([start, finish, ordinaryEnd]);
  for (let offset = 0; offset <= 86400; offset += 86400) {
    for (const point of [offset, offset + nightStart, offset + nightEnd, offset + 86400]) {
      if (point > start && point < finish) boundaries.add(point);
    }
  }
  const points = [...boundaries].sort((a, b) => a - b);
  const byDate: Record<string, HourTotals> = {};
  const kinds = new Set<string>();
  let ordinary = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i], to = points[i + 1], clock = from % 86400;
    const segmentDate = format(addDays(parseISO(date), Math.floor(from / 86400)), 'yyyy-MM-dd');
    const night = nightStart > nightEnd ? clock >= nightStart || clock < nightEnd : clock >= nightStart && clock < nightEnd;
    const special = specialAt(segmentDate);
    kinds.add(`${night}-${special}`);
    const hours = (to - from) * rate / 3600;
    const totals = byDate[segmentDate] ??= emptyHourTotals();
    if (from >= ordinaryEnd) totals[special ? night ? 'henf' : 'hedf' : night ? 'heno' : 'hedo'] += hours;
    else {
      ordinary += hours;
      if (night) totals[special ? 'rnf' : 'rn'] += hours;
    }
  }
  return { byDate, ordinaryHours: ordinary, workedHours: (gross - pause) / 3600, proportionalBreak: pause > 0 && kinds.size > 1 };
}
