import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type DotationInventoryRow = Database['public']['Tables']['dotation_inventory']['Row'];
type DotationInventoryInsert = Database['public']['Tables']['dotation_inventory']['Insert'];
type DotationInventoryUpdate = Database['public']['Tables']['dotation_inventory']['Update'];

export interface DotationInventoryItem {
  id: string;
  company_id: string;
  operation_center_id: string | null;
  item_type: string;
  item_name: string;
  size: string | null;
  quantity_available: number;
  minimum_stock: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  operation_centers?: { id: string; name: string } | null;
}

async function findMatchingInventoryItem(
  item: Omit<DotationInventoryInsert, 'company_id' | 'created_by'>,
  companyId: string,
) {
  let query = supabase
    .from('dotation_inventory')
    .select('*')
    .eq('company_id', companyId)
    .eq('item_type', item.item_type)
    .eq('item_name', item.item_name);

  query = item.operation_center_id
    ? query.eq('operation_center_id', item.operation_center_id)
    : query.is('operation_center_id', null);
  query = item.size
    ? query.eq('size', item.size)
    : query.is('size', null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function addStockToExistingInventoryItem(inventoryId: string, quantity: number) {
  if (quantity > 0) {
    const { error } = await supabase.rpc('adjust_dotation_inventory', {
      p_inventory_id: inventoryId,
      p_adjustment: quantity,
      p_reason: 'Nuevo ingreso de inventario',
    });
    if (error) throw error;
  }

  const { data, error } = await supabase
    .from('dotation_inventory')
    .select()
    .eq('id', inventoryId)
    .single();
  if (error) throw error;
  return data;
}

export function useDotationInventory() {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const shouldLimitByAssignedCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  const assignedCenterKey = assignedCenterIds.join(',');

  return useQuery({
    queryKey: ['dotation_inventory', currentCompanyId, shouldLimitByAssignedCenters, assignedCenterKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dotation_inventory')
        .select('*, operation_centers(id, name)')
        .eq('company_id', currentCompanyId!)
        .order('item_name');

      if (error) throw error;
      const inventory = (data || []) as DotationInventoryItem[];
      return shouldLimitByAssignedCenters
        ? inventory.filter((item) => !!item.operation_center_id && assignedCenterIds.includes(item.operation_center_id))
        : inventory;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (item: Omit<DotationInventoryInsert, 'company_id' | 'created_by'>) => {
      const companyId = currentCompanyId!;
      const existingItem = await findMatchingInventoryItem(item, companyId);
      if (existingItem) {
        return addStockToExistingInventoryItem(existingItem.id, item.quantity_available ?? 0);
      }

      const { data, error } = await supabase
        .from('dotation_inventory')
        .insert({
          ...item,
          company_id: companyId,
          created_by: user?.id,
        } as DotationInventoryInsert)
        .select()
        .single();

      // Another ingreso may have created the same item after the lookup.
      if (error?.code === '23505') {
        const concurrentItem = await findMatchingInventoryItem(item, companyId);
        if (concurrentItem) {
          return addStockToExistingInventoryItem(concurrentItem.id, item.quantity_available ?? 0);
        }
      }
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & DotationInventoryUpdate) => {
      const { data, error } = await supabase
        .from('dotation_inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dotation_inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
    },
  });
}

export function useAdjustInventoryQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, adjustment, reason }: { id: string; adjustment: number; reason?: string }) => {
      const { data, error } = await supabase.rpc('adjust_dotation_inventory', {
        p_inventory_id: id,
        p_adjustment: adjustment,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
    },
  });
}

export function useTransferInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceInventoryId,
      destinationCenterId,
      quantity,
      reason,
    }: {
      sourceInventoryId: string;
      destinationCenterId: string | null;
      quantity: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('transfer_dotation_inventory', {
        p_source_inventory_id: sourceInventoryId,
        p_destination_center_id: destinationCenterId ?? undefined,
        p_quantity: quantity,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
    },
  });
}
