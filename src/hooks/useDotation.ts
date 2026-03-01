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

// Helper to get employee info from employees_v2
async function getEmployeeV2Info(employeeId: string) {
  const { data } = await supabase
    .from('employees_v2')
    .select(`
      id, 
      first_name, 
      middle_name,
      last_name, 
      second_last_name,
      document_number,
      company_id,
      employee_work_info(
        id,
        position_name,
        operation_center_id,
        is_current,
        operation_centers(id, name)
      )
    `)
    .eq('id', employeeId)
    .maybeSingle();
  
  return data;
}

export function useDotationDeliveries() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_deliveries', currentCompanyId],
    queryFn: async () => {
      // Get all dotation deliveries
      const { data: deliveries, error } = await supabase
        .from('dotation_deliveries')
        .select('*')
        .order('delivery_date', { ascending: false });

      if (error) throw error;
      if (!deliveries) return [];

      // Get unique employee IDs
      const employeeIds = [...new Set(deliveries.map(d => d.employee_id))];
      
      // Fetch employees from employees_v2 with work info
      const { data: employees } = await supabase
        .from('employees_v2')
        .select(`
          id, 
          first_name, 
          middle_name,
          last_name, 
          second_last_name,
          document_number,
          company_id,
          employee_work_info(
            id,
            position_name,
            operation_center_id,
            is_current,
            operation_centers(id, name)
          )
        `)
        .in('id', employeeIds)
        .eq('company_id', currentCompanyId!);

      // Create a map for quick lookup
      const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);

      // Combine deliveries with employee data
      return deliveries
        .map(delivery => {
          const employee = employeeMap.get(delivery.employee_id);
          if (!employee) return null; // Filter out deliveries without matching employee in company
          
          const currentWorkInfo = employee.employee_work_info?.find((w: any) => w.is_current);
          
          return {
            ...delivery,
            employees: {
              id: employee.id,
              first_name: employee.first_name,
              middle_name: employee.middle_name,
              last_name: employee.last_name,
              second_last_name: employee.second_last_name,
              document_number: employee.document_number,
              company_id: employee.company_id,
              operation_centers: currentWorkInfo?.operation_centers || null
            }
          };
        })
        .filter(Boolean);
    },
    enabled: !!currentCompanyId,
  });
}

export function useDotationDelivery(id: string | undefined) {
  return useQuery({
    queryKey: ['dotation_delivery', id],
    queryFn: async () => {
      if (!id) return null;
      const { data: delivery, error } = await supabase
        .from('dotation_deliveries')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch employee info from employees_v2
      const employee = await getEmployeeV2Info(delivery.employee_id);

      return {
        ...delivery,
        employees: employee ? {
          id: employee.id,
          first_name: employee.first_name,
          middle_name: employee.middle_name,
          last_name: employee.last_name,
          second_last_name: employee.second_last_name,
          document_number: employee.document_number
        } : null
      };
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
        .select()
        .single();

      if (error) throw error;

      // Auto-deduct from inventory
      try {
        // Find matching inventory item
        const { data: employee } = await supabase
          .from('employees_v2')
          .select('company_id, employee_work_info(operation_center_id, is_current)')
          .eq('id', data.employee_id)
          .maybeSingle();

        const currentWorkInfo = employee?.employee_work_info?.find((w: any) => w.is_current);
        const centerId = currentWorkInfo?.operation_center_id || null;

        // Try to find inventory match (with center, then without)
        let inventoryQuery = supabase
          .from('dotation_inventory')
          .select('id, quantity_available')
          .eq('company_id', employee?.company_id || '')
          .eq('item_type', data.item_type)
          .eq('item_name', data.item_name);

        if (data.size) {
          inventoryQuery = inventoryQuery.eq('size', data.size);
        } else {
          inventoryQuery = inventoryQuery.is('size', null);
        }

        // Try with center first
        if (centerId) {
          const { data: withCenter } = await inventoryQuery.eq('operation_center_id', centerId).maybeSingle();
          if (withCenter) {
            const newQty = Math.max(0, withCenter.quantity_available - (data.quantity || 1));
            await supabase
              .from('dotation_inventory')
              .update({ quantity_available: newQty })
              .eq('id', withCenter.id);
            // Record movement
            await supabase.from('dotation_inventory_movements').insert({
              company_id: employee?.company_id || '',
              inventory_item_id: withCenter.id,
              movement_type: 'entrega',
              quantity: data.quantity || 1,
              previous_stock: withCenter.quantity_available,
              new_stock: newQty,
              reason: `Entrega a empleado`,
              reference_id: data.id,
              created_by: user?.id || null,
            });
          } else {
            // Fallback: try general (no center)
            const { data: general } = await supabase
              .from('dotation_inventory')
              .select('id, quantity_available')
              .eq('company_id', employee?.company_id || '')
              .eq('item_type', data.item_type)
              .eq('item_name', data.item_name)
              .is('operation_center_id', null)
              .maybeSingle();
            if (general) {
              const newQty = Math.max(0, general.quantity_available - (data.quantity || 1));
              await supabase
                .from('dotation_inventory')
                .update({ quantity_available: newQty })
                .eq('id', general.id);
              await supabase.from('dotation_inventory_movements').insert({
                company_id: employee?.company_id || '',
                inventory_item_id: general.id,
                movement_type: 'entrega',
                quantity: data.quantity || 1,
                previous_stock: general.quantity_available,
                new_stock: newQty,
                reason: `Entrega a empleado`,
                reference_id: data.id,
                created_by: user?.id || null,
              });
            }
          }
        } else {
          const { data: general } = await inventoryQuery.is('operation_center_id', null).maybeSingle();
          if (general) {
            const newQty = Math.max(0, general.quantity_available - (data.quantity || 1));
            await supabase
              .from('dotation_inventory')
              .update({ quantity_available: newQty })
              .eq('id', general.id);
            await supabase.from('dotation_inventory_movements').insert({
              company_id: employee?.company_id || '',
              inventory_item_id: general.id,
              movement_type: 'entrega',
              quantity: data.quantity || 1,
              previous_stock: general.quantity_available,
              new_stock: newQty,
              reason: `Entrega a empleado`,
              reference_id: data.id,
              created_by: user?.id || null,
            });
          }
        }
      } catch (inventoryError) {
        console.warn('Could not auto-deduct from inventory:', inventoryError);
      }

      // Get employee info for audit log
      const employee = await getEmployeeV2Info(data.employee_id);

      // Log audit event
      if (user) {
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}`
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
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
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
        .select('*')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('dotation_deliveries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Get employee info for audit log
      const employee = oldData ? await getEmployeeV2Info(oldData.employee_id) : null;

      // Log audit event
      if (user && oldData) {
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}`
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
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('dotation_deliveries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Get employee info for audit log
      const employee = delivery ? await getEmployeeV2Info(delivery.employee_id) : null;

      // Log audit event
      if (user && delivery) {
        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}`
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
