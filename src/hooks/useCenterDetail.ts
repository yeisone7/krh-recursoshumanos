import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export interface PositionCount {
  position_name: string;
  count: number;
}

export interface ShiftInfo {
  name: string;
  type: 'schedule' | 'cycle';
  employeeCount: number;
}

export interface AreaInfo {
  id: string;
  name: string;
  employeeCount: number;
}

export function useCenterDetail(centerId: string | undefined) {
  // 1. Employees in this center (current work info)
  const employeesQuery = useQuery({
    queryKey: ['center_detail_employees', centerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_work_info')
        .select(`
          id, employee_id, position_name, area_id, hire_date,
          areas(id, name),
          employees_v2!employee_work_info_employee_id_fkey(id, first_name, last_name, is_active)
        `)
        .eq('operation_center_id', centerId!)
        .eq('is_current', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId,
  });

  // 2. Time configs for employees in this center
  const employeeIds = useMemo(
    () => (employeesQuery.data || []).map(e => e.employee_id),
    [employeesQuery.data]
  );

  const timeConfigsQuery = useQuery({
    queryKey: ['center_detail_time_configs', centerId, employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('employee_time_config')
        .select(`
          id, employee_id, mode,
          work_schedules(id, name),
          shift_cycles(id, name)
        `)
        .in('employee_id', employeeIds)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId && employeeIds.length > 0,
  });

  // 3. Contracts for employees in this center (to check expiring)
  const contractsQuery = useQuery({
    queryKey: ['center_detail_contracts', centerId, employeeIds],
    queryFn: async () => {
      if (employeeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('id, employee_id, contract_type, start_date, end_date, is_terminated')
        .in('employee_id', employeeIds)
        .eq('is_terminated', false)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!centerId && employeeIds.length > 0,
  });

  // Aggregations
  const positionCounts = useMemo<PositionCount[]>(() => {
    const map: Record<string, number> = {};
    (employeesQuery.data || []).forEach(e => {
      const pos = e.position_name || 'Sin cargo';
      map[pos] = (map[pos] || 0) + 1;
    });
    return Object.entries(map)
      .map(([position_name, count]) => ({ position_name, count }))
      .sort((a, b) => b.count - a.count);
  }, [employeesQuery.data]);

  const shifts = useMemo<ShiftInfo[]>(() => {
    const map: Record<string, ShiftInfo> = {};
    (timeConfigsQuery.data || []).forEach(tc => {
      const schedule = tc.work_schedules as any;
      const cycle = tc.shift_cycles as any;
      if (schedule?.name) {
        const key = `s_${schedule.id}`;
        if (!map[key]) map[key] = { name: schedule.name, type: 'schedule', employeeCount: 0 };
        map[key].employeeCount++;
      } else if (cycle?.name) {
        const key = `c_${cycle.id}`;
        if (!map[key]) map[key] = { name: cycle.name, type: 'cycle', employeeCount: 0 };
        map[key].employeeCount++;
      }
    });
    return Object.values(map).sort((a, b) => b.employeeCount - a.employeeCount);
  }, [timeConfigsQuery.data]);

  const areas = useMemo<AreaInfo[]>(() => {
    const map: Record<string, { name: string; count: number }> = {};
    (employeesQuery.data || []).forEach(e => {
      const area = e.areas as any;
      if (area?.id) {
        if (!map[area.id]) map[area.id] = { name: area.name, count: 0 };
        map[area.id].count++;
      }
    });
    return Object.entries(map)
      .map(([id, v]) => ({ id, name: v.name, employeeCount: v.count }))
      .sort((a, b) => b.employeeCount - a.employeeCount);
  }, [employeesQuery.data]);

  const expiringContracts = useMemo(() => {
    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    return (contractsQuery.data || []).filter(c => {
      if (!c.end_date) return false;
      const end = new Date(c.end_date);
      return end >= now && end <= in30Days;
    }).length;
  }, [contractsQuery.data]);

  const totalEmployees = (employeesQuery.data || []).length;

  return {
    isLoading: employeesQuery.isLoading,
    totalEmployees,
    positionCounts,
    shifts,
    areas,
    expiringContracts,
  };
}
