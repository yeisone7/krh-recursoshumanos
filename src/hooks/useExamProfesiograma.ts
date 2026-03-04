import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ExamProfesiogramaItem {
  id: string;
  exam_catalog_id: string;
  notes: string | null;
  is_required: boolean;
  exam_catalog?: {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
  };
}

export interface ExamProfesiograma {
  id: string;
  company_id: string;
  operation_center_id: string;
  position_id: string;
  created_at: string;
  updated_at: string;
  operation_centers?: { id: string; name: string };
  positions?: { id: string; name: string };
  items: ExamProfesiogramaItem[];
}

export function useExamProfesiogramas() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['exam_profesiograma', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_exam_profesiogramas_with_items', { _company_id: currentCompanyId! });

      if (error) throw error;
      return (data as any[] || []) as ExamProfesiograma[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useExamProfesiogramaByEmployee(employeeId: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['exam_profesiograma_employee', employeeId, currentCompanyId],
    queryFn: async () => {
      if (!employeeId || !currentCompanyId) return null;

      const { data: workInfo } = await supabase
        .from('employee_work_info')
        .select('operation_center_id, position_id')
        .eq('employee_id', employeeId)
        .eq('is_current', true)
        .maybeSingle();

      if (!workInfo?.operation_center_id || !workInfo?.position_id) return null;

      const { data: prof } = await supabase
        .from('exam_profesiograma' as any)
        .select('id')
        .eq('company_id', currentCompanyId)
        .eq('operation_center_id', workInfo.operation_center_id)
        .eq('position_id', workInfo.position_id)
        .maybeSingle();

      if (!prof) return null;

      const { data: items } = await supabase
        .from('exam_profesiograma_items' as any)
        .select(`
          id, exam_catalog_id, notes, is_required,
          exam_catalog(id, name, code, description)
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

export function useCreateExamProfesiograma() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      operation_center_id: string;
      position_id: string;
      items: { exam_catalog_id: string; notes?: string; is_required?: boolean }[];
    }) => {
      const { data: prof, error } = await supabase
        .from('exam_profesiograma' as any)
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
          .from('exam_profesiograma_items' as any)
          .insert(
            data.items.map((item) => ({
              profesiograma_id: (prof as any).id,
              exam_catalog_id: item.exam_catalog_id,
              notes: item.notes || null,
              is_required: item.is_required !== false,
            })) as any
          );
        if (itemsError) throw itemsError;
      }

      return prof;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_profesiograma'] });
    },
  });
}

export function useUpdateExamProfesiograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      items: { exam_catalog_id: string; notes?: string; is_required?: boolean }[];
    }) => {
      await supabase
        .from('exam_profesiograma_items' as any)
        .delete()
        .eq('profesiograma_id', data.id);

      if (data.items.length > 0) {
        const { error } = await supabase
          .from('exam_profesiograma_items' as any)
          .insert(
            data.items.map((item) => ({
              profesiograma_id: data.id,
              exam_catalog_id: item.exam_catalog_id,
              notes: item.notes || null,
              is_required: item.is_required !== false,
            })) as any
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_profesiograma'] });
    },
  });
}

export function useDeleteExamProfesiograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_profesiograma' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_profesiograma'] });
    },
  });
}
