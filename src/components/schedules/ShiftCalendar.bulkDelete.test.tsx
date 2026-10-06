import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { addDays, format, parseISO } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftCalendar } from './ShiftCalendar';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({ write: vi.fn(), singleDelete: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company', assignedCenterIds: [] }) }));
vi.mock('@/hooks/useEmployees', () => ({ useEmployees: () => ({ data: [{ id: 'employee', first_name: 'Ana', last_name: 'Prueba', is_active: true, work_info: { operation_center_id: 'center', area_id: 'area' } }] }) }));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [{ id: 'center', name: 'Centro prueba' }] }) }));
vi.mock('@/hooks/useSystemConfig', () => ({ useAreas: () => ({ data: [{ id: 'area', name: 'Área prueba' }] }) }));
vi.mock('@/hooks/useHolidays', () => ({ useHolidaysMap: () => ({ data: {} }) }));
vi.mock('@/hooks/useScheduleReviews', () => ({ useScheduleReviews: () => ({ data: [] }) }));
vi.mock('./ScheduleReviewControl', () => ({ ScheduleReviewControl: () => null }));
vi.mock('@/lib/payrollCorrections', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/payrollCorrections')>(), writePayrollRecords: mocks.write,
}));
vi.mock('@/hooks/useSchedules', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/hooks/useSchedules')>(),
  useShifts: () => ({ data: [] }),
  useCreateBulkShiftAssignments: () => ({ isPending: false }),
  useDeleteShiftAssignment: () => ({ mutateAsync: mocks.singleDelete }),
}));
vi.mock('@/hooks/useShiftCalendarData', () => ({
  useCalendarAssignments: ({ startDate }: { startDate: string }) => ({ data: [
    { id: 'first', employee_id: 'employee', assignment_date: startDate, shift_id: 'shift' },
    { id: 'third', employee_id: 'employee', assignment_date: format(addDays(parseISO(startDate), 2), 'yyyy-MM-dd'), shift_id: 'shift' },
    { id: 'outside-selection', employee_id: 'employee', assignment_date: format(addDays(parseISO(startDate), 5), 'yyyy-MM-dd'), shift_id: 'shift' },
    { id: 'other-employee', employee_id: 'other', assignment_date: startDate, shift_id: 'shift' },
  ] }),
  useCalendarTimeConfigs: () => ({ data: [] }),
  useCalendarAbsences: () => ({ data: [] }),
  useCalendarRestSchedules: () => ({ data: [] }),
}));

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });

async function selectThreeDays() {
  const { container } = render(<QueryClientProvider client={client}><TooltipProvider><ShiftCalendar /></TooltipProvider></QueryClientProvider>);
  await screen.findByText('Ana Prueba');
  const cells = container.querySelectorAll('div[tabindex="0"].h-full');
  fireEvent.mouseDown(cells[0].parentElement!, { button: 0 });
  fireEvent.mouseEnter(cells[2].parentElement!);
  fireEvent.mouseUp(cells[2].parentElement!);
  await screen.findByRole('dialog');
  expect(screen.getByText(/2 día\(s\) ya tienen turno asignado/)).toBeVisible();
}

describe('calendar bulk deletion', () => {
  it('deletes only assigned days in the selection in one batch and refreshes once', async () => {
    mocks.write.mockResolvedValue([]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await selectThreeDays();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.write).toHaveBeenCalledExactlyOnceWith('company', [
      { module: 'jornadas', action: 'delete', id: 'first' },
      { module: 'jornadas', action: 'delete', id: 'third' },
    ]);
    expect(mocks.singleDelete).not.toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(mocks.success).toHaveBeenCalledWith('2 asignación(es) eliminada(s)');
  });

  it('keeps the selection and permits retry if the batch fails', async () => {
    mocks.write.mockRejectedValueOnce(new Error('Sin permiso')).mockResolvedValueOnce([]);
    await selectThreeDays();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Error', { description: 'Sin permiso' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.write).toHaveBeenCalledTimes(2);
    expect(mocks.write.mock.calls[1]).toEqual(mocks.write.mock.calls[0]);
  });

  it('blocks duplicate actions and closing while the batch is pending', async () => {
    let finish!: () => void;
    mocks.write.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    await selectThreeDays();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(await screen.findByRole('button', { name: 'Eliminando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Asignar' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeVisible();
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });
});
