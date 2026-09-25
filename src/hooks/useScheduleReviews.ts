import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceActive } from '@/components/workspace/WorkspacePaneContext';
import { fetchScheduleDays } from '@/lib/payrollCorrections';

export function useScheduleReviews(employees: { id: string }[], start: string, end: string) {
  const { currentCompanyId, hasPermission } = useAuth();
  const active = useWorkspaceActive();
  const ids = useMemo(() => [...new Set(employees.map(e => e.id))].sort(), [employees]);
  return useQuery({ queryKey: ['schedule-reviews', currentCompanyId, ids, start, end], enabled: active && !!currentCompanyId && hasPermission('jornadas', 'view') && ids.length > 0,
    staleTime: 15000, refetchInterval: active ? 30000 : false, queryFn: () => fetchScheduleDays(currentCompanyId!, ids, start, end) });
}
