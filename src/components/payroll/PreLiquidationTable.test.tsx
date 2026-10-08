import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PreLiquidationTable } from './PreLiquidationTable';
import { calculatePreLiquidation } from '@/hooks/usePreLiquidation';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));
afterEach(cleanup);

describe('precisión visible de la preliquidación', () => {
  it('conserva cuartos de día y fracciones de horas en la tabla', () => {
    const rows = calculatePreLiquidation({
      employees: [{ id: 'a', first_name: 'Ana', last_name: 'Prueba', document_number: 'TEST', restDay: 'martes', shiftName: '', operationCenterIds: [], operationCenterName: '' }],
      assignments: [], holidays: new Set(), overtimeRecords: [], incapacities: [], vacations: [], leaves: [], loans: [], deductions: [], config: null,
      novelties: [
        { employee_id: 'a', novelty_date: '2026-09-23', novelty_type: 'jornada', hours: 2, status: 'aprobada' },
        { employee_id: 'a', novelty_date: '2026-09-23', novelty_type: 'hedo', hours: 1.25, status: 'aprobada' },
      ], filters: { startDate: '2026-09-23', endDate: '2026-09-23' },
    });
    render(<PreLiquidationTable rows={rows} displayUnit="days" dailyHours={8} />);
    expect(screen.getByText('0,25')).toBeInTheDocument();
    expect(screen.getByText('1,25')).toBeInTheDocument();
    expect(screen.queryByText('0,3')).not.toBeInTheDocument();
    expect(screen.getByText('Desc. obligatorio trabajado')).toBeInTheDocument();
  });
});
