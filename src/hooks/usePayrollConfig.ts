import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollLaborConfig } from '@/types/payroll';

export function usePayrollConfig() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['payroll_labor_config', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_labor_config')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .maybeSingle();

      if (error) throw error;
      return data as PayrollLaborConfig | null;
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpsertPayrollConfig() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<Omit<PayrollLaborConfig, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'created_by'>>) => {
      // Check if config exists
      const { data: existing } = await supabase
        .from('payroll_labor_config')
        .select('id')
        .eq('company_id', currentCompanyId!)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('payroll_labor_config')
          .update(config)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('payroll_labor_config')
          .insert({
            ...config,
            company_id: currentCompanyId!,
            created_by: user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_labor_config'] });
    },
  });
}
