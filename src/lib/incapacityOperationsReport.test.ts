import { describe, expect, it } from 'vitest';

import {
  filterIncapacityOperationsRows,
  getIncapacityDaysWithinMonth,
  getIncapacityOperationsMonths,
  getUniqueDiagnosisCount,
  summarizeByOperationCenter,
  summarizeIncapacityOperationsRows,
  type IncapacityOperationsRow,
} from './incapacityOperationsReport';

const rows: IncapacityOperationsRow[] = [
  {
    id: '1', employeeId: 'e1', employeeName: 'Ana Ruiz', operationCenterId: 'c1', operationCenterName: 'Centro Norte',
    positionName: 'Cocinera', concept: 'E.G.', startDate: '2026-01-10', endDate: '2026-01-12', totalDays: 3,
    diagnosisKey: 'J00', diagnosisLabel: 'J00 - Rinofaringitis aguda', gender: 'F',
  },
  {
    id: '2', employeeId: 'e1', employeeName: 'Ana Ruiz', operationCenterId: 'c1', operationCenterName: 'Centro Norte',
    positionName: 'Cocinera', concept: 'E.G.', startDate: '2026-01-20', endDate: '2026-01-21', totalDays: 2,
    diagnosisKey: 'J00', diagnosisLabel: 'J00 - Rinofaringitis aguda', gender: 'F',
  },
  {
    id: '3', employeeId: 'e2', employeeName: 'Luis Díaz', operationCenterId: 'c2', operationCenterName: 'Centro Sur',
    positionName: 'Mesero', concept: 'A.L.', startDate: '2026-02-01', endDate: '2026-02-01', totalDays: 1,
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

  it('counts only the calendar days that occur inside the selected month', () => {
    const yelibethRows: IncapacityOperationsRow[] = [
      {
        ...rows[0], id: 'july-1', startDate: '2026-07-01', endDate: '2026-07-30', totalDays: 30,
      },
      {
        ...rows[0], id: 'july-2', startDate: '2026-07-31', endDate: '2026-08-14', totalDays: 15,
      },
    ];

    const filtered = filterIncapacityOperationsRows(yelibethRows, {
      month: '2026-07', operationCenterId: 'all', positionName: 'all', employeeId: 'all',
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map((row) => row.totalDays)).toEqual([30, 1]);
    expect(summarizeIncapacityOperationsRows(filtered)[0].totalDays).toBe(31);
  });

  it('includes days from an incapacity that started in the previous month', () => {
    const row = {
      ...rows[0], startDate: '2026-06-28', endDate: '2026-07-04', totalDays: 7,
    };

    expect(getIncapacityDaysWithinMonth(row, '2026-07')).toBe(4);
    expect(filterIncapacityOperationsRows([row], {
      month: '2026-07', operationCenterId: 'all', positionName: 'all', employeeId: 'all',
    })[0].totalDays).toBe(4);
  });

  it('offers every month touched by the incapacity interval', () => {
    const row = {
      ...rows[0], startDate: '2026-06-28', endDate: '2026-08-02', totalDays: 36,
    };

    expect(getIncapacityOperationsMonths([row])).toEqual(['2026-08', '2026-07', '2026-06']);
  });
});
