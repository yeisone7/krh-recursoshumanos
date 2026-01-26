import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CatalogItem {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  nit: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogIPS extends CatalogItem {
  address: string | null;
  city: string | null;
  phone: string | null;
}

type CatalogTableName = 
  | 'catalog_arl' 
  | 'catalog_eps' 
  | 'catalog_afp' 
  | 'catalog_ccf' 
  | 'catalog_afc' 
  | 'catalog_ips';

export function useCatalogARL() {
  return useCatalogGeneric('catalog_arl');
}

export function useCatalogEPS() {
  return useCatalogGeneric('catalog_eps');
}

export function useCatalogAFP() {
  return useCatalogGeneric('catalog_afp');
}

export function useCatalogCCF() {
  return useCatalogGeneric('catalog_ccf');
}

export function useCatalogAFC() {
  return useCatalogGeneric('catalog_afc');
}

export function useCatalogIPS() {
  return useCatalogGenericIPS();
}

function useCatalogGeneric(tableName: 'catalog_arl' | 'catalog_eps' | 'catalog_afp' | 'catalog_ccf' | 'catalog_afc') {
  const { currentCompanyId, user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [tableName, currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as CatalogItem[];
    },
    enabled: !!currentCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<CatalogItem>) => {
      if (!currentCompanyId) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          name: item.name!,
          code: item.code || null,
          nit: item.nit || null,
          is_active: item.is_active ?? true,
          company_id: currentCompanyId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Registro creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un registro con ese nombre');
      } else {
        toast.error('Error al crear el registro');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<CatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({
          name: item.name,
          code: item.code,
          nit: item.nit,
          is_active: item.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Registro actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating:', error);
      toast.error('Error al actualizar el registro');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Registro eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar el registro');
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

function useCatalogGenericIPS() {
  const { currentCompanyId, user } = useAuth();
  const queryClient = useQueryClient();
  const tableName = 'catalog_ips' as const;

  const query = useQuery({
    queryKey: [tableName, currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as CatalogIPS[];
    },
    enabled: !!currentCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<CatalogIPS>) => {
      if (!currentCompanyId) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from(tableName)
        .insert({
          name: item.name!,
          code: item.code || null,
          nit: item.nit || null,
          address: item.address || null,
          city: item.city || null,
          phone: item.phone || null,
          is_active: item.is_active ?? true,
          company_id: currentCompanyId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Registro creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un registro con ese nombre');
      } else {
        toast.error('Error al crear el registro');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<CatalogIPS> & { id: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({
          name: item.name,
          code: item.code,
          nit: item.nit,
          address: item.address,
          city: item.city,
          phone: item.phone,
          is_active: item.is_active,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Registro actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating:', error);
      toast.error('Error al actualizar el registro');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [tableName] });
      toast.success('Registro eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar el registro');
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Convenience aliases
export const useARLCatalog = useCatalogARL;
export const useEPSCatalog = useCatalogEPS;
export const useAFPCatalog = useCatalogAFP;
export const useCCFCatalog = useCatalogCCF;
export const useAFCCatalog = useCatalogAFC;
export const useIPSCatalog = useCatalogIPS;
