import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export type HRAutomationEntity =
  | 'employee'
  | 'candidate'
  | 'leave_request'
  | 'vacation_request'
  | 'performance_review'
  | 'onboarding';

export type HRAutomationTrigger =
  | 'employee_hired'
  | 'status_changed'
  | 'department_changed'
  | 'review_completed'
  | 'leave_requested'
  | 'vacation_requested'
  | 'candidate_status_changed'
  | 'onboarding_task_completed';

export type HRAutomationAction =
  | 'set_status'
  | 'assign_to'
  | 'notify'
  | 'schedule_meeting'
  | 'create_task';

export interface HRAutomation {
  id: string;
  company_id: string;
  entity_type: HRAutomationEntity;
  name: string;
  enabled: boolean;
  trigger_type: HRAutomationTrigger;
  trigger_config: Record<string, unknown>;
  action_type: HRAutomationAction;
  action_config: Record<string, unknown>;
  created_by: string | null;
  last_run_at: string | null;
  run_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface HRAutomationRun {
  id: string;
  automation_id: string;
  company_id: string;
  entity_type: HRAutomationEntity;
  record_id: string;
  event_type: string;
  status: 'queued' | 'processing' | 'success' | 'error' | string;
  success: boolean;
  message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface HRAutomationInput {
  entity_type: HRAutomationEntity;
  name: string;
  enabled?: boolean;
  trigger_type: HRAutomationTrigger;
  trigger_config?: Record<string, unknown>;
  action_type: HRAutomationAction;
  action_config?: Record<string, unknown>;
}

export function useHRAutomations(entityType?: HRAutomationEntity | 'all') {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['hr-automations', currentCompanyId, entityType || 'all'],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = db
        .from('hr_automations')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });

      if (entityType && entityType !== 'all') {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as HRAutomation[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useHRAutomationRuns(automationIds: string[]) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['hr-automation-runs', currentCompanyId, automationIds],
    queryFn: async () => {
      if (!currentCompanyId || automationIds.length === 0) return [];

      const { data, error } = await db
        .from('hr_automation_runs')
        .select('*')
        .eq('company_id', currentCompanyId)
        .in('automation_id', automationIds)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      return (data || []) as HRAutomationRun[];
    },
    enabled: !!currentCompanyId && automationIds.length > 0,
  });
}

export function useCreateHRAutomation() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: HRAutomationInput) => {
      if (!currentCompanyId) throw new Error('No hay empresa activa.');

      const { data, error } = await db
        .from('hr_automations')
        .insert({
          ...input,
          company_id: currentCompanyId,
          created_by: user?.id,
          enabled: input.enabled ?? true,
          trigger_config: input.trigger_config || {},
          action_config: input.action_config || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as HRAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-automations'] });
      toast.success('Automatizacion creada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo crear la automatizacion'),
  });
}

export function useUpdateHRAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<HRAutomationInput> & { id: string; enabled?: boolean }) => {
      const { data, error } = await db
        .from('hr_automations')
        .update(changes)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as HRAutomation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-automations'] });
      toast.success('Automatizacion actualizada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo actualizar la automatizacion'),
  });
}

export function useDeleteHRAutomation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('hr_automations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-automations'] });
      queryClient.invalidateQueries({ queryKey: ['hr-automation-runs'] });
      toast.success('Automatizacion eliminada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo eliminar la automatizacion'),
  });
}
