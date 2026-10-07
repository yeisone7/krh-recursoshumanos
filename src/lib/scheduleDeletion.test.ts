import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteUnassignedShiftCycle, scheduleDeletionMessage } from './scheduleDeletion';

const mocks = vi.hoisted(() => ({ from: vi.fn(), remove: vi.fn(), filters: vi.fn(), count: 0, deleteResult: { data: { id: 'cycle' }, error: null } as { data: { id: string } | null; error: { code: string } | null } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.count = 0;
  mocks.deleteResult = { data: { id: 'cycle' }, error: null };
  mocks.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn(() => query),
      eq: mocks.filters.mockImplementation(() => query),
      delete: mocks.remove.mockImplementation(() => query),
      maybeSingle: () => Promise.resolve(mocks.deleteResult),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ count: mocks.count, error: null })),
    };
    return query;
  });
});

describe('safe cycle deletion', () => {
  it('blocks an assigned cycle without attempting to delete or detach employees', async () => {
    mocks.count = 875;
    await expect(deleteUnassignedShiftCycle('cycle', 'company')).rejects.toThrow('875 configuraciones de jornada');
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('deletes an unused cycle only within the selected company', async () => {
    await deleteUnassignedShiftCycle('cycle', 'company');
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.filters).toHaveBeenCalledWith('company_id', 'company');
    expect(mocks.filters).toHaveBeenCalledWith('id', 'cycle');
  });
  it('explains the server protection when a payroll period is closed', async () => {
    mocks.deleteResult = { data: null, error: { code: 'PCC01' } };
    await expect(deleteUnassignedShiftCycle('cycle', 'company')).rejects.toThrow('período de nómina cerrado');
  });
  it('does not report success when permissions hide the cycle', async () => {
    mocks.deleteResult = { data: null, error: null };
    await expect(deleteUnassignedShiftCycle('cycle', 'company')).rejects.toThrow('no tienes permisos');
  });
  it('handles database error objects and relationship constraints', () => {
    expect(scheduleDeletionMessage({ code: '23514' })).toContain('Reasigna');
    expect(scheduleDeletionMessage({ message: 'Sin conexión' })).toBe('Sin conexión');
  });
});
