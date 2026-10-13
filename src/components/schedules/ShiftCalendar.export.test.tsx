import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftCalendar } from './ShiftCalendar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { ShiftCalendarExportData } from '@/lib/shiftCalendarExport';

const mocks = vi.hoisted(() => ({ export: vi.fn(), loading: false, error: null as Error | null }));
vi.mock('@/lib/shiftCalendarExport', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/shiftCalendarExport')>(), exportShiftCalendar: mocks.export,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ assignedCenterIds: [] }) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ data: [
  { id: 'day', first_name: 'Ana', last_name: 'Turnos', document_number: '001', is_active: true, work_info: { operation_center_id: 'a', area_id: 'area' }, operation_center_assignments: [{ operation_center_id: 'b' }] },
  { id: 'admin', first_name: 'Beatriz', last_name: 'Oficina', document_number: '002', is_active: true, work_info: { operation_center_id: 'a', area_id: 'area' } },
  { id: 'inactive', first_name: 'Inactivo', is_active: false },
] }) }));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [{ id: 'a', name: 'Centro A' }, { id: 'b', name: 'Centro B' }] }) }));
vi.mock('@/hooks/useSystemConfig', () => ({ useAreas: () => ({ data: [{ id: 'area', name: 'Campos' }] }) }));
vi.mock('@/hooks/useHolidays', () => ({ useHolidaysMap: () => ({ data: {} }) }));
vi.mock('@/hooks/useScheduleReviews', () => ({ useScheduleReviews: () => ({ data: [] }) }));
vi.mock('./ScheduleReviewControl', () => ({ ScheduleReviewControl: () => null }));
vi.mock('@/hooks/useSchedules', () => ({
  useShifts: (kind: string) => ({ data: kind === 'day' ? [{ id: 'td', name: 'Día', code: 'TD', color: '#123456', kind: 'day', is_active: true }] : [], isLoading: mocks.loading, error: mocks.error }),
  useCreateBulkShiftAssignments: () => ({}), useDeleteShiftAssignment: () => ({}), useDeleteBulkShiftAssignments: () => ({}),
}));
vi.mock('@/hooks/useShiftCalendarData', () => ({
  useCalendarAssignments: ({ startDate }: { startDate: string }) => ({ data: [{ id: 'assignment', employee_id: 'day', shift_id: 'td', assignment_date: startDate }] }),
  useCalendarTimeConfigs: () => ({ data: [
    { employee_id: 'day', mode: 'shift', start_date: '2000-01-01', is_active: true },
    { employee_id: 'admin', mode: 'administrative', start_date: '2000-01-01', is_active: true, work_schedules: { name: 'Oficina', days_of_week: [1, 2, 3, 4, 5] } },
  ] }),
  useCalendarAbsences: ({ startDate }: { startDate: string }) => ({ data: [{ employee_id: 'admin', type: 'vacation', start_date: startDate, end_date: startDate, description: 'Vacaciones' }] }),
  useCalendarRestSchedules: () => ({ data: [] }),
}));

beforeEach(() => { vi.clearAllMocks(); mocks.loading = false; mocks.error = null; mocks.export.mockResolvedValue(undefined); });
afterEach(cleanup);

function calendar(open = false, centerId?: string) {
  return <TooltipProvider><ShiftCalendar centerId={centerId} exportOpen={open} onExportOpenChange={() => {}} /></TooltipProvider>;
}

describe('export from the displayed calendar', () => {
  it('exports day shifts, administrative schedules and absences from the displayed fortnight', async () => {
    const view = render(calendar());
    expect(await screen.findByText('Beatriz Oficina')).toBeVisible();
    expect(screen.getAllByText('TD').length).toBeGreaterThan(0);
    view.rerender(calendar(true));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(mocks.export).toHaveBeenCalledOnce());
    const data = mocks.export.mock.calls[0][0] as ShiftCalendarExportData;
    expect(data.days.length).toBeGreaterThanOrEqual(13);
    expect(data.days.length).toBeLessThanOrEqual(16);
    expect(data.rows.map(row => row.name)).toEqual(['Ana Turnos', 'Beatriz Oficina', 'Ana Turnos']);
    expect(data.rows[0].cells[0]).toMatchObject({ label: 'TD', background: '123456' });
    expect(data.rows[1].cells[0].label).toBe('VAC');
    expect(data.rows[1].cells.some(cell => cell.label === 'OFI')).toBe(true);
    expect(data.rows[1].cells.some(cell => cell.label === 'D')).toBe(true);
    expect(data.rows[0].cells[1].label).toBe('');
  });

  it.each(['mensual', 'trimestral', 'semestral'])('keeps the %s range and the modality filter', async mode => {
    const view = render(calendar());
    fireEvent.click(screen.getByRole('radio', { name: `Vista ${mode}` }));
    fireEvent.click(screen.getByRole('radio', { name: 'Administrativos' }));
    view.rerender(calendar(true));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(mocks.export).toHaveBeenCalledOnce());
    const data = mocks.export.mock.calls[0][0] as ShiftCalendarExportData;
    expect(data.rows.map(row => row.name)).toEqual(['Beatriz Oficina']);
    expect(data.modeLabel).toBe('Administrativo');
    expect(data.startDate.slice(-2)).toBe('01');
    const expectedMinimum = mode === 'mensual' ? 28 : mode === 'trimestral' ? 89 : 181;
    expect(data.days.length).toBeGreaterThanOrEqual(expectedMinimum);
    expect(data.days.length).toBeLessThanOrEqual(expectedMinimum + 4);
    expect(data.days[data.days.length - 1]?.dateStr).toBe(data.endDate);
  });

  it('includes employees assigned to a secondary center when that center is selected', async () => {
    render(calendar(true, 'b'));
    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    await waitFor(() => expect(mocks.export).toHaveBeenCalledOnce());
    const data = mocks.export.mock.calls[0][0] as ShiftCalendarExportData;
    expect(data.rows.map(row => [row.name, row.center])).toEqual([['Ana Turnos', 'Centro B']]);
  });

  it('blocks export while the day catalog loads or fails', () => {
    mocks.loading = true;
    const view = render(calendar(true));
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    mocks.loading = false;
    mocks.error = new Error('No disponible');
    view.rerender(calendar(true));
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo completar');
    expect(screen.getByRole('button', { name: 'Exportar Excel' })).toBeDisabled();
    expect(mocks.export).not.toHaveBeenCalled();
  });
});
