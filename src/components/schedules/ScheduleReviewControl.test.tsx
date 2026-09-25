import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ canApprove: true, write: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ currentCompanyId: 'company', hasPermission: (m: string, a: string) => m === 'jornadas' && (a !== 'approve' || state.canApprove) }) }));
vi.mock('@/lib/payrollCorrections', async importOriginal => ({ ...await importOriginal<object>(), writePayrollRecords: state.write }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/components/payroll/CorrectionTicketRequest', () => ({ CorrectionTicketRequest: () => null }));
vi.mock('@/components/payroll/CorrectionAudit', () => ({ CorrectionAudit: () => null }));
import { ScheduleReviewControl } from './ScheduleReviewControl';
import type { ScheduleDay } from '@/lib/payrollCorrections';
const days: ScheduleDay[] = ['2026-09-05', '2026-09-06'].map(work_date => ({ employee_id: 'employee', work_date, status: 'pending', snapshot: { name: 'Administrativo', start_time: '08:00', end_time: '16:00', is_rest_day: work_date.endsWith('06') }, review: null }));
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ScheduleReviewControl employees={[{ id: 'employee', first_name: 'Yeison', last_name: 'Escobar' }]} start="2026-09-05" end="2026-09-10" selection={[]} days={days} loading={false} error={null} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Revisar y aprobar/ }));
}
afterEach(() => { cleanup(); state.canApprove = true; vi.clearAllMocks(); });
describe('calendar review', () => {
  it('submits the exact snapshots of selected work and rest days', async () => {
    state.write.mockResolvedValue([]); mount();
    fireEvent.click(screen.getByLabelText(/Seleccionar 2 jornadas/));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar selección' }));
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    expect(state.write.mock.calls[0][1]).toEqual(days.map(d => ({ module: 'jornadas', action: 'approve', values: { employee_id: d.employee_id, work_date: d.work_date, snapshot: d.snapshot, status: 'approved', reason: '' } })));
  });
  it('requires a reason for rejection and excludes nonselected days', async () => {
    state.write.mockResolvedValue([]); mount();
    fireEvent.click(screen.getByLabelText('Seleccionar Yeison Escobar 2026-09-05'));
    expect(screen.getByRole('button', { name: 'Rechazar selección' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Observación/), { target: { value: 'Horario incorrecto' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar selección' }));
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(1));
    expect(state.write.mock.calls[0][1]).toHaveLength(1);
    expect(state.write.mock.calls[0][1][0].values.status).toBe('rejected');
  });
  it('keeps read-only roles from seeing approval actions', () => {
    state.canApprove = false; mount(); expect(screen.queryByRole('button', { name: 'Aprobar selección' })).toBeNull();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThan(0);
  });
});
