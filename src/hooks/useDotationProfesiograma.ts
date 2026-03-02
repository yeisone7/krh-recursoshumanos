import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfesiogramaItem {
  id: string;
  dotation_item_type_id: string;
  quantity: number;
  notes: string | null;
  dotation_item_types?: {
    id: string;
    name: string;
    code: string | null;
    category: string;
    requires_size: boolean | null;
    sizes_available: string[] | null;
    default_validity_months: number | null;
  };
}

export interface Profesiograma {
  id: string;
  company_id: string;
  operation_center_id: string;
  position_id: string;
  created_at: string;
  updated_at: string;
  operation_centers?: { id: string; name: string };
  positions?: { id: string; name: string };
  items: ProfesiogramaItem[];
}

export function useProfesiogramas() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_profesiograma', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dotation_profesiograma' as any)
        .select(`
          id, company_id, operation_center_id, position_id, created_at, updated_at,
          operation_centers(id, name),
          positions(id, name)
        `)
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch items for each profesiograma
      const profIds = (data as any[]).map((p: any) => p.id);
      let items: any[] = [];
      if (profIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('dotation_profesiograma_items' as any)
          .select(`
            id, profesiograma_id, dotation_item_type_id, quantity, notes,
            dotation_item_types(id, name, code, category, requires_size, sizes_available, default_validity_months)
          `)
          .in('profesiograma_id', profIds);
        if (itemsError) throw itemsError;
        items = (itemsData as any[]) || [];
      }

      return (data as any[]).map((p: any) => ({
        ...p,
        items: items.filter((i: any) => i.profesiograma_id === p.id),
      })) as Profesiograma[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useProfesiogramaByEmployee(employeeId: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_profesiograma_employee', employeeId, currentCompanyId],
    queryFn: async () => {
      if (!employeeId || !currentCompanyId) return null;

      // Get employee work info
      const { data: workInfo } = await supabase
        .from('employee_work_info')
        .select('operation_center_id, position_id')
        .eq('employee_id', employeeId)
        .eq('is_current', true)
        .maybeSingle();

      if (!workInfo?.operation_center_id || !workInfo?.position_id) return null;

      // Find matching profesiograma
      const { data: prof } = await supabase
        .from('dotation_profesiograma' as any)
        .select('id')
        .eq('company_id', currentCompanyId)
        .eq('operation_center_id', workInfo.operation_center_id)
        .eq('position_id', workInfo.position_id)
        .maybeSingle();

      if (!prof) return null;

      // Get items
      const { data: items } = await supabase
        .from('dotation_profesiograma_items' as any)
        .select(`
          id, dotation_item_type_id, quantity, notes,
          dotation_item_types(id, name, code, category, requires_size, sizes_available, default_validity_months)
        `)
        .eq('profesiograma_id', (prof as any).id);

      return {
        profesiogramaId: (prof as any).id,
        items: (items as any[]) || [],
      };
    },
    enabled: !!employeeId && !!currentCompanyId,
  });
}

export function useCreateProfesiograma() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      operation_center_id: string;
      position_id: string;
      items: { dotation_item_type_id: string; quantity: number; notes?: string }[];
    }) => {
      const { data: prof, error } = await supabase
        .from('dotation_profesiograma' as any)
        .insert({
          company_id: currentCompanyId!,
          operation_center_id: data.operation_center_id,
          position_id: data.position_id,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('dotation_profesiograma_items' as any)
          .insert(
            data.items.map((item) => ({
              profesiograma_id: (prof as any).id,
              dotation_item_type_id: item.dotation_item_type_id,
              quantity: item.quantity,
              notes: item.notes || null,
            })) as any
          );
        if (itemsError) throw itemsError;
      }

      return prof;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_profesiograma'] });
    },
  });
}

export function useUpdateProfesiograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      items: { dotation_item_type_id: string; quantity: number; notes?: string }[];
    }) => {
      // Delete existing items
      await supabase
        .from('dotation_profesiograma_items' as any)
        .delete()
        .eq('profesiograma_id', data.id);

      // Insert new items
      if (data.items.length > 0) {
        const { error } = await supabase
          .from('dotation_profesiograma_items' as any)
          .insert(
            data.items.map((item) => ({
              profesiograma_id: data.id,
              dotation_item_type_id: item.dotation_item_type_id,
              quantity: item.quantity,
              notes: item.notes || null,
            })) as any
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_profesiograma'] });
    },
  });
}

export function useDeleteProfesiograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dotation_profesiograma' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_profesiograma'] });
    },
  });
}
