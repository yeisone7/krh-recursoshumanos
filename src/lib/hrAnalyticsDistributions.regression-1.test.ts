import { describe, expect, it } from 'vitest';

import { buildEmployeeDistributions } from './hrAnalyticsDistributions';

// Regression: ISSUE-003 — employee distributions omitted active employees without complete data
// Found by /qa on 2026-08-25
// Report: .gstack/qa-reports/qa-report-127-0-0-1-5174-2026-08-25.md
describe('HR analytics employee distributions', () => {
  it('accounts for every active employee exactly once', () => {
    const activeEmployees = [
      { id: 'employee-1', gender: 'M' },
      { id: 'employee-2', gender: 'F' },
      { id: 'employee-3', gender: null },
    ];
    const workInfos = [
      { employee_id: 'employee-1', link_type: 'fijo' },
      { employee_id: 'employee-1', link_type: 'fijo' },
      { employee_id: 'employee-2', link_type: null },
    ];

    const result = buildEmployeeDistributions(activeEmployees, workInfos);

    expect(result.byContractType).toEqual([
      { name: 'Fijo', value: 1 },
      { name: 'Sin dato', value: 2 },
    ]);
    expect(result.byGender).toEqual([
      { name: 'Masculino', value: 1 },
      { name: 'Femenino', value: 1 },
      { name: 'Sin dato', value: 1 },
    ]);
    expect(result.byContractType.reduce((total, item) => total + item.value, 0)).toBe(activeEmployees.length);
    expect(result.byGender.reduce((total, item) => total + item.value, 0)).toBe(activeEmployees.length);
  });

  it('keeps supported contract and gender categories separate from missing data', () => {
    const result = buildEmployeeDistributions(
      [
        { id: '1', gender: 'O' },
        { id: '2', gender: 'X' },
      ],
      [
        { employee_id: '1', link_type: 'obra_labor' },
        { employee_id: '2', link_type: 'aprendizaje' },
      ],
    );

    expect(result.byContractType).toEqual([
      { name: 'Obra/Labor', value: 1 },
      { name: 'Otro', value: 1 },
    ]);
    expect(result.byGender).toEqual([
      { name: 'Otro', value: 1 },
      { name: 'Sin dato', value: 1 },
    ]);
  });
});
