import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type DotationDelivery = Database['public']['Tables']['dotation_deliveries']['Row'];
type DotationDeliveryInsert = Database['public']['Tables']['dotation_deliveries']['Insert'];

export function useDotationDeliveries() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_deliveries', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dotation_deliveries')
        .select(`
          *,
          employees!inner(
            id, first_name, last_name, document_number, company_id,
            operation_centers(id, name)
          )
        `)
        .eq('employees.company_id', currentCompanyId!)
        .order('delivery_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useDotationDelivery(id: string | undefined) {
  return useQuery({
    queryKey: ['dotation_delivery', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('dotation_deliveries')
        .select(`
          *,
          employees(id, first_name, last_name, document_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateDotationDelivery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (delivery: Omit<DotationDeliveryInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('dotation_deliveries')
        .insert({ ...delivery, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
    },
  });
}

export function useUpdateDotationDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DotationDelivery> & { id: string }) => {
      const { data, error } = await supabase
        .from('dotation_deliveries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['dotation_delivery', data.id] });
    },
  });
}

export function useDeleteDotationDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dotation_deliveries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
    },
  });
}

// Helper function to calculate dotation status
export function getDotationStatus(delivery: { delivery_date: string; expiration_date: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expirationDate = new Date(delivery.expiration_date);
  expirationDate.setHours(0, 0, 0, 0);

  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencida';
  if (diffDays <= 30) return 'por_vencer';
  return 'vigente';
}

export function getDaysRemaining(expirationDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
