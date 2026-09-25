import { afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), choose: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/lib/chooseCorrectionTicket', () => ({ chooseCorrectionTicket: mocks.choose }));
import { colombiaInput, colombiaInputToISO, ticketStatus, writePayrollRecords, type CorrectionOperation } from './payrollCorrections';
afterEach(() => vi.resetAllMocks());
const ops: CorrectionOperation[] = [{ module: 'jornadas', action: 'update', id: 'record', values: { shift_id: 'turno' } }];
describe('correction workflow', () => {
  it('previews and submits the exact checked version in open dates', async () => {
    const prepared = [{ ...ops[0], expected: { shift_id: 'old' } }];
    mocks.rpc.mockResolvedValueOnce({ data: { requires_ticket: false, operations: prepared, tickets: [] }, error: null }).mockResolvedValueOnce({ data: [{ id: 'record' }], error: null });
    await expect(writePayrollRecords('company', ops)).resolves.toEqual([{ id: 'record' }]);
    expect(mocks.choose).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenLastCalledWith('payroll_correction_write', { p_company_id: 'company', p_operations: prepared, p_ticket_id: null });
  });
  it('requires a deliberate ticket choice before closed writes', async () => {
    const tickets = [{ id: 't1' }, { id: 't2' }];
    mocks.rpc.mockResolvedValueOnce({ data: { requires_ticket: true, operations: ops, tickets }, error: null }).mockResolvedValueOnce({ data: [], error: null });
    mocks.choose.mockResolvedValue('t2');
    await writePayrollRecords('company', ops);
    expect(mocks.choose).toHaveBeenCalledWith(tickets);
    expect(mocks.rpc.mock.calls[1][1].p_ticket_id).toBe('t2');
  });
  it('never writes when the ticket selection is cancelled', async () => {
    mocks.rpc.mockResolvedValue({ data: { requires_ticket: true, operations: ops, tickets: [] }, error: null });
    mocks.choose.mockRejectedValue(new Error('Cancelado'));
    await expect(writePayrollRecords('company', ops)).rejects.toThrow('Cancelado');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('surfaces a revoked or expired ticket at save without retrying unprotected', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { requires_ticket: true, operations: ops, tickets: [{ id: 't' }] }, error: null }).mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'Ticket vencido' } });
    mocks.choose.mockResolvedValue('t');
    await expect(writePayrollRecords('company', ops)).rejects.toMatchObject({ code: '42501' });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });
  it('rejects missing company without any request', async () => {
    await expect(writePayrollRecords(null, ops)).rejects.toThrow('empresa');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
describe('Colombia expiration', () => {
  it('converts local input independently of the computer time zone', () => {
    expect(colombiaInputToISO('2026-09-25T15:00')).toBe('2026-09-25T20:00:00.000Z');
    expect(colombiaInput('2026-09-25T20:00:00.000Z')).toBe('2026-09-25T15:00');
  });
  it('expires at the exact boundary and preserves terminal states', () => {
    const expires_at = '2026-09-25T20:00:00Z'; const now = Date.parse(expires_at);
    expect(ticketStatus({ status: 'active', expires_at }, now - 1)).toBe('active');
    expect(ticketStatus({ status: 'active', expires_at }, now)).toBe('expired');
    expect(ticketStatus({ status: 'requested', expires_at }, now)).toBe('expired');
    expect(ticketStatus({ status: 'revoked', expires_at }, now)).toBe('revoked');
  });
});
