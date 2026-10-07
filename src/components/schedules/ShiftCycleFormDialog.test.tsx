import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Shift } from '@/types/schedule';
import { ShiftCycleFormDialog } from './ShiftCycleFormDialog';

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

const scheduleMocks = vi.hoisted(() => ({
  useShifts: vi.fn((): { data: Shift[] } => ({ data: [] })),
}));

vi.mock('@/hooks/useSchedules', () => ({
  useShifts: scheduleMocks.useShifts,
  useCreateShiftCycle: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateShiftCycle: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe('ShiftCycleFormDialog', () => {
  it('loads Turnos Dia, matching the calendar catalog', () => {
    render(
      <ShiftCycleFormDialog
        open={false}
        onOpenChange={vi.fn()}
      />,
    );

    expect(scheduleMocks.useShifts).toHaveBeenCalledWith('day');
  });

  it('shows the Turno Dia code next to its name in the selected day', () => {
    scheduleMocks.useShifts.mockReturnValue({ data: [{
      id: 'turno-dia-1',
      company_id: 'empresa',
      name: 'Turno de mañana',
      code: 'TD01',
      start_time: '07:00:00',
      end_time: '15:00:00',
      break_minutes: 0,
      crosses_midnight: false,
      color: '#007097',
      is_rest_day: false,
      is_not_worked_day: false,
      is_suspension_day: false,
      is_active: true,
      created_at: '',
      updated_at: '',
    }] });

    render(<ShiftCycleFormDialog open onOpenChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('tab', { name: /configuración de días/i }), { button: 0 });
    fireEvent.click(screen.getByRole('button', { name: /agregar día/i }));

    const dayShift = screen.getByRole('combobox', { name: 'Turno del día 1' });
    expect(dayShift).toHaveTextContent('TD01');
    expect(dayShift).toHaveTextContent('Turno de mañana');
  });
});
