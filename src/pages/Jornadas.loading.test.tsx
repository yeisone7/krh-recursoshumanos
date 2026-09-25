import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Jornadas from './Jornadas';

const mounts = vi.hoisted(() => ({ dialog: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company-a' }) }));
vi.mock('@/hooks/useCompanies', () => ({ useOperationCenters: () => ({ data: [] }) }));
vi.mock('@/hooks/useSchedules', () => ({
  useWorkSchedules: () => ({ data: [] }), useShifts: () => ({ data: [] }), useShiftCycles: () => ({ data: [] }),
  useDeleteWorkSchedule: () => ({}), useDeleteShift: () => ({}), useDeleteShiftCycle: () => ({}),
}));
vi.mock('@/components/schedules', () => {
  const dialog = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
    mounts.dialog();
    return <div role="dialog"><button onClick={() => onOpenChange(false)}>Cerrar generador</button></div>;
  };
  return {
    ShiftCalendar: () => <p>Calendario listo</p>,
    WorkScheduleFormDialog: dialog, ShiftFormDialog: dialog, ShiftCycleFormDialog: dialog,
    CycleGeneratorDialog: dialog, ShiftReportExport: dialog, BulkCycleGeneratorDialog: dialog,
  };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Jornadas initial load', () => {
  it('does not mount dialog queries until requested and still allows reopening', () => {
    render(<MemoryRouter><Jornadas /></MemoryRouter>);
    expect(screen.getByText('Calendario listo')).toBeInTheDocument();
    expect(mounts.dialog).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cerrar generador'));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
