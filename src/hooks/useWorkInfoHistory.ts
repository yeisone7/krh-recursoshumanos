import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useWorkInfoHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_work_info_history', employeeId],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('employee_work_info')
        .select(`
          id, position_name, valid_from, valid_to, is_current,
          operation_centers(id, name),
          areas(id, name)
        `)
        .eq('employee_id', employeeId)
        .order('valid_from', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!employeeId,
  });
}
