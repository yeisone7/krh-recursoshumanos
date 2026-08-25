export type RecruitmentStage = 'aplicado' | 'evaluado' | 'entrevista' | 'oferta' | 'contratado';

export const ACTIVE_VACANCY_STATUSES = ['open', 'in_process', 'pending_placed'] as const;

export function isActiveVacancyStatus(status: string | null | undefined) {
  return ACTIVE_VACANCY_STATUSES.includes(status as typeof ACTIVE_VACANCY_STATUSES[number]);
}

interface CandidateStageData {
  status?: string | null;
  current_step?: string | null;
  final_score?: number | null;
  selection_steps?: Array<{
    step_type?: string | null;
    status?: string | null;
    result?: string | null;
  }> | null;
}

interface VacancySalaryData {
  salary_range_min?: number | string | null;
  salary_range_max?: number | string | null;
}

interface RequisitionSalaryData {
  rrhh_asignacion_salarial?: number | string | null;
  salario_propuesto?: number | string | null;
}

export function isWithinDateRange(date: Date | null, startDate: string, endDate: string) {
  if (!date) return !startDate && !endDate;
  if (startDate && date < new Date(`${startDate}T00:00:00`)) return false;
  if (endDate && date > new Date(`${endDate}T23:59:59.999`)) return false;
  return true;
}

export function candidateReachedStage(candidate: CandidateStageData, stage: RecruitmentStage) {
  const status = String(candidate.status || '').toLowerCase();
  const currentStep = String(candidate.current_step || '').toLowerCase();
  const steps = Array.isArray(candidate.selection_steps) ? candidate.selection_steps : [];
  const hasStep = (terms: string[]) => steps.some((step) => {
    const haystack = [step.step_type, step.status, step.result]
      .map((value) => String(value || '').toLowerCase())
      .join(' ');
    return terms.some((term) => haystack.includes(term));
  });

  const hired = status === 'hired';
  const reachedOffer = hired
    || status === 'selected'
    || currentStep.includes('offer')
    || currentStep.includes('oferta')
    || hasStep(['offer', 'oferta']);
  const reachedInterview = reachedOffer
    || currentStep.includes('interview')
    || currentStep.includes('entrevista')
    || hasStep(['interview', 'entrevista']);
  const reachedEvaluation = reachedInterview
    || candidate.final_score !== null && candidate.final_score !== undefined
    || hasStep(['evaluation', 'evaluacion', 'evaluación', 'test', 'prueba', 'assessment', 'score']);

  if (stage === 'aplicado') return true;
  if (stage === 'evaluado') return reachedEvaluation;
  if (stage === 'entrevista') return reachedInterview;
  if (stage === 'oferta') return reachedOffer;
  return hired;
}

export function resolveVacancyAverageSalary(
  vacancy: VacancySalaryData,
  requisition?: RequisitionSalaryData | null,
) {
  const min = Number(vacancy.salary_range_min || 0);
  const max = Number(vacancy.salary_range_max || 0);
  const vacancySalary = min && max ? (min + max) / 2 : min || max;
  const requisitionSalary = Number(
    requisition?.rrhh_asignacion_salarial || requisition?.salario_propuesto || 0,
  );

  const vacancySalaryLooksCorrupted = vacancySalary > 0
    && vacancySalary < 1000
    && requisitionSalary >= 100_000;

  if (!vacancySalary || vacancySalaryLooksCorrupted) return requisitionSalary;
  return vacancySalary;
}
