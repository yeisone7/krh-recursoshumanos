import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { ActiveDiversityEmployee } from '@/lib/activeDiversityAnalytics';

interface ActiveWorkInfoRow {
  employee_id: string;
  operation_center_id: string | null;
  created_at: string;
  operation_centers: { id: string; name: string } | null;
}

export function useActiveDiversityDataset() {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');

  return useQuery({
    queryKey: ['active-diversity-analytics', currentCompanyId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async (): Promise<ActiveDiversityEmployee[]> => {
      if (!currentCompanyId) return [];

      const [employeesResult, workInfoResult] = await Promise.all([
        supabase
          .from('employees_v2')
          .select(`
            id,
            gender,
            birth_date,
            disability_type,
            ethnic_group,
            is_first_job,
            is_head_of_household,
            is_conflict_victim,
            is_demobilized
          `)
          .eq('company_id', currentCompanyId)
          .eq('is_active', true)
          .range(0, 9999),
        supabase
          .from('employee_work_info')
          .select('employee_id, operation_center_id, created_at, operation_centers(id, name)')
          .eq('company_id', currentCompanyId)
          .eq('is_current', true)
          .order('created_at', { ascending: false })
          .range(0, 9999),
      ]);

      if (employeesResult.error) throw employeesResult.error;
      if (workInfoResult.error) throw workInfoResult.error;

      const workInfoByEmployee = new Map<string, ActiveWorkInfoRow>();
      (workInfoResult.data || []).forEach((rawWorkInfo) => {
        const workInfo = rawWorkInfo as unknown as ActiveWorkInfoRow;
        if (!workInfoByEmployee.has(workInfo.employee_id)) {
          workInfoByEmployee.set(workInfo.employee_id, workInfo);
        }
      });

      return (employeesResult.data || [])
        .map((employee): ActiveDiversityEmployee => {
          const workInfo = workInfoByEmployee.get(employee.id);
          const center = workInfo?.operation_centers as { id?: string; name?: string } | null;
          return {
            ...employee,
            centerId: workInfo?.operation_center_id || center?.id || null,
            centerName: center?.name || 'Sin centro',
          };
        })
        .filter((employee) => !shouldLimitByAssignedCenters
          || (!!employee.centerId && assignedCenterIds.includes(employee.centerId)));
    },
    enabled: !!currentCompanyId,
    staleTime: 120_000,
  });
}
