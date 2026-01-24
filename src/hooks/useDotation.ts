import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type DotationDelivery = Database['public']['Tables']['dotation_deliveries']['Row'];
type DotationDeliveryInsert = Database['public']['Tables']['dotation_deliveries']['Insert'];

// Helper function to log audit events
async function logAuditEvent(
  userId: string,
  userEmail: string | undefined,
  companyId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      user_email: userEmail,
      company_id: companyId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      old_values: oldValues,
      new_values: newValues,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

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
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (delivery: Omit<DotationDeliveryInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('dotation_deliveries')
        .insert({ ...delivery, created_by: user?.id })
        .select(`*, employees(first_name, last_name)`)
        .single();

      if (error) throw error;

      // Log audit event
      if (user) {
        const employeeName = data.employees 
          ? `${(data.employees as any).first_name} ${(data.employees as any).last_name}`
          : 'Empleado';
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'deliver_dotation',
          'dotation',
          data.id,
          `${data.item_name} - ${employeeName}`,
          undefined,
          { item_type: data.item_type, item_name: data.item_name, quantity: data.quantity }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
    },
  });
}

export function useUpdateDotationDelivery() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DotationDelivery> & { id: string }) => {
      // Get old values first
      const { data: oldData } = await supabase
        .from('dotation_deliveries')
        .select('*, employees(first_name, last_name)')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('dotation_deliveries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user && oldData) {
        const employeeName = oldData.employees 
          ? `${(oldData.employees as any).first_name} ${(oldData.employees as any).last_name}`
          : 'Empleado';
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'update',
          'dotation',
          data.id,
          `${oldData.item_name} - ${employeeName}`,
          oldData,
          updates
        );
      }

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
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get delivery data before delete
      const { data: delivery } = await supabase
        .from('dotation_deliveries')
        .select('*, employees(first_name, last_name)')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('dotation_deliveries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit event
      if (user && delivery) {
        const employeeName = delivery.employees 
          ? `${(delivery.employees as any).first_name} ${(delivery.employees as any).last_name}`
          : 'Empleado';
        await logAuditEvent(
          user.id,
          user.email,
          currentCompanyId,
          'delete',
          'dotation',
          id,
          `${delivery.item_name} - ${employeeName}`,
          delivery,
          undefined
        );
      }
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
