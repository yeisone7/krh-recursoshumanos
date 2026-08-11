import { describe, expect, it } from 'vitest';

import {
  filterIncapacityOperationsRows,
  getUniqueDiagnosisCount,
  summarizeByOperationCenter,
  summarizeIncapacityOperationsRows,
  type IncapacityOperationsRow,
} from './incapacityOperationsReport';

const rows: IncapacityOperationsRow[] = [
  {
    id: '1', employeeId: 'e1', employeeName: 'Ana Ruiz', operationCenterId: 'c1', operationCenterName: 'Centro Norte',
    positionName: 'Cocinera', concept: 'E.G.', startDate: '2026-01-10', totalDays: 3,
    diagnosisKey: 'J00', diagnosisLabel: 'J00 - Rinofaringitis aguda', gender: 'F',
  },
  {
    id: '2', employeeId: 'e1', employeeName: 'Ana Ruiz', operationCenterId: 'c1', operationCenterName: 'Centro Norte',
    positionName: 'Cocinera', concept: 'E.G.', startDate: '2026-01-20', totalDays: 2,
    diagnosisKey: 'J00', diagnosisLabel: 'J00 - Rinofaringitis aguda', gender: 'F',
  },
  {
    id: '3', employeeId: 'e2', employeeName: 'Luis Díaz', operationCenterId: 'c2', operationCenterName: 'Centro Sur',
    positionName: 'Mesero', concept: 'A.L.', startDate: '2026-02-01', totalDays: 1,
    diagnosisKey: 'S90', diagnosisLabel: 'S90 - Traumatismo del pie', gender: 'M',
  },
];

describe('incapacity operations report', () => {
  it('combines month, operation center, position and employee filters', () => {
    expect(filterIncapacityOperationsRows(rows, {
      month: '2026-01', operationCenterId: 'c1', positionName: 'Cocinera', employeeId: 'e1',
    })).toHaveLength(2);
  });

  it('groups employee rows and preserves total cases and days', () => {
    const summary = summarizeIncapacityOperationsRows(rows);
    expect(summary[0]).toMatchObject({ employeeName: 'Ana Ruiz', cases: 2, totalDays: 5 });
    expect(summary.reduce((total, row) => total + row.totalDays, 0)).toBe(6);
  });

  it('counts diagnoses without duplicating repeated codes', () => {
    expect(getUniqueDiagnosisCount(rows)).toBe(2);
  });

  it('groups cases and days by operation center', () => {
    const summary = summarizeByOperationCenter(rows);
    expect(summary).toEqual([
      { key: 'c1', operationCenterName: 'Centro Norte', cases: 2, totalDays: 5 },
      { key: 'c2', operationCenterName: 'Centro Sur', cases: 1, totalDays: 1 },
    ]);
  });
});
