import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface AbsenceConflict {
  type: 'vacation' | 'leave' | 'incapacity';
  label: string;
  startDate: string;
  endDate: string;
  status: string;
  detail: string;
}

/**
 * Check for date-range conflicts across vacations, leaves and incapacities
 * for a given employee. Returns an array of conflicts found.
 */
export function useAbsenceConflicts(
  employeeId: string | undefined,
  startDate: Date | undefined,
  endDate: Date | undefined,
  /** Exclude a specific record when editing */
  exclude?: { type: 'vacation' | 'leave' | 'incapacity'; id: string },
) {
  const { currentCompanyId } = useAuth();

  const startStr = startDate ? format(startDate, 'yyyy-MM-dd') : undefined;
  const endStr = endDate ? format(endDate, 'yyyy-MM-dd') : undefined;

  return useQuery({
    queryKey: ['absence_conflicts', currentCompanyId, employeeId, startStr, endStr, exclude?.id],
    queryFn: async (): Promise<AbsenceConflict[]> => {
      if (!employeeId || !startStr || !endStr || !currentCompanyId) return [];

      const conflicts: AbsenceConflict[] = [];

      // 1. Check vacation requests (not cancelled)
      const { data: vacations } = await supabase
        .from('vacation_requests')
        .select('id, start_date, end_date, status, request_type')
        .eq('employee_id', employeeId)
        .neq('status', 'cancelado')
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      vacations?.forEach((v) => {
        if (exclude?.type === 'vacation' && exclude.id === v.id) return;
        conflicts.push({
          type: 'vacation',
          label: 'Vacaciones',
          startDate: v.start_date,
          endDate: v.end_date,
          status: v.status,
          detail: `Vacaciones (${v.request_type}) — ${v.status}`,
        });
      });

      // 2. Check leave requests (not cancelled / rejected)
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('id, start_date, end_date, status, leave_type')
        .eq('employee_id', employeeId)
        .not('status', 'in', '("cancelado","rechazado")')
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      leaves?.forEach((l) => {
        if (exclude?.type === 'leave' && exclude.id === l.id) return;
        conflicts.push({
          type: 'leave',
          label: 'Permiso',
          startDate: l.start_date,
          endDate: l.end_date,
          status: l.status,
          detail: `Permiso (${l.leave_type}) — ${l.status}`,
        });
      });

      // 3. Check incapacities (all are active once created)
      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('id, start_date, end_date, diagnosis')
        .eq('employee_id', employeeId)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      incapacities?.forEach((i) => {
        if (exclude?.type === 'incapacity' && exclude.id === i.id) return;
        conflicts.push({
          type: 'incapacity',
          label: 'Incapacidad',
          startDate: i.start_date,
          endDate: i.end_date,
          status: 'activa',
          detail: `Incapacidad — ${i.diagnosis?.substring(0, 30) || 'Sin diagnóstico'}`,
        });
      });

      return conflicts;
    },
    enabled: !!employeeId && !!startStr && !!endStr && !!currentCompanyId,
  });
}
