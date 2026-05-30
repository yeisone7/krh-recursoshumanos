import { todayDateOnlyString } from '@/lib/dateOnly';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export type ComplianceDomain =
  | 'pila_ugpp'
  | 'nomina_electronica'
  | 'sg_sst'
  | 'documental_laboral'
  | 'juridico_laboral'
  | 'contratos'
  | 'seguridad_social';

export type ComplianceStatus = 'pendiente' | 'en_proceso' | 'cumplido' | 'vencido' | 'no_aplica';
export type CompliancePriority = 'baja' | 'media' | 'alta' | 'critica';

export interface ComplianceTemplate {
  id: string;
  domain: ComplianceDomain;
  title: string;
  description: string | null;
  legal_reference: string | null;
  default_priority: CompliancePriority;
  suggested_frequency: string | null;
  recommended_evidence: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ComplianceObligation {
  id: string;
  company_id: string;
  template_id: string | null;
  domain: ComplianceDomain;
  title: string;
  description: string | null;
  legal_reference: string | null;
  responsible_user_id: string | null;
  responsible_role_id: string | null;
  due_date: string | null;
  period_label: string | null;
  recurrence: string | null;
  status: ComplianceStatus;
  priority: CompliancePriority;
  progress: number;
  source_module: string | null;
  source_record_id: string | null;
  requires_evidence: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceEvidence {
  id: string;
  obligation_id: string;
  company_id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  file_name: string | null;
  evidence_date: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface ComplianceObligationInput {
  template_id?: string | null;
  domain: ComplianceDomain;
  title: string;
  description?: string | null;
  legal_reference?: string | null;
  due_date?: string | null;
  period_label?: string | null;
  recurrence?: string | null;
  status?: ComplianceStatus;
  priority?: CompliancePriority;
  progress?: number;
  requires_evidence?: boolean;
  notes?: string | null;
}

export interface ComplianceEvidenceInput {
  obligation_id: string;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  evidence_date?: string;
}

export function useComplianceTemplates() {
  return useQuery({
    queryKey: ['compliance-templates'],
    queryFn: async () => {
      const { data, error } = await db
        .from('compliance_obligation_templates')
        .select('*')
        .eq('is_active', true)
        .order('domain')
        .order('title');

      if (error) throw error;
      return (data || []) as ComplianceTemplate[];
    },
  });
}

export function useComplianceObligations(domain?: ComplianceDomain | 'all') {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['compliance-obligations', currentCompanyId, domain || 'all'],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      let query = db
        .from('compliance_obligations')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('priority', { ascending: false });

      if (domain && domain !== 'all') {
        query = query.eq('domain', domain);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as ComplianceObligation[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useComplianceEvidences(obligationIds: string[]) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['compliance-evidences', currentCompanyId, obligationIds],
    queryFn: async () => {
      if (!currentCompanyId || obligationIds.length === 0) return [];

      const { data, error } = await db
        .from('compliance_evidences')
        .select('*')
        .eq('company_id', currentCompanyId)
        .in('obligation_id', obligationIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ComplianceEvidence[];
    },
    enabled: !!currentCompanyId && obligationIds.length > 0,
  });
}

export function useCreateComplianceObligation() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: ComplianceObligationInput) => {
      if (!currentCompanyId) throw new Error('No hay empresa activa.');

      const { data, error } = await db
        .from('compliance_obligations')
        .insert({
          ...input,
          company_id: currentCompanyId,
          created_by: user?.id,
          status: input.status || 'pendiente',
          priority: input.priority || 'media',
          progress: input.progress ?? 0,
          requires_evidence: input.requires_evidence ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-obligations'] });
      toast.success('Obligacion creada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo crear la obligacion'),
  });
}

export function useUpdateComplianceObligation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<ComplianceObligationInput> & { id: string }) => {
      const normalizedChanges: Record<string, unknown> = { ...changes };
      if (changes.status === 'cumplido') {
        normalizedChanges.completed_at = new Date().toISOString();
        normalizedChanges.completed_by = user?.id;
        normalizedChanges.progress = changes.progress ?? 100;
      }

      const { data, error } = await db
        .from('compliance_obligations')
        .update(normalizedChanges)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceObligation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-obligations'] });
      toast.success('Obligacion actualizada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo actualizar la obligacion'),
  });
}

export function useDeleteComplianceObligation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('compliance_obligations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-obligations'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-evidences'] });
      toast.success('Obligacion eliminada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo eliminar la obligacion'),
  });
}

export function useCreateComplianceEvidence() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: ComplianceEvidenceInput) => {
      if (!currentCompanyId) throw new Error('No hay empresa activa.');

      const { data, error } = await db
        .from('compliance_evidences')
        .insert({
          ...input,
          company_id: currentCompanyId,
          uploaded_by: user?.id,
          evidence_date: input.evidence_date || todayDateOnlyString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as ComplianceEvidence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-evidences'] });
      toast.success('Evidencia registrada');
    },
    onError: (error: any) => toast.error(error.message || 'No se pudo registrar la evidencia'),
  });
}
