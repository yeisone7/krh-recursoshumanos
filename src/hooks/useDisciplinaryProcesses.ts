import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  DisciplinaryProcess,
  DisciplinaryProcessWithEmployee,
  DisciplinaryEvidence,
  DisciplinaryTimeline,
  DisciplinaryDefense,
  DisciplinaryFormData,
  EvidenceFormData,
  DefenseFormData,
  DisciplinaryStatus,
  SanctionType,
} from '@/types/disciplinary';

// ============================================
// MAIN QUERIES
// ============================================

export function useDisciplinaryProcesses() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['disciplinary_processes', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disciplinary_processes')
        .select(`
          *,
          employee:employees_v2(
            id, first_name, last_name, document_number,
            employee_work_info(operation_center_id, is_current, operation_centers(id, name))
          )
        `)
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map operation center name from nested join
      return (data as any[]).map((p) => {
        const workInfo = p.employee?.employee_work_info?.find((w: any) => w.is_current);
        return {
          ...p,
          operation_center_name: workInfo?.operation_centers?.name || null,
        };
      }) as DisciplinaryProcessWithEmployee[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useDisciplinaryProcess(id: string | null) {
  return useQuery({
    queryKey: ['disciplinary_process', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disciplinary_processes')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;

      // Fetch related data
      const [evidenceRes, timelineRes, defensesRes] = await Promise.all([
        supabase
          .from('disciplinary_evidence')
          .select('*')
          .eq('process_id', id!)
          .order('collected_date', { ascending: false }),
        supabase
          .from('disciplinary_timeline')
          .select('*')
          .eq('process_id', id!)
          .order('action_date', { ascending: false }),
        supabase
          .from('disciplinary_defenses')
          .select('*')
          .eq('process_id', id!)
          .order('defense_date', { ascending: false }),
      ]);

      return {
        ...data,
        evidence: evidenceRes.data || [],
        timeline: timelineRes.data || [],
        defenses: defensesRes.data || [],
      } as DisciplinaryProcessWithEmployee;
    },
    enabled: !!id,
  });
}

export function useDisciplinaryStats() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['disciplinary_stats', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disciplinary_processes')
        .select('status, fault_type')
        .eq('company_id', currentCompanyId!);

      if (error) throw error;

      const stats = {
        total: data.length,
        active: data.filter(p => p.status !== 'cerrado').length,
        closed: data.filter(p => p.status === 'cerrado').length,
        byFault: {
          leve: data.filter(p => p.fault_type === 'leve').length,
          grave: data.filter(p => p.fault_type === 'grave').length,
          gravisima: data.filter(p => p.fault_type === 'gravisima').length,
        },
        byStatus: data.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      return stats;
    },
    enabled: !!currentCompanyId,
  });
}

// ============================================
// MUTATIONS
// ============================================

export function useCreateDisciplinaryProcess() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (formData: DisciplinaryFormData) => {
      // Generate case number
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('disciplinary_processes')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId!)
        .gte('created_at', `${year}-01-01`);

      const caseNumber = `PD-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

      const insertData = {
        company_id: currentCompanyId,
        employee_id: formData.employee_id,
        case_number: caseNumber,
        fault_type: formData.fault_type,
        fault_date: format(formData.fault_date, 'yyyy-MM-dd'),
        facts_description: formData.facts_description,
        article_violated: formData.article_violated || null,
        witnesses: formData.witnesses || null,
        investigator_name: formData.investigator_name || null,
        observations: formData.observations || null,
        created_by: user?.id,
      };

      const { data, error } = await supabase
        .from('disciplinary_processes')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Create initial timeline entry
      await supabase.from('disciplinary_timeline').insert({
        company_id: currentCompanyId!,
        process_id: data.id,
        action_type: 'apertura',
        description: 'Apertura del proceso disciplinario',
        new_status: 'apertura',
        performed_by: user?.id,
        performed_by_name: user?.email,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_stats'] });
      toast({
        title: 'Proceso creado',
        description: 'El proceso disciplinario ha sido registrado exitosamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateDisciplinaryProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<DisciplinaryProcess>;
    }) => {
      const { error } = await supabase
        .from('disciplinary_processes')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_stats'] });
    },
  });
}

export function useAdvanceStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      processId,
      currentStatus,
      newStatus,
      notes,
    }: {
      processId: string;
      currentStatus: DisciplinaryStatus;
      newStatus: DisciplinaryStatus;
      notes?: string;
    }) => {
      // Update process status
      const updateData: Partial<DisciplinaryProcess> = { status: newStatus };

      // Set relevant dates based on new status
      const today = format(new Date(), 'yyyy-MM-dd');
      if (newStatus === 'citacion_descargos') {
        updateData.notification_date = today;
      } else if (newStatus === 'cerrado') {
        updateData.closing_date = today;
      }

      const { error: updateError } = await supabase
        .from('disciplinary_processes')
        .update(updateData)
        .eq('id', processId);

      if (updateError) throw updateError;

      // Create timeline entry
      const { error: timelineError } = await supabase
        .from('disciplinary_timeline')
        .insert({
          company_id: currentCompanyId!,
          process_id: processId,
          action_type: newStatus,
          description: notes || `Cambio de estado a: ${newStatus}`,
          previous_status: currentStatus,
          new_status: newStatus,
          performed_by: user?.id,
          performed_by_name: user?.email,
        });

      if (timelineError) throw timelineError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_stats'] });
      toast({
        title: 'Estado actualizado',
        description: 'El proceso ha avanzado al siguiente estado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useSetDecision() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      processId,
      sanctionType,
      sanctionDays,
      sanctionStartDate,
      sanctionEndDate,
      decisionSummary,
    }: {
      processId: string;
      sanctionType: SanctionType;
      sanctionDays?: number;
      sanctionStartDate?: string;
      sanctionEndDate?: string;
      decisionSummary: string;
    }) => {
      const updateData = {
        status: 'decision' as DisciplinaryStatus,
        sanction_type: sanctionType,
        sanction_days: sanctionDays || 0,
        sanction_start_date: sanctionStartDate || null,
        sanction_end_date: sanctionEndDate || null,
        decision_summary: decisionSummary,
        decision_date: format(new Date(), 'yyyy-MM-dd'),
        decision_maker_id: user?.id,
        decision_maker_name: user?.email,
      };

      const { error: updateError } = await supabase
        .from('disciplinary_processes')
        .update(updateData)
        .eq('id', processId);

      if (updateError) throw updateError;

      // Create timeline entry
      await supabase.from('disciplinary_timeline').insert({
        company_id: currentCompanyId!,
        process_id: processId,
        action_type: 'decision',
        description: `Decisión: ${sanctionType}. ${decisionSummary}`,
        previous_status: 'analisis',
        new_status: 'decision',
        performed_by: user?.id,
        performed_by_name: user?.email,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', variables.processId] });
      toast({
        title: 'Decisión registrada',
        description: 'La decisión del proceso ha sido registrada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// EVIDENCE MUTATIONS
// ============================================

export function useAddEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      processId,
      data,
      fileUrl,
      fileName,
    }: {
      processId: string;
      data: EvidenceFormData;
      fileUrl?: string;
      fileName?: string;
    }) => {
      const insertData = {
        company_id: currentCompanyId!,
        process_id: processId,
        evidence_type: data.evidence_type,
        description: data.description,
        collected_date: format(data.collected_date, 'yyyy-MM-dd'),
        collected_by: data.collected_by || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
      };

      const { error } = await supabase
        .from('disciplinary_evidence')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', variables.processId] });
      toast({
        title: 'Evidencia agregada',
        description: 'La evidencia ha sido registrada en el proceso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evidenceId, processId }: { evidenceId: string; processId: string }) => {
      const { error } = await supabase
        .from('disciplinary_evidence')
        .delete()
        .eq('id', evidenceId);

      if (error) throw error;
      return processId;
    },
    onSuccess: (processId) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', processId] });
      toast({
        title: 'Evidencia eliminada',
        description: 'La evidencia ha sido eliminada del proceso.',
      });
    },
  });
}

// ============================================
// DEFENSE MUTATIONS
// ============================================

export function useRegisterAppeal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      processId,
      appealDate,
      appealResolution,
    }: {
      processId: string;
      appealDate: string;
      appealResolution: string;
    }) => {
      const updateData = {
        status: 'apelacion' as DisciplinaryStatus,
        has_appeal: true,
        appeal_date: appealDate,
        appeal_resolution: appealResolution,
      };

      const { error: updateError } = await supabase
        .from('disciplinary_processes')
        .update(updateData)
        .eq('id', processId);

      if (updateError) throw updateError;

      // Create timeline entry
      await supabase.from('disciplinary_timeline').insert({
        company_id: currentCompanyId!,
        process_id: processId,
        action_type: 'apelacion',
        description: `Apelación registrada: ${appealResolution.substring(0, 100)}...`,
        previous_status: 'decision',
        new_status: 'apelacion',
        performed_by: user?.id,
        performed_by_name: user?.email,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', variables.processId] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_stats'] });
      toast({
        title: 'Apelación registrada',
        description: 'La apelación ha sido registrada exitosamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useAddDefense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      processId,
      data,
      fileUrl,
    }: {
      processId: string;
      data: DefenseFormData;
      fileUrl?: string;
    }) => {
      const insertData = {
        process_id: processId,
        defense_date: format(data.defense_date, 'yyyy-MM-dd'),
        defense_type: data.defense_type,
        content: data.content,
        received_by: data.received_by || null,
        received_by_id: user?.id || null,
        document_url: fileUrl || null,
      };

      const { error } = await supabase
        .from('disciplinary_defenses')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_process', variables.processId] });
      toast({
        title: 'Descargos registrados',
        description: 'Los descargos del empleado han sido registrados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// DELETE PROCESS
// ============================================

export function useDeleteDisciplinaryProcess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (processId: string) => {
      // Delete related records first
      await Promise.all([
        supabase.from('disciplinary_evidence').delete().eq('process_id', processId),
        supabase.from('disciplinary_defenses').delete().eq('process_id', processId),
        supabase.from('disciplinary_timeline').delete().eq('process_id', processId),
      ]);

      const { error } = await supabase
        .from('disciplinary_processes')
        .delete()
        .eq('id', processId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary_processes'] });
      queryClient.invalidateQueries({ queryKey: ['disciplinary_stats'] });
      toast({
        title: 'Proceso eliminado',
        description: 'El proceso disciplinario ha sido eliminado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
