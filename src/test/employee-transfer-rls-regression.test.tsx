import { createElement, type ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAvailableCompaniesForTransfer, useExecuteTransfer } from '@/hooks/useEmployeeTransfer';

const mocks = vi.hoisted(() => ({
  auth: {
    user: { id: 'user-1' },
    companies: [
      { id: 'company-source', name: 'Origen', nit: '1' },
      { id: 'company-target', name: 'Destino', nit: '2' },
    ],
  },
  from: vi.fn(),
  employeeInsert: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));

const sourceEmployee = {
  id: 'employee-source',
  company_id: 'company-source',
  document_type: 'CC',
  document_number: '1007558327',
  document_issue_city: null,
  document_issue_date: null,
  first_name: 'Ebelio',
  middle_name: 'Jose',
  last_name: 'Martinez',
  second_last_name: 'Marmolejo',
  birth_country: 'Colombia',
  birth_department: null,
  birth_city: null,
  birth_date: null,
  gender: null,
  blood_type: null,
  marital_status: null,
  gender_identity: null,
  gender_identity_other: null,
  is_first_job: false,
  is_head_of_household: false,
  disability_type: null,
  ethnic_group: null,
  is_conflict_victim: false,
  is_demobilized: false,
  avatar_url: null,
};

function emptyQueryBuilder() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return builder;
}

function setup<T>(useHook: () => T) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return { ...renderHook(useHook, { wrapper }), client };
}

beforeEach(() => {
  mocks.from.mockReset();
  mocks.employeeInsert.mockReset().mockResolvedValue({ data: null, error: null });
  let employeeRequests = 0;
  mocks.from.mockImplementation((table: string) => {
    if (table === 'employees_v2') {
      employeeRequests += 1;
      if (employeeRequests === 1) {
        return {
          ...emptyQueryBuilder(),
          single: vi.fn().mockResolvedValue({ data: sourceEmployee, error: null }),
        };
      }
      return { insert: mocks.employeeInsert };
    }
    return emptyQueryBuilder();
  });
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'employee-target') });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('inter-company employee transfer RLS regression', () => {
  it('offers only companies already authorized in the auth context', async () => {
    const { result, client } = setup(() => useAvailableCompaniesForTransfer('company-source'));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'company-target', name: 'Destino', nit: '2' }]);
    expect(mocks.from).not.toHaveBeenCalledWith('companies');
    client.clear();
  });

  it('pre-generates the destination employee id and does not request INSERT RETURNING', async () => {
    const { result, client } = setup(useExecuteTransfer);

    await result.current.mutateAsync({
      sourceEmployeeId: 'employee-source',
      sourceCompanyId: 'company-source',
      targetCompanyId: 'company-target',
      transferDate: '2026-09-01',
    });

    expect(mocks.employeeInsert).toHaveBeenCalledTimes(1);
    expect(mocks.employeeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'employee-target',
        company_id: 'company-target',
        document_number: '1007558327',
      }),
    );
    client.clear();
  });
});
