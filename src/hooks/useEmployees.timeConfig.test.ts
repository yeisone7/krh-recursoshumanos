import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, query, queryResult } = vi.hoisted(() => {
  type QueryDouble = {
    update: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    neq: ReturnType<typeof vi.fn>;
    is: ReturnType<typeof vi.fn>;
    then: (resolve: (value: { error: Error | null }) => unknown) => unknown;
  };

  const result = { error: null as Error | null };
  const queryDouble = {} as QueryDouble;
  queryDouble.update = vi.fn(() => queryDouble);
  queryDouble.eq = vi.fn(() => queryDouble);
  queryDouble.neq = vi.fn(() => queryDouble);
  queryDouble.is = vi.fn(() => queryDouble);
  queryDouble.then = (resolve: (value: { error: Error | null }) => unknown) => resolve(result);

  return {
    fromMock: vi.fn(() => queryDouble),
    query: queryDouble,
    queryResult: result,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: fromMock },
}));

import { deactivateOtherCurrentRecords } from './useEmployees';

describe('employee time config deactivation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryResult.error = null;
  });

  it('deactivates every active config when the current cycle has no record yet', async () => {
    await deactivateOtherCurrentRecords(
      'employee_time_config',
      'employee-1',
      null,
      'is_active',
    );

    expect(fromMock).toHaveBeenCalledWith('employee_time_config');
    expect(query.update).toHaveBeenCalledWith({ is_active: false });
    expect(query.eq).toHaveBeenCalledWith('employee_id', 'employee-1');
    expect(query.eq).toHaveBeenCalledWith('is_active', true);
    expect(query.neq).not.toHaveBeenCalled();
    expect(query.is).not.toHaveBeenCalled();
    expect(query.eq).not.toHaveBeenCalledWith('employment_cycle_id', expect.anything());
  });

  it('runs time-config cleanup without restricting it to the active employment cycle', () => {
    const source = readFileSync(`${process.cwd()}/src/hooks/useEmployees.ts`, 'utf8');

    expect(source).toContain(
      "deactivateOtherCurrentRecords('employee_time_config', id, existingTimeConfig?.id, 'is_active'),",
    );
    expect(source).not.toContain(
      "deactivateOtherCurrentRecords('employee_time_config', id, existingTimeConfig?.id, 'is_active', activeCycleId),",
    );
  });

  it('keeps the current config while deactivating active configs from any other cycle', async () => {
    await deactivateOtherCurrentRecords(
      'employee_time_config',
      'employee-1',
      'current-config',
      'is_active',
    );

    expect(query.neq).toHaveBeenCalledWith('id', 'current-config');
    expect(query.is).not.toHaveBeenCalled();
    expect(query.eq).not.toHaveBeenCalledWith('employment_cycle_id', expect.anything());
  });

  it('preserves cycle scoping for the other related employee records', async () => {
    await deactivateOtherCurrentRecords(
      'employee_contact',
      'employee-1',
      'current-contact',
      'is_current',
      'active-cycle',
    );

    expect(query.neq).toHaveBeenCalledWith('id', 'current-contact');
    expect(query.eq).toHaveBeenCalledWith('employment_cycle_id', 'active-cycle');
  });

  it('propagates a Supabase error and prevents the save from continuing', async () => {
    queryResult.error = new Error('update denied');

    await expect(deactivateOtherCurrentRecords(
      'employee_time_config',
      'employee-1',
      null,
      'is_active',
    )).rejects.toThrow('update denied');
  });
});
