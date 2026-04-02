import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  WorkSchedule, 
  Shift, 
  ShiftCycle, 
  ShiftCycleDay,
  EmployeeTimeConfig,
  EmployeeShiftAssignment,
  EmployeeTimeMode,
  ShiftAssignmentSource,
} from '@/types/schedule';

// =============================================
// WORK SCHEDULES (Horarios Administrativos)
// =============================================

export function useWorkSchedules() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['work_schedules', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_schedules')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return data as WorkSchedule[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateWorkSchedule() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (schedule: Omit<WorkSchedule, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('work_schedules')
        .insert({
          ...schedule,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_schedules'] });
    },
  });
}

export function useUpdateWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('work_schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_schedules'] });
    },
  });
}

export function useDeleteWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('work_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work_schedules'] });
    },
  });
}

// =============================================
// SHIFTS (Turnos Operativos)
// =============================================

export function useShifts() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['shifts', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (shift: Omit<Shift, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          ...shift,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Shift> & { id: string }) => {
      const { data, error } = await supabase
        .from('shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

// =============================================
// SHIFT CYCLES (Ciclos de Rotación)
// =============================================

export function useShiftCycles() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['shift_cycles', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_cycles')
        .select(`
          *,
          cycle_days:shift_cycle_days(
            *,
            shifts(*)
          )
        `)
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return data as ShiftCycle[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateShiftCycle() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      cycle: Omit<ShiftCycle, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by' | 'cycle_days'>;
      days: { day_number: number; shift_id: string }[];
    }) => {
      // Create the cycle first
      const { data: cycle, error: cycleError } = await supabase
        .from('shift_cycles')
        .insert({
          ...data.cycle,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (cycleError) throw cycleError;

      // Then create the cycle days
      if (data.days.length > 0) {
        const { error: daysError } = await supabase
          .from('shift_cycle_days')
          .insert(
            data.days.map(day => ({
              shift_cycle_id: cycle.id,
              day_number: day.day_number,
              shift_id: day.shift_id,
            }))
          );

        if (daysError) throw daysError;
      }

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_cycles'] });
    },
  });
}

export function useUpdateShiftCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      cycle: Partial<ShiftCycle>;
      days?: { day_number: number; shift_id: string }[];
    }) => {
      // Update the cycle
      const { data: cycle, error: cycleError } = await supabase
        .from('shift_cycles')
        .update(data.cycle)
        .eq('id', data.id)
        .select()
        .single();

      if (cycleError) throw cycleError;

      // If days are provided, replace them
      if (data.days) {
        // Delete existing days
        const { error: deleteError } = await supabase
          .from('shift_cycle_days')
          .delete()
          .eq('shift_cycle_id', data.id);

        if (deleteError) throw deleteError;

        // Insert new days
        if (data.days.length > 0) {
          const { error: daysError } = await supabase
            .from('shift_cycle_days')
            .insert(
              data.days.map(day => ({
                shift_cycle_id: data.id,
                day_number: day.day_number,
                shift_id: day.shift_id,
              }))
            );

          if (daysError) throw daysError;
        }
      }

      return cycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_cycles'] });
    },
  });
}

export function useDeleteShiftCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_cycles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_cycles'] });
    },
  });
}

// =============================================
// EMPLOYEE TIME CONFIG
// =============================================

export function useEmployeeTimeConfigs(employeeId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee_time_configs', currentCompanyId, employeeId],
    queryFn: async () => {
      let query = supabase
        .from('employee_time_config')
        .select(`
          *,
          work_schedules(*),
          shift_cycles(*),
          employees_v2!inner(id, first_name, last_name, document_number, company_id)
        `)
        .eq('employees_v2.company_id', currentCompanyId!);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query.order('start_date', { ascending: false });

      if (error) throw error;
      return data as EmployeeTimeConfig[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useActiveEmployeeTimeConfig(employeeId: string) {
  return useQuery({
    queryKey: ['employee_time_config_active', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_time_config')
        .select(`
          *,
          work_schedules(*),
          shift_cycles(
            *,
            cycle_days:shift_cycle_days(*, shifts(*))
          )
        `)
        .eq('employee_id', employeeId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as EmployeeTimeConfig | null;
    },
    enabled: !!employeeId,
  });
}

export function useCreateEmployeeTimeConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: {
      employee_id: string;
      mode: EmployeeTimeMode;
      work_schedule_id?: string;
      shift_cycle_id?: string;
      cycle_start_date?: string;
      start_date: string;
      end_date?: string;
      notes?: string;
    }) => {
      // First, deactivate any existing active config for this employee
      await supabase
        .from('employee_time_config')
        .update({ is_active: false, end_date: config.start_date })
        .eq('employee_id', config.employee_id)
        .eq('is_active', true);

      // Then create the new config
      const { data, error } = await supabase
        .from('employee_time_config')
        .insert({
          ...config,
          company_id: currentCompanyId!,
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_time_configs'] });
      queryClient.invalidateQueries({ queryKey: ['employee_time_config_active'] });
    },
  });
}

export function useUpdateEmployeeTimeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeTimeConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_time_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_time_configs'] });
      queryClient.invalidateQueries({ queryKey: ['employee_time_config_active'] });
    },
  });
}

// =============================================
// EMPLOYEE SHIFT ASSIGNMENTS
// =============================================

export function useShiftAssignments(options: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  centerId?: string;
}) {
  const { currentCompanyId } = useAuth();
  const { employeeId, startDate, endDate, centerId } = options;

  return useQuery({
    queryKey: ['shift_assignments', currentCompanyId, employeeId, startDate, endDate, centerId],
    queryFn: async () => {
      let query = supabase
        .from('employee_shift_assignments')
        .select(`
          *,
          shifts(*),
          employees_v2!inner(
            id, first_name, last_name, document_number, company_id,
            employee_work_info!inner(operation_center_id, area_id, is_current)
          )
        `)
        .eq('employees_v2.company_id', currentCompanyId!)
        .eq('employees_v2.employee_work_info.is_current', true);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      if (startDate) {
        query = query.gte('assignment_date', startDate);
      }

      if (endDate) {
        query = query.lte('assignment_date', endDate);
      }

      if (centerId) {
        query = query.eq('employees_v2.employee_work_info.operation_center_id', centerId);
      }

      const { data, error } = await query.order('assignment_date');

      if (error) throw error;
      return data as EmployeeShiftAssignment[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateShiftAssignment() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (assignment: {
      employee_id: string;
      shift_id: string;
      assignment_date: string;
      source?: ShiftAssignmentSource;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('employee_shift_assignments')
        .insert({
          ...assignment,
          company_id: currentCompanyId!,
          source: assignment.source || 'manual',
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useCreateBulkShiftAssignments() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignments: {
      employee_id: string;
      shift_id: string;
      assignment_date: string;
      source?: ShiftAssignmentSource;
      notes?: string;
    }[]) => {
      // Use upsert to handle conflicts
      const { data, error } = await supabase
        .from('employee_shift_assignments')
        .upsert(
          assignments.map(a => ({
            ...a,
            company_id: currentCompanyId!,
            source: a.source || 'manual',
            created_by: user?.id,
          })),
          { onConflict: 'employee_id,assignment_date' }
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useUpdateShiftAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeShiftAssignment> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_shift_assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useDeleteShiftAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_shift_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useDeleteBulkShiftAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('employee_shift_assignments')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}
