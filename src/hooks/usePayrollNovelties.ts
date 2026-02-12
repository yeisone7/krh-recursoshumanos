import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollNovelty, NoveltyType } from '@/types/payroll';

export function usePayrollNovelties(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['payroll_novelties', currentCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('payroll_novelties')
        .select(`
          *,
          employees_v2(id, first_name, last_name, document_number),
          novelty_reasons(id, item_number, name)
        `)
        .eq('company_id', currentCompanyId!)
        .order('novelty_date', { ascending: false });

      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.startDate) {
        query = query.gte('novelty_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('novelty_date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PayrollNovelty[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreatePayrollNovelty() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (novelty: {
      employee_id: string;
      novelty_date: string;
      novelty_type: NoveltyType;
      hours: number;
      notes?: string;
      source?: string;
      start_time?: string | null;
      end_time?: string | null;
      reason_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('payroll_novelties')
        .insert({
          ...novelty,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}

export function useUpdatePayrollNovelty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      novelty_date: string;
      novelty_type: NoveltyType;
      hours: number;
      notes: string;
      start_time: string | null;
      end_time: string | null;
      reason_id: string | null;
    }>) => {
      const { data, error } = await supabase
        .from('payroll_novelties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}

export function useDeletePayrollNovelty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payroll_novelties')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}
