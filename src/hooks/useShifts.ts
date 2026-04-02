import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// =============================================
// SHIFT TYPES
// =============================================

export function useShiftTypes() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['shift_types', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shift_types')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateShiftType() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (shiftType: {
      name: string;
      code: string;
      description?: string;
      start_time: string;
      end_time: string;
      break_duration_minutes?: number;
      is_night_shift?: boolean;
      is_rotating?: boolean;
      rotation_days?: number;
    }) => {
      const { data, error } = await supabase
        .from('shift_types')
        .insert({
          ...shiftType,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_types'] });
    },
  });
}

export function useUpdateShiftType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      code: string;
      description: string;
      start_time: string;
      end_time: string;
      break_duration_minutes: number;
      is_night_shift: boolean;
      is_rotating: boolean;
      rotation_days: number;
      is_active: boolean;
    }>) => {
      const { data, error } = await supabase
        .from('shift_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_types'] });
    },
  });
}

export function useDeleteShiftType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shift_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift_types'] });
    },
  });
}

// =============================================
// EMPLOYEE SHIFTS
// =============================================

export function useEmployeeShifts(employeeId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee_shifts', employeeId, currentCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('employee_shifts')
        .select(`
          *,
          shift_types(id, name, code, start_time, end_time, is_night_shift),
          employees!inner(id, first_name, last_name, company_id)
        `)
        .eq('employees.company_id', currentCompanyId!);

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query.order('effective_from', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateEmployeeShift() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (shift: {
      employee_id: string;
      shift_type_id: string;
      effective_from: string;
      effective_to?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('employee_shifts')
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
      queryClient.invalidateQueries({ queryKey: ['employee_shifts'] });
    },
  });
}

export function useUpdateEmployeeShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      shift_type_id: string;
      effective_from: string;
      effective_to: string;
      notes: string;
    }>) => {
      const { data, error } = await supabase
        .from('employee_shifts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_shifts'] });
    },
  });
}

export function useDeleteEmployeeShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_shifts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_shifts'] });
    },
  });
}
