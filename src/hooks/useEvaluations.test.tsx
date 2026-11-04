import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEvaluations } from './useEvaluations';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ currentCompanyId: 'company-1' }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const cycleReferenceError = {
  code: '23503',
  message: 'violates foreign key constraint "evaluation_cycles_template_id_fkey"',
};

type DatabaseError = Pick<PostgrestError, 'code' | 'message'>;

function setup(deleteError: DatabaseError | null, updateError: DatabaseError | null = null) {
  const deleteQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ error: deleteError }),
  };
  const updateQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ error: updateError }),
  };
  const update = vi.fn(() => updateQuery);
  vi.mocked(supabase.from).mockReturnValue({
    delete: () => deleteQuery,
    update,
    select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
  } as unknown as ReturnType<typeof supabase.from>);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(useEvaluations, { wrapper });

  return {
    remove: () => result.current.deleteTemplate.mutateAsync('template-1'),
    update,
    updateQuery,
  };
}

describe('eliminación de plantillas de evaluación', () => {
  beforeEach(() => vi.clearAllMocks());

  it('desactiva únicamente la plantilla vinculada cuando la base de datos protege el ciclo', async () => {
    const { remove, update, updateQuery } = setup(cycleReferenceError);

    await act(async () => { await remove(); });

    expect(update).toHaveBeenCalledWith({ is_active: false });
    expect(updateQuery.eq).toHaveBeenCalledWith('company_id', 'company-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'template-1');
    expect(toast.success).toHaveBeenCalledWith('Plantilla desactivada. Se conserva en los ciclos que ya la usan.');
  });

  it('elimina una plantilla sin ciclos sin intentar desactivarla', async () => {
    const { remove, update } = setup(null);

    await act(async () => { await remove(); });

    expect(update).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Plantilla eliminada');
  });

  it('propaga otros errores de borrado sin intentar desactivar', async () => {
    const error = { code: '42501', message: 'Permiso denegado' };
    const { remove, update } = setup(error);

    await act(async () => { await expect(remove()).rejects.toEqual(error); });

    expect(update).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('informa el error si la desactivación falla', async () => {
    const error = { code: '42501', message: 'Permiso denegado' };
    const { remove } = setup(cycleReferenceError, error);

    await act(async () => { await expect(remove()).rejects.toEqual(error); });

    expect(toast.error).toHaveBeenCalledWith('Error al eliminar plantilla: Permiso denegado');
    expect(toast.success).not.toHaveBeenCalled();
  });
});
