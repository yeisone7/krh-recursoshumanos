import { differenceInCalendarDays, isValid, parseISO } from 'date-fns';
import { isActiveVacancyStatus } from '@/lib/selectionAnalytics';
import { requisitionApprovalStepStatus } from '@/lib/requisitionApprovalFlow';
import { requisitionStatusLabels, type RequisitionStatus } from '@/types/requisition';
import { selectionStepTypeLabels, type SelectionStepType } from '@/types/vacancy';

export interface SelectionAlert {
  id: string;
  level: 'critical' | 'warning';
  source: 'requisition' | 'vacancy' | 'candidate';
  entityId: string;
  title: string;
  description: string;
  days: number;
}

interface AlertVacancy {
  id: string;
  status: string;
  position_title: string;
  open_date?: string | null;
  candidates?: { id: string }[] | null;
}

interface AlertRequisition {
  id: string;
  requisition_code: string | null;
  cargo_solicitado: string;
  estado_requisicion: string;
  fecha_ingreso_estimada: string | null;
  vacancies?: { status: string }[] | null;
}

interface AlertCandidate {
  id: string;
  vacancy_id: string;
  first_name: string;
  last_name: string;
  status: string;
  current_step: string | null;
  application_date: string;
  updated_at?: string | null;
  selection_steps?: { updated_at?: string | null; completed_date?: string | null }[] | null;
}

const approvalStatuses = new Set<string>(['enviada', ...Object.values(requisitionApprovalStepStatus)]);
const finishedCandidateStatuses = new Set(['hired', 'not_selected', 'withdrawn']);

function elapsedDays(value: string | null | undefined, now: Date): number | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? differenceInCalendarDays(now, date) : null;
}

/** Derive live pending work, not historical/dismissed notifications. */
export function buildSelectionAlerts(
  requisitions: readonly AlertRequisition[],
  vacancies: readonly AlertVacancy[],
  candidates: readonly AlertCandidate[],
  now = new Date(),
): SelectionAlert[] {
  const alerts: SelectionAlert[] = [];
  for (const requisition of requisitions) {
    const pendingApproval = approvalStatuses.has(requisition.estado_requisicion);
    if (!pendingApproval && requisition.estado_requisicion !== 'aprobada') continue;
    const linked = requisition.vacancies || [];
    // A fully closed, cancelled or paused process has no active coverage deadline.
    const needsCoverage = linked.length === 0 || linked.some(v => isActiveVacancyStatus(v.status));
    const label = `${requisition.requisition_code || 'Sin código'} · ${requisition.cargo_solicitado}`;
    const stage = requisitionStatusLabels[requisition.estado_requisicion as RequisitionStatus] || requisition.estado_requisicion;
    const days = elapsedDays(requisition.fecha_ingreso_estimada, now);
    if (needsCoverage && days !== null && days > 0) {
      alerts.push({
        id: `requisition-overdue-${requisition.id}`, source: 'requisition', entityId: requisition.id,
        level: 'critical', title: 'Requisición vencida sin cubrir', days,
        description: `${label}: la fecha de ingreso estimada pasó hace ${days} día(s). Estado: ${stage}.`,
      });
    } else if (pendingApproval && needsCoverage) {
      alerts.push({
        id: `requisition-approval-${requisition.id}`, source: 'requisition', entityId: requisition.id,
        level: 'warning', title: 'Requisición pendiente de aprobación', days: 0,
        description: `${label}: pendiente de revisión. Estado: ${stage}.`,
      });
    }
  }

  const activeVacancies = new Map(vacancies.filter(v => isActiveVacancyStatus(v.status)).map(v => [v.id, v]));
  const vacanciesWithCandidates = new Set(candidates.map(candidate => candidate.vacancy_id));
  for (const vacancy of activeVacancies.values()) {
    if ((vacancy.candidates?.length || 0) > 0 || vacanciesWithCandidates.has(vacancy.id)) continue;
    // Do not alert on a vacancy whose opening date is still in the future.
    const days = elapsedDays(vacancy.open_date, now);
    if (days !== null && days < 0) continue;
    alerts.push({
      id: `vacancy-no-candidates-${vacancy.id}`, source: 'vacancy', entityId: vacancy.id,
      level: 'warning', title: 'Vacante sin candidatos', days: days ?? 0,
      description: `${vacancy.position_title}: no tiene candidatos registrados. Revisa la convocatoria.`,
    });
  }

  for (const candidate of candidates) {
    const vacancy = activeVacancies.get(candidate.vacancy_id);
    if (!vacancy || finishedCandidateStatuses.has(candidate.status)) continue;
    // No stage-entry timestamp exists. Use the latest recorded activity conservatively,
    // including step edits, so a recent evaluation never appears as stalled.
    const activityDates = [candidate.application_date, candidate.updated_at,
      ...(candidate.selection_steps || []).flatMap(step => [step.updated_at, step.completed_date])];
    const elapsed = activityDates.map(date => elapsedDays(date, now)).filter((days): days is number => days !== null);
    if (elapsed.length === 0) continue;
    const days = Math.min(...elapsed);
    if (days <= 15) continue;
    const stage = selectionStepTypeLabels[candidate.current_step as SelectionStepType] || 'Postulación';
    alerts.push({
      id: `candidate-stalled-${candidate.id}`, source: 'candidate', entityId: candidate.id,
      level: 'warning', title: 'Candidato sin avances', days,
      description: `${candidate.first_name} ${candidate.last_name} · ${vacancy.position_title}: ${days} días sin actividad registrada. Etapa actual: ${stage}.`,
    });
  }
  return alerts.sort((a, b) => Number(b.level === 'critical') - Number(a.level === 'critical') || b.days - a.days || a.id.localeCompare(b.id));
}
