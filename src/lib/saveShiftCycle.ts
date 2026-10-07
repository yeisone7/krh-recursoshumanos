import { supabase } from '@/integrations/supabase/client';
import type { ShiftCycle } from '@/types/schedule';
import { scheduleDeletionMessage } from './scheduleDeletion';

// Local RPC extension until generated database types include the new function.
const client = supabase as unknown as {
  rpc(name: 'save_shift_cycle', args: Record<string, unknown>): Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
};
export async function saveShiftCycle(companyId: string | null, id: string | null, values: Partial<ShiftCycle>, days: { day_number: number; shift_id: string }[] | null): Promise<ShiftCycle> {
  if (!companyId) throw new Error('Selecciona una empresa.');
  const { data, error } = await client.rpc('save_shift_cycle', { p_company_id: companyId, p_cycle_id: id, p_values: values, p_days: days });
  if (error) throw new Error(error.code === 'PCC01' ? 'Este ciclo se utiliza en un período de nómina cerrado. No se puede modificar su secuencia.' : scheduleDeletionMessage(error));
  return data as ShiftCycle;
}
