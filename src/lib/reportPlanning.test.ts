import { describe, expect, it } from 'vitest';
import { assertQuestionSemantics, explainReport } from '../../supabase/functions/_shared/reporting/planning';
import { validatePlan } from '../../supabase/functions/_shared/reporting/validation';
import catalog from '../../supabase/functions/_shared/reporting/catalog.json';
import type { ReportPlan, ReportResult, Source } from './reporting';

const sources = catalog as Source[];
const cycle = sources.find(s => s.key === 'employee_employment_cycles')!;
const employees = sources.find(s => s.key === 'employees_v2')!;
const base: ReportPlan = { source: cycle.key, columns: [], dimensions: [], metrics: [{ field: 'employee_id', op: 'distinct', key: 'employees' }], filters: [{ field: 'is_first_hire', op: 'eq', values: ['true'] }, { field: 'age_at_hire', op: 'lt', values: ['25'] }], related: [], order: [], chart: 'none', limit: null, comparePrevious: false };
const question = '¿Cuántos empleados tenían menos de 25 años al contratarlos?';

describe('analytical question semantics', () => {
  it('represents hiring age without confusing current age or duplicating rehires', () => {
    const plan = validatePlan(base, sources);
    expect(() => assertQuestionSemantics(plan, question, cycle, {})).not.toThrow();
    expect(plan.metrics[0]).toMatchObject({ field: 'employee_id', op: 'distinct' });
  });
  it('rejects current age as a substitute for age at hiring', () => {
    const plan = { ...base, source: employees.key, filters: [{ field: 'age_years', op: 'lt' as const, values: ['25'] }] };
    expect(() => assertQuestionSemantics(plan, question, employees, {})).toThrow('edad al contratar');
  });
  it.each([18, 25, 40, 60])('enforces a strict less-than boundary for %s years', age => {
    const plan = { ...base, filters: [{ field: 'age_at_hire', op: 'lte' as const, values: [String(age)] }] };
    expect(() => assertQuestionSemantics(plan, `Empleados con menos de ${age} años al ingresar`, cycle, {})).toThrow(`lt ${age}`);
  });
  it('does not apply screen hiring dates to employee creation dates', () => {
    const plan = { ...base, source: employees.key, filters: [{ field: 'age_at_first_hire', op: 'lt' as const, values: ['25'] }] };
    expect(() => assertQuestionSemantics(plan, question, employees, { startDate: '2025-01-01' })).toThrow('no creación');
  });
  it('requires first hire for a generic hiring-age question', () => {
    const plan = { ...base, filters: base.filters.filter(f => f.field !== 'is_first_hire') };
    expect(() => assertQuestionSemantics(plan, question, cycle, {})).toThrow('primera contratación');
    expect(() => assertQuestionSemantics(plan, 'Edad al ingresar en cada reingreso', cycle, {})).not.toThrow();
  });
  it('requires unique people when counting employees across cycles', () => {
    const plan: ReportPlan = { ...base, metrics: [{ field: '*', op: 'count', key: 'employees' }] };
    expect(() => assertQuestionSemantics(plan, question, cycle, {})).toThrow('cuenta personas');
  });
  it.each([
    { ...base, filters: [{ field: 'tenure_years', op: 'gte', values: ['5'] }] },
    { ...base, filters: [{ field: 'age_at_exit', op: 'gte', values: ['60'] }] },
    { ...base, source: 'contracts', metrics: [{ field: '*', op: 'count', key: 'contracts' }], filters: [{ field: 'days_until_end', op: 'gte', values: ['0'] }, { field: 'days_until_end', op: 'lte', values: ['30'] }] },
    { ...base, source: 'employees_v2', metrics: [{ field: 'age_years', op: 'avg', key: 'average_age' }], filters: [], dimensions: [{ field: 'report_center_name', grain: 'value' }] },
  ])('supports varied analytical fields through the existing validated query contract', plan => {
    expect(() => validatePlan(plan, sources)).not.toThrow();
  });
  it('explains missing ages and the reference moment without inventing counts', () => {
    const result = { plan: base, summary: 'Cantidad: 12.', rows: [{ employees: 12 }] } as unknown as ReportResult;
    const explained = explainReport(result);
    expect(explained.summary).toContain('años cumplidos');
    expect(explained.summary).toContain('no se convierten en cero');
    expect(explained.summary).toContain('primera contratación');
    expect(explained.rows).toBe(result.rows);
  });
});
