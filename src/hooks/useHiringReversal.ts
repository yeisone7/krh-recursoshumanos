import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface HiringReversalPreview {
  employee_id: string;
  candidate_name: string;
  document_number: string;
  position_title: string;
  review_token: string;
  documents_to_preserve: number;
  contract_numbers: string[];
  vacancy_status_after: string;
}

export function useHiringReversalPreview(candidateId: string, enabled: boolean) {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['hiring-reversal-preview', currentCompanyId, candidateId],
    enabled: enabled && !!currentCompanyId,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('preview_candidate_hiring_reversal', {
        p_candidate_id: candidateId, p_company_id: currentCompanyId!,
      });
      if (error) throw error;
      return data as unknown as HiringReversalPreview;
    },
  });
}

export function useRevertCandidateHiring() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { candidateId: string; preview: HiringReversalPreview; reason: string; documentNumber: string }) => {
      if (!currentCompanyId) throw new Error('No hay una empresa activa.');
      const { data, error } = await supabase.rpc('revert_candidate_hiring', {
        p_candidate_id: input.candidateId, p_company_id: currentCompanyId,
        p_employee_id: input.preview.employee_id, p_review_token: input.preview.review_token,
        p_reason: input.reason.trim(), p_document_number: input.documentNumber.trim(),
      });
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      [
        'candidate', 'candidates', 'candidate_documents', 'hiring-reversal-history', 'hiring-reversal-preview',
        'vacancy', 'vacancies', 'open_vacancies', 'requisitions', 'requisition', 'requisition-vacancies',
        'approved-requisitions', 'employees', 'employee_v2', 'employees_v2', 'employees_v2_paginated',
        'employees_v2_infinite', 'contracts', 'medical_exams', 'employee_documents',
        'employee-employment-cycles', 'employee-candidate-history', 'onboarding-tasks', 'audit-logs',
      ].forEach(key => { void queryClient.invalidateQueries({ queryKey: [key] }); });
    },
  });
}

export function useHiringReversalHistory(candidateId: string) {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['hiring-reversal-history', currentCompanyId, candidateId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from('candidate_hiring_reversals')
        .select('id, reason, performed_by_name, created_at, documents_preserved, contract_numbers')
        .eq('candidate_id', candidateId).eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
