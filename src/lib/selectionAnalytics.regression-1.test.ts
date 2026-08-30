import { describe, expect, it } from 'vitest';

import {
  candidateReachedStage,
  countActiveSelectionRequisitions,
  isActiveSelectionRequisition,
  isActiveVacancyStatus,
  isWithinDateRange,
  resolveVacancyAverageSalary,
  type RecruitmentStage,
} from './selectionAnalytics';

// Regression: ISSUE-001/003/005 — filters, funnel and salaries produced misleading analytics
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-seleccion-analitica-2026-08-25.md
describe('selection analytics rules', () => {
  it('applies inclusive date boundaries and excludes missing dates when filtering', () => {
    expect(isWithinDateRange(new Date('2026-08-15T12:00:00'), '2026-08-15', '2026-08-15')).toBe(true);
    expect(isWithinDateRange(new Date('2026-08-14T23:59:59'), '2026-08-15', '')).toBe(false);
    expect(isWithinDateRange(null, '2026-08-15', '')).toBe(false);
    expect(isWithinDateRange(null, '', '')).toBe(true);
  });

  it('uses the same active vacancy definition in operational and analytical views', () => {
    expect(['open', 'in_process', 'pending_placed'].filter(isActiveVacancyStatus)).toHaveLength(3);
    expect(isActiveVacancyStatus('closed')).toBe(false);
    expect(isActiveVacancyStatus('cancelled')).toBe(false);
  });

  it('counts only requisitions that are active in the selection process', () => {
    expect(isActiveSelectionRequisition({ estado_requisicion: 'borrador' })).toBe(false);
    expect(isActiveSelectionRequisition({ estado_requisicion: 'en_rrhh' })).toBe(false);
    expect(isActiveSelectionRequisition({ estado_requisicion: 'rechazada' })).toBe(false);
    expect(isActiveSelectionRequisition({ estado_requisicion: 'cerrada' })).toBe(false);

    expect(isActiveSelectionRequisition({ estado_requisicion: 'en_seleccion' })).toBe(true);
    expect(isActiveSelectionRequisition({ estado_requisicion: 'aprobada', vacancies: [] })).toBe(true);
    expect(isActiveSelectionRequisition({
      estado_requisicion: 'aprobada',
      vacancies: [{ status: 'closed' }, { status: 'in_process' }],
    })).toBe(true);
  });

  it('stops counting a requisition when every linked vacancy is terminal', () => {
    expect(isActiveSelectionRequisition({
      estado_requisicion: 'aprobada',
      vacancies: [{ status: 'closed' }, { status: 'cancelled' }],
    })).toBe(false);
  });

  it('calculates the aggregate value consumed by the active requisitions KPI', () => {
    const requisitions = [
      { estado_requisicion: 'borrador' },
      { estado_requisicion: 'en_seleccion', vacancies: [{ status: 'open' }] },
      { estado_requisicion: 'aprobada', vacancies: [{ status: 'pending_placed' }] },
      { estado_requisicion: 'aprobada', vacancies: [{ status: 'closed' }] },
      { estado_requisicion: ' APROBADA ', vacancies: null },
      { estado_requisicion: null },
    ];

    expect(countActiveSelectionRequisitions(requisitions)).toBe(3);
  });

  it('makes every later recruitment stage include all previous stages', () => {
    const interviewCandidate = { current_step: 'interview' };
    const stages: RecruitmentStage[] = ['aplicado', 'evaluado', 'entrevista'];

    expect(stages.map((stage) => candidateReachedStage(interviewCandidate, stage))).toEqual([true, true, true]);
    expect(candidateReachedStage(interviewCandidate, 'oferta')).toBe(false);
    expect(candidateReachedStage(interviewCandidate, 'contratado')).toBe(false);
  });

  it('keeps funnel totals monotonic for mixed candidate histories', () => {
    const candidates = [
      { status: 'applied' },
      { current_step: 'interview' },
      { status: 'selected' },
      { status: 'hired' },
    ];
    const stages: RecruitmentStage[] = ['aplicado', 'evaluado', 'entrevista', 'oferta', 'contratado'];
    const totals = stages.map((stage) => candidates.filter((candidate) => candidateReachedStage(candidate, stage)).length);

    expect(totals).toEqual([4, 3, 3, 2, 1]);
  });

  it('recovers known corrupted vacancy salaries from the linked requisition', () => {
    expect(resolveVacancyAverageSalary(
      { salary_range_min: 1.423, salary_range_max: 1.423 },
      { rrhh_asignacion_salarial: 1_423_500 },
    )).toBe(1_423_500);
    expect(resolveVacancyAverageSalary(
      { salary_range_min: 1_600_000, salary_range_max: 2_000_000 },
      { rrhh_asignacion_salarial: 1_423_500 },
    )).toBe(1_800_000);
  });
});
