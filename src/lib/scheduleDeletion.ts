import { supabase } from '@/integrations/supabase/client';

export function scheduleDeletionMessage(error: unknown): string {
  const details = error && typeof error === 'object'
    ? error as { code?: string; message?: string }
    : null;
  if (details?.code === 'PCC01') {
    return 'Este registro se utiliza en un período de nómina cerrado. No se puede eliminar mientras ese período esté cerrado.';
  }
  if (details?.code === '23503' || details?.code === '23514') {
    return 'Este registro está vinculado a jornadas o empleados. Reasigna las configuraciones que lo utilizan antes de eliminarlo.';
  }
  if (details?.code === '42501') return 'No tienes permisos para eliminar este registro.';
  return details?.message || 'No se pudo eliminar el registro. Intenta nuevamente.';
}

export async function deleteUnassignedShiftCycle(id: string, companyId: string) {
  const { count, error: assignmentError } = await supabase
    .from('employee_time_config')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('shift_cycle_id', id);
  if (assignmentError) throw new Error(scheduleDeletionMessage(assignmentError));
  if (count && count > 0) {
    throw new Error(`No se puede eliminar este ciclo: está vinculado a ${count} ${count === 1 ? 'configuración de jornada' : 'configuraciones de jornada'}. Reasigna esas configuraciones a otro ciclo antes de eliminarlo.`);
  }
  const { data, error } = await supabase.from('shift_cycles')
    .delete().eq('company_id', companyId).eq('id', id).select('id').maybeSingle();
  if (error) throw new Error(scheduleDeletionMessage(error));
  if (!data) throw new Error('El ciclo no existe o no tienes permisos para eliminarlo.');
}
