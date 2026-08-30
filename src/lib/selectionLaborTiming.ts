import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { isActiveVacancyStatus } from './selectionAnalytics';

interface LaborTimingRequisition {
  id: string;
  seleccion_tipo_mano_obra?: string | null;
  seleccion_fecha_inicio_proceso?: string | null;
}

interface LaborTimingVacancy {
  requisition_id?: string | null;
  status?: string | null;
  open_date?: string | null;
  actual_close_date?: string | null;
}

export function getSelectionTimeByLaborType(
  vacancies: LaborTimingVacancy[],
  requisitions: LaborTimingRequisition[],
  today = new Date(),
) {
  // Use all loaded requisitions for classification, even when their creation
  // date is outside the vacancy date filter.
  const requisitionsById = new Map(requisitions.map((item) => [item.id, item]));
  const groups = [
    { name: 'MOC', description: 'Mano de obra calificada', closedDays: [] as number[], activeDays: [] as number[] },
    { name: 'MONC', description: 'Mano de obra no calificada', closedDays: [] as number[], activeDays: [] as number[] },
  ];
  let unclassifiedCount = 0;
  let invalidDatesCount = 0;

  for (const vacancy of vacancies) {
    const closed = vacancy.status === 'closed';
    if (!closed && !isActiveVacancyStatus(vacancy.status)) continue;

    const requisition = requisitionsById.get(vacancy.requisition_id || '');
    const laborType = requisition?.seleccion_tipo_mano_obra?.trim().toLowerCase();
    const group = laborType === 'calificada' || laborType === 'moc' ? groups[0]
      : laborType === 'no_calificada' || laborType === 'monc' ? groups[1] : null;
    if (!group) {
      unclassifiedCount += 1;
      continue;
    }

    const startValue = requisition?.seleccion_fecha_inicio_proceso || vacancy.open_date;
    const start = startValue ? parseISO(startValue) : new Date(NaN);
    const end = closed
      ? vacancy.actual_close_date ? parseISO(vacancy.actual_close_date) : new Date(NaN)
      : today;
    const days = differenceInCalendarDays(end, start);
    if (!isValid(start) || !isValid(end) || !isValid(today) || days < 0
      || differenceInCalendarDays(today, end) < 0) {
      invalidDatesCount += 1;
      continue;
    }
    (closed ? group.closedDays : group.activeDays).push(days);
  }

  const average = (values: number[]) => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

  return {
    groups: groups.map((group) => ({
      name: group.name,
      description: group.description,
      closedAverageDays: average(group.closedDays),
      activeAverageDays: average(group.activeDays),
      closedCount: group.closedDays.length,
      activeCount: group.activeDays.length,
    })),
    unclassifiedCount,
    invalidDatesCount,
  };
}
