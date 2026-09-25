import { fetchAllAnalyticsRows } from '@/lib/employeeAnalyticsData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { writePayrollRecords } from '@/lib/payrollCorrections';
import type { PayrollNovelty, NoveltyType } from '@/types/payroll';

export function usePayrollNovelties(filters?: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['payroll_novelties', currentCompanyId, filters],
    queryFn: async () => fetchAllAnalyticsRows(async (from, to) => {
      let query = supabase
        .from('payroll_novelties')
        .select(`
          *,
          employees_v2(
            id, first_name, last_name, document_number,
            employee_work_info(operation_centers(name))
          ),
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

      const { data, error } = await query.order('id').range(from, to);
      return { data: data as PayrollNovelty[] | null, error };
    }),
    enabled: !!currentCompanyId,
  });
}

export function useCreatePayrollNovelty() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

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
      const [data] = await writePayrollRecords<PayrollNovelty>(currentCompanyId, [{ module: 'novedades', action: 'create', values: novelty }]);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}

export function useUpdatePayrollNovelty() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

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
      const [data] = await writePayrollRecords<PayrollNovelty>(currentCompanyId, [{ module: 'novedades', action: 'update', id, values: updates }]);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}

export function useDeletePayrollNovelty() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      await writePayrollRecords(currentCompanyId, [{ module: 'novedades', action: 'delete', id }]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}

export function useApprovePayrollNovelty() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'aprobada' | 'rechazada' }) => {
      const [data] = await writePayrollRecords<PayrollNovelty>(currentCompanyId, [{ module: 'novedades', action: 'approve', id, values: { status } }]);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}

