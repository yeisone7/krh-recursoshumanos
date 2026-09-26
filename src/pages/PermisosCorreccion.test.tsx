import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({ canApprove: true, canAnalytics: false, from: vi.fn(), order: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({
  currentCompanyId: 'company', user: { id: 'requester' },
  hasPermission: (module: string, action: string) => (module === 'correction_tickets' && (action === 'create' || (action === 'approve' && mocks.canApprove))) || (module === 'correction_tickets_analytics' && action === 'view' && mocks.canAnalytics),
}) }));
vi.mock('@/components/payroll/CorrectionTicketRequest', () => ({ CorrectionTicketRequest: () => null, TicketActions: () => null }));
vi.mock('@/components/payroll/CorrectionAudit', () => ({ CorrectionAudit: () => null }));
vi.mock('@/components/payroll/CorrectionDashboard', () => ({ CorrectionDashboard: () => <p>Panel analítico</p> }));
import PermisosCorreccion from './PermisosCorreccion';

const ticket = {
  id: 'ticket', number: 8, company_id: 'company', employee_id: 'employee', employee_name: 'Yeison Aguilar',
  operation_center_id: 'center', center_name: 'Aliar', requested_by: 'requester', requested_by_name: 'Yeison',
  start_date: '2026-09-16', end_date: '2026-09-17', expires_at: '2099-09-25T21:27:00Z',
  actions: ['jornadas:update'], reason: 'Corrección de ejemplo', status: 'requested',
  authorized_by: null, authorized_at: null, created_at: '2026-09-25T12:00:00Z',
};
let client: QueryClient;
beforeEach(() => {
  mocks.canApprove = true;
  mocks.canAnalytics = false;
  const builder = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() };
  for (const method of ['select', 'eq', 'order'] as const) builder[method].mockReturnValue(builder);
  mocks.order = builder.order;
  builder.range.mockResolvedValue({ data: [ticket], error: null });
  mocks.from.mockReturnValue(builder);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks(); });
function mount() {
  render(<MemoryRouter><QueryClientProvider client={client}><PermisosCorreccion /></QueryClientProvider></MemoryRouter>);
}
describe('correction ticket decisions', () => {
  it('shows approval and rejection for a requester whose role can decide', async () => {
    mount();
    expect(await screen.findByRole('button', { name: 'Aprobar solicitud' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rechazar solicitud' })).toBeInTheDocument();
  });

  it('hides both decisions when the requester lacks approval permission', async () => {
    mocks.canApprove = false;
    mount();
    expect(await screen.findByRole('button', { name: 'Cancelar solicitud' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar solicitud' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Rechazar solicitud' })).toBeNull();
  });

  it('opens Solicitudes first and requests newest records first', async () => {
    mocks.canAnalytics = true;
    mount();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map(tab => tab.textContent)).toEqual(['Solicitudes', 'Dashboard']);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText(/#8/)).toBeInTheDocument();
    expect(screen.queryByText('Panel analítico')).toBeNull();
    expect(mocks.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(mocks.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
  });
});
