import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PreLiquidationExport } from './PreLiquidationExport';
import type { PreLiquidationRow } from '@/types/payroll';
const mocks = vi.hoisted(() => ({ sheet: vi.fn(() => ({})), write: vi.fn() }));
vi.mock('xlsx', () => ({ utils: { json_to_sheet: mocks.sheet, book_new: () => ({}), book_append_sheet: vi.fn() }, writeFile: mocks.write }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('horas e identificación en Excel', () => {
  it('exporta las horas individuales acumuladas, el nombre completo y el documento como texto', () => {
    const row = {
      employeeId: 'a', employeeName: 'Ana María Pérez Gómez', documentNumber: '001234567890123456',
      jornada: 2, dominicalTrabajado: 1, festivoTrabajado: 0.5, descansoRemunerado: 1, noTrabajado: 0, suspension: 0,
      dayConceptHours: { jornada: 15, dominicalTrabajado: 7, festivoTrabajado: 3.5, descansoRemunerado: 7,
        noTrabajado: 0, suspension: 0, incapacidad: 0, vacaciones: 0, permiso: 0 },
      totalDias: 4.5,
    } as PreLiquidationRow;
    render(<PreLiquidationExport rows={[row]} startDate="2026-10-01" endDate="2026-10-15" dailyHours={8} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(mocks.sheet).toHaveBeenCalledWith([expect.objectContaining({
      Empleado: 'Ana María Pérez Gómez', Documento: '001234567890123456', 'Jornada (hrs)': 15,
      'Descanso Obligatorio Trabajado (hrs)': 7, 'Festivo Trabajado (hrs)': 3.5, 'Descanso Remunerado (hrs)': 7,
    })]);
    const sheet = mocks.sheet.mock.results[0].value;
    expect(sheet).toMatchObject({ B2: { t: 's', v: '001234567890123456', z: '@' } });
  });
  it('usa las horas supletorias solo en filas antiguas sin desglose individual', () => {
    const row = { employeeId: 'a', employeeName: 'Ana', documentNumber: '123', jornada: 0.5 } as PreLiquidationRow;
    render(<PreLiquidationExport rows={[row]} startDate="2026-10-01" endDate="2026-10-15" dailyHours={7} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(mocks.sheet).toHaveBeenCalledWith([expect.objectContaining({ 'Jornada (hrs)': 3.5, Documento: '123' })]);
  });
});

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
