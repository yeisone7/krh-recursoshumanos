import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContractTypeConfig {
  id: string;
  company_id: string;
  contract_type: string;
  display_name: string;
  description: string | null;
  max_duration_months: number | null;
  max_extensions: number | null;
  requires_end_date: boolean;
  default_trial_days: number | null;
  is_active: boolean;
  template_url: string | null;
  template_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useContractTypes() {
  const { currentCompanyId, user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contract_types', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      
      const { data, error } = await supabase
        .from('contract_type_config')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('display_name', { ascending: true });

      if (error) throw error;
      return (data || []) as ContractTypeConfig[];
    },
    enabled: !!currentCompanyId,
  });

  const createMutation = useMutation({
    mutationFn: async (item: Partial<ContractTypeConfig>) => {
      if (!currentCompanyId) throw new Error('No company selected');
      
      const { data, error } = await supabase
        .from('contract_type_config')
        .insert({
          contract_type: item.contract_type!,
          display_name: item.display_name!,
          description: item.description || null,
          max_duration_months: item.max_duration_months || null,
          max_extensions: item.max_extensions || null,
          requires_end_date: item.requires_end_date ?? true,
          default_trial_days: item.default_trial_days || 0,
          is_active: item.is_active ?? true,
          template_url: item.template_url || null,
          template_file_name: item.template_file_name || null,
          company_id: currentCompanyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_types'] });
      queryClient.invalidateQueries({ queryKey: ['contract_type_config'] });
      toast.success('Tipo de contrato creado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error creating:', error);
      if (error.code === '23505') {
        toast.error('Ya existe un tipo de contrato con ese código');
      } else {
        toast.error('Error al crear el tipo de contrato');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<ContractTypeConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('contract_type_config')
        .update({
          contract_type: item.contract_type,
          display_name: item.display_name,
          description: item.description,
          max_duration_months: item.max_duration_months,
          max_extensions: item.max_extensions,
          requires_end_date: item.requires_end_date,
          default_trial_days: item.default_trial_days,
          is_active: item.is_active,
          template_url: item.template_url,
          template_file_name: item.template_file_name,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_types'] });
      queryClient.invalidateQueries({ queryKey: ['contract_type_config'] });
      toast.success('Tipo de contrato actualizado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error updating:', error);
      toast.error('Error al actualizar el tipo de contrato');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contract_type_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract_types'] });
      queryClient.invalidateQueries({ queryKey: ['contract_type_config'] });
      toast.success('Tipo de contrato eliminado exitosamente');
    },
    onError: (error: any) => {
      console.error('Error deleting:', error);
      toast.error('Error al eliminar el tipo de contrato');
    },
  });

  const uploadTemplate = async (file: File, contractTypeId: string): Promise<string | null> => {
    if (!currentCompanyId) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${contractTypeId}.${fileExt}`;
    const filePath = `${currentCompanyId}/contract-templates/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Error al subir la plantilla');
      return null;
    }

    return filePath;
  };

  const downloadTemplate = async (templateUrl: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(templateUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'plantilla.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error al descargar la plantilla');
    }
  };

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutate,
    uploadTemplate,
    downloadTemplate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
