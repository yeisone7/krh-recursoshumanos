import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PreLiquidationExport } from './PreLiquidationExport';
import type { PreLiquidationRow } from '@/types/payroll';
const mocks = vi.hoisted(() => ({ sheet: vi.fn(), write: vi.fn() }));
vi.mock('xlsx', () => ({ utils: { json_to_sheet: mocks.sheet, book_new: () => ({}), book_append_sheet: vi.fn() }, writeFile: mocks.write }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('custom concept export', () => {
  it('exports distinct labeled quantities and fills missing concepts with zero', () => {
    const base = { employeeId: 'a', employeeName: 'Ana', totalDias: 1 } as PreLiquidationRow;
    render(<PreLiquidationExport startDate="2026-10-01" endDate="2026-10-15" rows={[
      { ...base, customConcepts: {
        hours: { id: 'hours', identifier: 'BONO_H', name: 'Bono horas', unit: 'hours', quantity: 3 },
        days: { id: 'days', identifier: 'BONO_D', name: 'Bono días', unit: 'days', quantity: 2 },
      } },
      { ...base, employeeId: 'b', employeeName: 'Carlos' },
    ]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(mocks.sheet).toHaveBeenCalledWith([
      expect.objectContaining({ 'BONO_H · Bono horas (hrs)': 3, 'BONO_D · Bono días (días)': 2, 'Total Días': 1 }),
      expect.objectContaining({ 'BONO_H · Bono horas (hrs)': 0, 'BONO_D · Bono días (días)': 0 }),
    ]);
    expect(mocks.write).toHaveBeenCalledWith(expect.anything(), 'pre-liquidacion_2026-10-01_2026-10-15.xlsx');
  });
});
