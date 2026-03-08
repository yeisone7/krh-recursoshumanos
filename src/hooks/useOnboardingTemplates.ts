import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useOnboardingTemplates(positionId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['onboarding-templates', currentCompanyId, positionId],
    enabled: !!currentCompanyId && !!positionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_task_templates')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .eq('position_id', positionId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useAddOnboardingTemplate() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ positionId, label, description }: { positionId: string; label: string; description?: string }) => {
      const { data: existing } = await supabase
        .from('onboarding_task_templates')
        .select('sort_order')
        .eq('company_id', currentCompanyId!)
        .eq('position_id', positionId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order || 0) + 1;

      const { error } = await supabase
        .from('onboarding_task_templates')
        .insert({
          company_id: currentCompanyId!,
          position_id: positionId,
          task_key: `tpl_${Date.now()}`,
          task_label: label,
          task_description: description || null,
          sort_order: nextOrder,
        });
      if (error) throw error;
      return positionId;
    },
    onSuccess: (positionId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates', currentCompanyId, positionId] });
    },
  });
}

export function useDeleteOnboardingTemplate() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ templateId, positionId }: { templateId: string; positionId: string }) => {
      const { error } = await supabase
        .from('onboarding_task_templates')
        .delete()
        .eq('id', templateId);
      if (error) throw error;
      return positionId;
    },
    onSuccess: (positionId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates', currentCompanyId, positionId] });
    },
  });
}

export function useImportPredefinedTemplates() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (positionId: string) => {
      const { PREDEFINED_TASKS } = await import('@/hooks/useOnboardingTasks');
      const templates = PREDEFINED_TASKS.map(t => ({
        company_id: currentCompanyId!,
        position_id: positionId,
        task_key: t.task_key,
        task_label: t.task_label,
        task_description: t.task_description,
        sort_order: t.sort_order,
      }));

      const { error } = await supabase
        .from('onboarding_task_templates')
        .insert(templates);
      if (error) throw error;
      return positionId;
    },
    onSuccess: (positionId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates', currentCompanyId, positionId] });
    },
  });
}

/** Fetch templates for a position, returns null if none exist */
export async function fetchPositionTemplates(companyId: string, positionId: string) {
  const { data, error } = await supabase
    .from('onboarding_task_templates')
    .select('task_key, task_label, task_description, sort_order')
    .eq('company_id', companyId)
    .eq('position_id', positionId)
    .order('sort_order');
  if (error) return null;
  return data && data.length > 0 ? data : null;
}
