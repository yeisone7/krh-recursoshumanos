import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// =============================================
// AREAS
// =============================================

export function useAreas() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['areas', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateArea() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (area: {
      name: string;
      code?: string;
      parent_id?: string;
      manager_id?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('areas')
        .insert({
          ...area,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}

export function useUpdateArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      code: string;
      parent_id: string;
      manager_id: string;
      description: string;
      is_active: boolean;
    }>) => {
      // Clean undefined values and convert empty strings to null for nullable fields
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).map(([key, value]) => [key, value === '' ? null : value])
      );

      const { data, error } = await supabase
        .from('areas')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}

export function useDeleteArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] });
    },
  });
}

// =============================================
// POSITIONS
// =============================================

export function usePositions() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['positions', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          areas(id, name)
        `)
        .eq('company_id', currentCompanyId!)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreatePosition() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (position: {
      name: string;
      code?: string;
      area_id?: string;
      level?: number;
      min_salary?: number;
      max_salary?: number;
      description?: string;
      requirements?: string;
    }) => {
      const { data, error } = await supabase
        .from('positions')
        .insert({
          ...position,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useUpdatePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      code: string;
      area_id: string;
      level: number;
      min_salary: number;
      max_salary: number;
      description: string;
      requirements: string;
      is_active: boolean;
    }>) => {
      const { data, error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

export function useDeletePosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
    },
  });
}

// =============================================
// CONTRACT TYPE CONFIG
// =============================================

export function useContractTypeConfig() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['contract_type_config', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_type_config')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('display_name');

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpsertContractTypeConfig() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (config: {
      contract_type: string;
      display_name: string;
      max_duration_months?: number;
      max_extensions?: number;
      requires_end_date?: boolean;
      default_trial_days?: number;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('contract_type_config')
        .upsert({
          ...config,
          company_id: currentCompanyId!,
        }, { onConflict: 'company_id,contract_type' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_type_config'] });
    },
  });
}

// =============================================
// DOTATION ITEM TYPES
// =============================================

export function useDotationItemTypes() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_item_types', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dotation_item_types')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateDotationItemType() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (itemType: {
      name: string;
      code?: string;
      category: string;
      default_validity_months?: number;
      requires_size?: boolean;
      sizes_available?: string[];
      description?: string;
      image_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('dotation_item_types')
        .insert({
          ...itemType,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_item_types'] });
    },
  });
}

export function useUpdateDotationItemType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      code: string;
      category: string;
      default_validity_months: number;
      requires_size: boolean;
      sizes_available: string[];
      description: string;
      is_active: boolean;
      image_url: string | null;
    }>) => {
      const { data, error } = await supabase
        .from('dotation_item_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_item_types'] });
    },
  });
}

export function useDeleteDotationItemType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dotation_item_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_item_types'] });
    },
  });
}

// =============================================
// SYSTEM CONFIG
// =============================================

export interface AlertConfig {
  warning: number;
  critical: number;
}

export interface WorkScheduleConfig {
  hours_per_day: number;
  days_per_week: number;
}

export function useSystemConfig() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['system_config', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('company_id', currentCompanyId!);

      if (error) throw error;
      
      // Transform to a key-value map
      const configMap: Record<string, any> = {};
      data?.forEach(item => {
        configMap[item.config_key] = item.config_value;
      });
      
      return configMap;
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ key, value, description }: { 
      key: string; 
      value: any;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('system_config')
        .upsert({
          company_id: currentCompanyId!,
          config_key: key,
          config_value: value,
          description,
          updated_by: user?.id,
        }, { onConflict: 'company_id,config_key' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system_config'] });
    },
  });
}

// =============================================
// COMPANY MANAGEMENT
// =============================================

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      name: string;
      nit: string;
      address: string;
      phone: string;
      email: string;
      logo_url: string;
    }>) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['current_company'] });
    },
  });
}
