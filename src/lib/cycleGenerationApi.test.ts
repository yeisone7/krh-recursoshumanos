import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareCycleGeneration, saveCycleAssignments } from './cycleGenerationApi';
const mocks = vi.hoisted(() => ({ from: vi.fn(), write: vi.fn(), failTable: '' }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('./payrollCorrections', () => ({ writePayrollRecords: mocks.write }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.failTable = ''; mocks.write.mockResolvedValue([]);
  mocks.from.mockImplementation((table: string) => {
    const q = { select: () => q, eq: () => q, in: () => q, lte: () => q, gte: () => q, order: () => q,
      range: () => Promise.resolve({ data: [], error: table === mocks.failTable ? new Error('Consulta fallida') : null }) };
    return q;
  });
});
describe('cycle API', () => {
  it.each(['vacation_requests','leave_requests','employee_incapacities','employee_shift_assignments'])('blocks preview when %s fails', async table => {
    mocks.failTable = table;
    await expect(prepareCycleGeneration({ companyId: 'company', employeeIds: ['e1'], start: '2026-11-26', end: '2026-12-09' })).rejects.toThrow('Consulta fallida');
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('creates cycle assignments with an empty expected state instead of upserting', async () => {
    await saveCycleAssignments('company', [{ employee_id: 'e1', shift_id: 'day', assignment_date: '2026-11-26' }]);
    expect(mocks.write).toHaveBeenCalledWith('company', [{ module: 'jornadas', action: 'create', expected: null, values: { employee_id: 'e1', shift_id: 'day', assignment_date: '2026-11-26', source: 'cycle' } }]);
  });
  it('reports a conflict without retrying or overwriting', async () => {
    mocks.write.mockRejectedValue({ code: '23505' });
    await expect(saveCycleAssignments('company', [{ employee_id: 'e1', shift_id: 'day', assignment_date: '2026-11-26' }])).rejects.toThrow('se conservarán');
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });
});
