import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePreLiquidation } from './usePreLiquidation';

describe('usePreLiquidation', () => {
  it('includes the employee operation center, rest day, and shift in the result row', () => {
    const { result } = renderHook(() => usePreLiquidation({
      assignments: [],
      holidays: new Set<string>(),
      novelties: [],
      overtimeRecords: [],
      incapacities: [],
      vacations: [],
      leaves: [],
      loans: [],
      deductions: [],
      employees: [{
        id: 'employee-1',
        first_name: 'Ana',
        last_name: 'Pérez',
        document_number: '123',
        operationCenterIds: ['center-1'],
        operationCenterName: 'Centro Norte',
        restDay: 'Domingo',
        shiftName: 'Turno A',
      }],
      config: null,
      filters: { startDate: '2026-09-01', endDate: '2026-09-01' },
    }));

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      operationCenterIds: ['center-1'],
      operationCenterName: 'Centro Norte',
      restDay: 'Domingo',
      shiftName: 'Turno A',
    });
  });
});
