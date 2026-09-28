import { describe, expect, it } from 'vitest';
import { findComplianceCompletion, indexComplianceCompletions, type ComplianceCompletion, type ComplianceEmployee } from './useTrainingCompliance';

const employee: ComplianceEmployee = { id: 'person', first_name: 'Persona', last_name: 'Prueba', document_number: '1.234', operation_center_id: 'north', center_name: null };
const completion = (overrides: Partial<ComplianceCompletion> = {}): ComplianceCompletion => ({
  id: 'completion', course_id: 'course', course_name: 'Seguridad', course_code: 'SEG',
  employee_id: employee.id, operator_cedula: null, operator_name: 'Persona', completed_at: '2026-09-01T00:00:00Z', ...overrides,
});

describe('indexed compliance matching', () => {
  it('keeps the newest match across id, normalized legacy course names, codes and documents', () => {
    const newest = completion({ id: 'newest', course_id: 'legacy', course_name: 'SEGURIDÁD', employee_id: null, operator_cedula: '1234' });
    const older = completion({ id: 'older' });
    const index = indexComplianceCompletions([newest, older]);
    expect(findComplianceCompletion(index, ['id:course', 'name:seguridad', 'code:seg'], employee)).toBe(newest);
    expect(findComplianceCompletion(index, ['id:unrelated'], employee)).toBeUndefined();
    expect(findComplianceCompletion(index, ['code:seg'], { ...employee, id: 'other', document_number: '' })).toBeUndefined();
  });

  it('matches the previous scan results at production scale', () => {
    const records = Array.from({ length: 8000 }, (_, i) => completion({
      id: `completion-${i}`, course_id: `course-${i % 17}`, course_name: null, course_code: null,
      employee_id: `person-${i % 1300}`, operator_cedula: i % 3 === 0 ? String(i % 1300 + 1000) : null,
    }));
    const employees = Array.from({ length: 1300 }, (_, i) => ({ ...employee, id: `person-${i}`, document_number: String(i + 1000) }));
    const started = performance.now();
    const index = indexComplianceCompletions(records);
    const actual = Array.from({ length: 17 }, (_, course) => employees.map(person =>
      findComplianceCompletion(index, [`id:course-${course}`], person)?.id
    ));
    const indexedMs = performance.now() - started;
    const previousStart = performance.now();
    const expected = Array.from({ length: 17 }, (_, course) => {
      const courseRecords = records.filter(record => record.course_id === `course-${course}`);
      return employees.map(person => courseRecords.find(record =>
        record.employee_id === person.id || (record.operator_cedula && record.operator_cedula.replace(/\D/g, '') === person.document_number.replace(/\D/g, ''))
      )?.id);
    });
    console.info(`Compliance fixture (8,000 completions / 1,300 employees / 17 courses): indexed ${indexedMs.toFixed(1)}ms, previous employee scans ${(performance.now() - previousStart).toFixed(1)}ms`);
    expect(actual).toEqual(expected);
  });
});
