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

export function useDotationInventory() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_inventory', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dotation_inventory')
        .select('*, operation_centers(id, name)')
        .eq('company_id', currentCompanyId!)
        .order('item_name');

      if (error) throw error;
      return (data || []) as DotationInventoryItem[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (item: Omit<DotationInventoryInsert, 'company_id' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('dotation_inventory')
        .insert({
          ...item,
          company_id: currentCompanyId!,
          created_by: user?.id,
        } as DotationInventoryInsert)
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
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, adjustment, reason }: { id: string; adjustment: number; reason?: string }) => {
      // Get current quantity
      const { data: current, error: fetchError } = await supabase
        .from('dotation_inventory')
        .select('quantity_available')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const previousStock = current?.quantity_available || 0;
      const newQuantity = Math.max(0, previousStock + adjustment);

      const { data, error } = await supabase
        .from('dotation_inventory')
        .update({ quantity_available: newQuantity })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Record movement
      const movementType = adjustment > 0 ? 'entrada' : 'salida';
      try {
        await supabase.from('dotation_inventory_movements').insert({
          company_id: currentCompanyId!,
          inventory_item_id: id,
          movement_type: reason === 'devolucion' ? 'devolucion' : reason === 'ajuste' ? 'ajuste' : movementType,
          quantity: Math.abs(adjustment),
          previous_stock: previousStock,
          new_stock: newQuantity,
          reason: reason || null,
          created_by: user?.id || null,
        });
      } catch (e) {
        console.warn('Failed to record movement:', e);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
    },
  });
}
