import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import type { RequisitionWorkflowVersion, WorkflowAnswers, WorkflowStep } from '@/types/requisitionWorkflow';
import { toast } from 'sonner';

export function useCompanyRequisitionWorkflow() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['requisition-workflow', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from('requisition_workflow_settings')
        .select('version:requisition_workflow_versions(*)').eq('company_id', currentCompanyId!).maybeSingle();
      if (error) throw error;
      return (data?.version ?? null) as unknown as RequisitionWorkflowVersion | null;
    },
  });
}

export function usePublishRequisitionWorkflow() {
  const { currentCompanyId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ steps, expectedVersionId }: { steps: WorkflowStep[]; expectedVersionId: string | null }) => {
      const { data, error } = await supabase.rpc('publish_requisition_workflow', {
        p_company_id: currentCompanyId!, p_steps: steps as unknown as Json, p_expected_version_id: expectedVersionId,
      });
      if (error) throw error;
      return data as unknown as RequisitionWorkflowVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requisition-workflow'] });
      qc.invalidateQueries({ queryKey: ['requisition-workflow-access'] });
      toast.success('Ciclo publicado. Se aplicará a las próximas requisiciones enviadas.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRequisitionWorkflowAccess(enabled = true) {
  const { currentCompanyId, user } = useAuth();
  return useQuery({
    queryKey: ['requisition-workflow-access', currentCompanyId, user?.id],
    enabled: enabled && !!currentCompanyId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('has_requisition_workflow_assignment', { p_company_id: currentCompanyId! });
      if (error) throw error;
      return data === true;
    },
  });
}

export function useCanApproveConfiguredStep(requisitionId?: string, stepId?: string | null) {
  const { user, currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['can-approve-requisition-step', currentCompanyId, user?.id, requisitionId, stepId],
    enabled: !!requisitionId && !!stepId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('can_approve_requisition_step', {
        p_requisition_id: requisitionId!, p_step_id: stepId!,
      });
      if (error) throw error;
      return data === true;
    },
  });
}

export async function notifyRequisitionApprover(id: string, status: string, title: string) {
  if (['aprobada', 'rechazada', 'cerrada'].includes(status)) return;
  try {
    const { error } = await supabase.functions.invoke('notify-requisition-approver', {
      body: { requisitionId: id, currentStep: status, requisitionTitle: title },
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error notificando al aprobador:', error);
    toast.warning('La operación se guardó, pero no se pudo enviar la notificación.');
  }
}

export function useApproveConfiguredRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { requisitionId: string; stepId: string; approved: boolean; observations: string; answers: WorkflowAnswers }) => {
      const { data, error } = await supabase.rpc('approve_requisition_step', {
        p_requisition_id: input.requisitionId, p_step_id: input.stepId, p_approved: input.approved,
        p_observations: input.observations, p_answers: input.answers,
      });
      if (error) throw error;
      await notifyRequisitionApprover(data.id, data.estado_requisicion, data.cargo_solicitado);
      return data;
    },
    onSuccess: (data) => {
      for (const key of ['requisitions', 'requisition', 'requisition-vacancies', 'can-approve-requisition-step', 'approved-requisitions', 'unified-alerts']) {
        qc.invalidateQueries({ queryKey: [key] });
      }
      toast.success(data.estado_requisicion === 'rechazada' ? 'Requisición rechazada.' : 'Aprobación registrada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
