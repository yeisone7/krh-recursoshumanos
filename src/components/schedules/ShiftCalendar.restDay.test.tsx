import type { ComponentProps } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarCell } from './ShiftCalendar';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Shift } from '@/types/schedule';

const shift: Shift = {
  id: 'shift-1', company_id: 'company-a', name: 'Jornada diurna', code: 'T01', start_time: '08:00', end_time: '16:00',
  break_minutes: 0, crosses_midnight: false, color: 'transparent', is_rest_day: false, is_not_worked_day: false,
  is_suspension_day: false, is_active: true, created_at: '', updated_at: '',
};
const props: ComponentProps<typeof CalendarCell> = {
  employeeId: 'e1', dateStr: '2026-10-07', day: new Date(2026, 9, 7), sunday: false, holiday: null,
  selected: false, absence: undefined, shift,
  assignment: { id: 'a1', employee_id: 'e1', shift_id: shift.id, assignment_date: '2026-10-07', source: 'manual' },
  hasConflict: false, hasCenterConflict: false, isAdminMode: false, adminIsWorkDay: false,
  adminSchedule: undefined, activeShifts: [], onMouseDown: vi.fn(), onMouseEnter: vi.fn(), onMouseUp: vi.fn(),
  createBulkAssignments: {} as ComponentProps<typeof CalendarCell>['createBulkAssignments'],
  deleteAssignment: {} as ComponentProps<typeof CalendarCell>['deleteAssignment'],
};
const message = 'Trabajo programado en descanso obligatorio: miércoles. Día considerado dominical para liquidación.';
afterEach(cleanup);

describe('mandatory rest indicator', () => {
  it('keeps the shift and approval visible and updates a memoized cell when rest changes', () => {
    const ui = (mandatoryRestLabel?: string) => <TooltipProvider><CalendarCell {...props} reviewStatus="approved" mandatoryRestLabel={mandatoryRestLabel} /></TooltipProvider>;
    const { rerender } = render(ui());
    expect(screen.queryByText('DO')).toBeNull();
    rerender(ui('Miércoles'));
    expect(screen.getByLabelText(message)).toHaveTextContent('DO');
    expect(screen.getByText('T01')).toBeVisible();
    expect(screen.getByText('✓')).toBeVisible();
    rerender(ui());
    expect(screen.queryByText('DO')).toBeNull();
  });
  it('combines rest information with absence, holiday and conflict details on keyboard focus', async () => {
    const { container } = render(<TooltipProvider delayDuration={0}><CalendarCell {...props} mandatoryRestLabel="Miércoles" holiday="Festivo" hasConflict hasCenterConflict reviewStatus="pending" absence={{ type: 'leave', description: 'Permiso', start_date: '2026-10-07', end_date: '2026-10-07' }} /></TooltipProvider>);
    expect(screen.getByText('DO')).toBeVisible();
    expect(screen.getByText('!')).toBeVisible();
    expect(screen.getByText('P')).toBeVisible();
    fireEvent.focus(container.querySelector('[tabindex="0"]')!);
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(message));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Conflicto detectado');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Permiso');
    expect(screen.getByRole('tooltip')).toHaveTextContent('centros activos');
  });
  it('shows the administrative schedule alongside DO', () => {
    render(<TooltipProvider><CalendarCell {...props} shift={null} assignment={undefined} isAdminMode adminIsWorkDay mandatoryRestLabel="Miércoles" adminSchedule={{ id: 'adm1', company_id: 'company-a', name: 'Oficina', days_of_week: [1, 2, 3, 4, 5], start_time: '08:00', end_time: '16:00', break_minutes: 60, is_active: true, created_at: '', updated_at: '' }} /></TooltipProvider>);
    expect(screen.getByText('DO')).toBeVisible();
    expect(screen.getByText('OFI')).toBeVisible();
  });
});
