import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PreLiquidationTable } from './PreLiquidationTable';
import { calculatePreLiquidation } from '@/hooks/usePreLiquidation';

const viewport = vi.hoisted(() => ({ mobile: false }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => viewport.mobile }));
afterEach(() => { cleanup(); viewport.mobile = false; });

function employeeRows(count: number) {
  const [base] = calculatePreLiquidation({
    employees: [{ id: 'base', first_name: 'Ana', last_name: 'Prueba', document_number: 'TEST', restDay: 'martes', shiftName: '', operationCenterIds: [], operationCenterName: '' }],
    assignments: [], holidays: new Set(), overtimeRecords: [], incapacities: [], vacations: [], leaves: [], loans: [], deductions: [], novelties: [], config: null,
    filters: { startDate: '2026-09-23', endDate: '2026-09-23' },
  });
  return Array.from({ length: count }, (_, i) => ({ ...base, employeeId: `employee-${i + 1}`, employeeName: `Empleado ${i + 1}` }));
}

describe('paginación de preliquidación', () => {
  it('navega por empleados sin perder las columnas de conceptos de otras páginas', () => {
    const rows = employeeRows(26);
    rows[25].customConcepts = { bonus: { id: 'bonus', identifier: 'BON', name: 'Bonificación', unit: 'hours', quantity: 2 } };
    render(<PreLiquidationTable rows={rows} displayUnit="days" dailyHours={8} />);
    expect(screen.getByText('Empleado 25')).toBeInTheDocument();
    expect(screen.queryByText('Empleado 26')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'BON · Bonificación (h)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Empleado 26')).toBeInTheDocument();
    expect(screen.queryByText('Empleado 1')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 26–26 de 26 empleados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText('Empleado 1')).toBeInTheDocument();
  });

  it('vuelve a la primera página al cambiar el tamaño o los resultados filtrados', () => {
    const rows = employeeRows(76);
    const view = render(<PreLiquidationTable rows={rows} displayUnit="days" dailyHours={8} />);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '50' } });
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Empleado 50')).toBeInTheDocument();
    expect(screen.queryByText('Empleado 51')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    view.rerender(<PreLiquidationTable rows={rows.slice(0, 2)} displayUnit="days" dailyHours={8} />);
    expect(screen.getByText('Página 1 de 1')).toBeInTheDocument();
    expect(screen.getByText('Empleado 1')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–2 de 2 empleados')).toBeInTheDocument();
  });

  it('pagina también las tarjetas en móvil', () => {
    viewport.mobile = true;
    render(<PreLiquidationTable rows={employeeRows(26)} displayUnit="days" dailyHours={8} />);
    expect(screen.getAllByRole('heading')).toHaveLength(25);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Empleado 26' })).toBeInTheDocument();
  });
});

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
