import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface EmployeeDeduction {
  id: string;
  company_id: string;
  employee_id: string;
  deduction_type: string;
  description: string;
  amount: number;
  is_percentage: boolean;
  percentage_value: number | null;
  start_date: string;
  end_date: string | null;
  is_recurring: boolean;
  reference_number: string | null;
  entity_name: string | null;
  status: string;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export function useDeductions() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee_deductions', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_deductions')
        .select('*, employees_v2(id, first_name, last_name, document_number)')
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EmployeeDeduction[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateDeduction() {
  const qc = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (ded: Omit<EmployeeDeduction, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'employees_v2' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('employee_deductions')
        .insert({ ...ded, company_id: currentCompanyId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_deductions'] });
      toast({ title: 'Descuento registrado correctamente' });
    },
    onError: (e: any) => toast({ title: 'Error al registrar descuento', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateDeduction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeDeduction> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_deductions')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_deductions'] });
      toast({ title: 'Descuento actualizado' });
    },
    onError: (e: any) => toast({ title: 'Error al actualizar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteDeduction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_deductions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_deductions'] });
      toast({ title: 'Descuento eliminado' });
    },
    onError: (e: any) => toast({ title: 'Error al eliminar', description: e.message, variant: 'destructive' }),
  });
}
