import { differenceInCalendarDays, isValid, parseISO, format } from 'date-fns';
import type { PersonnelRequisition } from '@/hooks/useRequisitions';
import type { SelectionAlert } from './selectionAlerts';

type AlertRequisition = Pick<PersonnelRequisition, 'id' | 'requisition_code' | 'cargo_solicitado' | 'estado_requisicion' | 'requisition_vacancy_codes'>;

export function buildRequisitionVacancyCodeAlerts(requisitions: AlertRequisition[], now: Date): SelectionAlert[] {
  const alerts: SelectionAlert[] = [];
  for (const requisition of requisitions) {
    if (['cerrada', 'rechazada'].includes(requisition.estado_requisicion)) continue;
    for (const code of requisition.requisition_vacancy_codes ?? []) {
      if (!code.fecha_cierre) continue;
      const closingDate = parseISO(code.fecha_cierre);
      if (!isValid(closingDate)) continue;
      const days = differenceInCalendarDays(closingDate, now);
      if (days < -3 || days > 7) continue;
      const expired = days < 0;
      const deadline = expired ? `venció hace ${-days} día(s)` : days === 0 ? 'vence hoy' : `vence en ${days} día(s)`;
      const origin = code.platform?.name || code.entidad_origen;
      alerts.push({
        id: `vacancy-code:${code.id}`,
        source: 'requisition',
        entityId: requisition.id,
        level: expired || days === 0 ? 'critical' : 'warning',
        title: expired ? 'Código de vacante vencido' : days === 0 ? 'Código de vacante vence hoy' : 'Código de vacante próximo a vencer',
        description: `${requisition.requisition_code || requisition.cargo_solicitado} · ${requisition.cargo_solicitado}: código ${code.codigo_vacante_externa}${origin ? ` (${origin})` : ''} ${deadline}. Cierre: ${format(closingDate, 'dd/MM/yyyy')}.`,
        days,
      });
    }
  }
  return alerts.sort((a, b) => a.days - b.days || a.id.localeCompare(b.id));
}
