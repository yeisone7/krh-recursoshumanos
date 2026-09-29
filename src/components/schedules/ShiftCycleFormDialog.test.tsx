import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ShiftCycleFormDialog } from './ShiftCycleFormDialog';

const scheduleMocks = vi.hoisted(() => ({
  useShifts: vi.fn(() => ({ data: [] })),
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
});
