import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InventoryMovement {
  id: string;
  company_id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  reference_id: string | null;
  created_by: string | null;
  created_at: string;
  dotation_inventory?: {
    id: string;
    item_name: string;
    item_type: string;
    size: string | null;
    operation_centers: { name: string } | null;
  } | null;
}

export function useInventoryMovements(itemId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['inventory_movements', currentCompanyId, itemId],
    queryFn: async () => {
      let query = supabase
        .from('dotation_inventory_movements')
        .select('*, dotation_inventory(id, item_name, item_type, size, operation_centers(name))')
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false })
        .limit(500);

      if (itemId) {
        query = query.eq('inventory_item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InventoryMovement[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: {
      company_id: string;
      inventory_item_id: string;
      movement_type: string;
      quantity: number;
      previous_stock: number;
      new_stock: number;
      reason?: string;
      reference_id?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('dotation_inventory_movements')
        .insert(movement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
    },
  });
}
