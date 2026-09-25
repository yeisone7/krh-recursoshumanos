import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllAnalyticsRows } from '@/lib/employeeAnalyticsData';
import type { EmployeeAbsence, EmployeeShiftAssignment, EmployeeTimeConfig } from '@/types/schedule';

interface Period { startDate: string; endDate: string }
type CalendarAbsence = EmployeeAbsence & { employee_id: string };

// Keep mutation invalidation prefixes, but never share partial rows with reports.
export function useCalendarAssignments({ startDate, endDate }: Period) {
  const { currentCompanyId } = useAuth();
  return useQuery<CalendarAssignment[]>({
    queryKey: ['shift_assignments', currentCompanyId, 'calendar', startDate, endDate],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      if (!currentCompanyId) return [];
      return fetchAllAnalyticsRows(async (from, to) => {
        const { data, error } = await supabase.from('employee_shift_assignments')
          // Shift details are already loaded once in the shared shift catalog.
          .select('id, employee_id, shift_id, assignment_date, source, employees_v2!inner(id)')
          .eq('employees_v2.company_id', currentCompanyId)
          .eq('employees_v2.is_active', true)
          .gte('assignment_date', startDate).lte('assignment_date', endDate)
          .order('assignment_date').order('id').range(from, to);
        return { data: data as CalendarAssignment[] | null, error };
      });
    },
  });
}

export function useCalendarTimeConfigs({ startDate, endDate }: Period) {
  const { currentCompanyId } = useAuth();
  return useQuery<CalendarTimeConfig[]>({
    queryKey: ['employee_time_configs', currentCompanyId, 'calendar', startDate, endDate],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      if (!currentCompanyId) return [];
      return fetchAllAnalyticsRows(async (from, to) => {
        const { data, error } = await supabase.from('employee_time_config')
          .select('id, employee_id, mode, start_date, end_date, is_active, work_schedules(*), employees_v2!inner(id)')
          .eq('employees_v2.company_id', currentCompanyId)
          .eq('employees_v2.is_active', true)
          .lte('start_date', endDate).or(`end_date.is.null,end_date.gte.${startDate}`)
          .order('start_date', { ascending: false }).order('id').range(from, to);
        return { data: data as CalendarTimeConfig[] | null, error };
      });
    },
  });
}

const absenceSources = [
  { table: 'vacation_requests', key: 'vacation-requests', type: 'vacation', description: 'Vacaciones' },
  { table: 'leave_requests', key: 'leave_requests', type: 'leave', description: 'Permiso' },
  { table: 'employee_incapacities', key: 'employee_incapacities', type: 'incapacity', description: 'Incapacidad' },
] as const;

export function useCalendarAbsences({ startDate, endDate }: Period) {
  const { currentCompanyId } = useAuth();
  // Independent queries start together, without waiting for employee records.
  // Each prefix also receives invalidations from its module's existing mutations.
  const results = useQueries({ queries: absenceSources.map(source => ({
    queryKey: [source.key, currentCompanyId, 'calendar', startDate, endDate],
    enabled: !!currentCompanyId,
    queryFn: async (): Promise<CalendarAbsence[]> => {
      if (!currentCompanyId) return [];
      const rows = await fetchAllAnalyticsRows(async (from, to) => {
        const columns = 'id, employee_id, start_date, end_date';
        const query = source.type === 'vacation'
          ? supabase.from('vacation_requests').select(columns).in('status', ['aprobado', 'en_curso', 'completado'])
          : source.type === 'leave'
            ? supabase.from('leave_requests').select(columns).eq('status', 'aprobado')
            : supabase.from('employee_incapacities').select(columns);
        const { data, error } = await query
          .eq('company_id', currentCompanyId)
          .gte('end_date', startDate).lte('start_date', endDate)
          .order('id').range(from, to);
        return { data, error };
      });
      return rows.map(row => ({ ...row, type: source.type, description: source.description }));
    },
  })) });
  const [vacations, leaves, incapacities] = results;
  const data = useMemo(() => [
    ...(vacations.data ?? []), ...(leaves.data ?? []), ...(incapacities.data ?? []),
  ], [vacations.data, leaves.data, incapacities.data]);
  return {
    data,
    isLoading: results.some(result => result.isLoading),
    error: results.find(result => result.error)?.error,
    refetch: () => Promise.all(results.map(result => result.refetch())),
  };
}

export type CalendarAssignment = Pick<EmployeeShiftAssignment, 'id' | 'employee_id' | 'shift_id' | 'assignment_date' | 'source'>;
export type CalendarTimeConfig = Pick<EmployeeTimeConfig, 'id' | 'employee_id' | 'mode' | 'start_date' | 'end_date' | 'is_active' | 'work_schedules'>;
