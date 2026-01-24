import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];
type SelectionStepInsert = Database['public']['Tables']['selection_steps']['Insert'];

export function useCandidates(vacancyId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['candidates', vacancyId, currentCompanyId],
    queryFn: async () => {
      let query = supabase
        .from('candidates')
        .select(`
          *,
          vacancies!inner(id, position_title, company_id, operation_centers(name)),
          selection_steps(*)
        `)
        .eq('vacancies.company_id', currentCompanyId!)
        .order('application_date', { ascending: false });

      if (vacancyId) {
        query = query.eq('vacancy_id', vacancyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          vacancies(id, position_title, operation_centers(name)),
          selection_steps(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (candidate: Omit<CandidateInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          ...candidate,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['vacancy', data.vacancy_id] });
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Candidate> & { id: string }) => {
      const { data, error } = await supabase
        .from('candidates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', data.id] });
      queryClient.invalidateQueries({ queryKey: ['vacancy', data.vacancy_id] });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    },
  });
}

// Selection Steps
export function useCreateSelectionStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (step: Omit<SelectionStepInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('selection_steps')
        .insert({
          ...step,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', data.candidate_id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useUpdateSelectionStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SelectionStep> & { id: string }) => {
      const { data, error } = await supabase
        .from('selection_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', data.candidate_id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

// Convert candidate to employee
export function useConvertToEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ candidateId, operationCenterId }: { candidateId: string; operationCenterId?: string }) => {
      // Get candidate data
      const { data: candidate, error: fetchError } = await supabase
        .from('candidates')
        .select('*, vacancies(operation_center_id, position_title)')
        .eq('id', candidateId)
        .single();

      if (fetchError) throw fetchError;

      // Create employee from candidate
      const { data: employee, error: createError } = await supabase
        .from('employees')
        .insert({
          company_id: currentCompanyId!,
          operation_center_id: operationCenterId || (candidate.vacancies as any)?.operation_center_id,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          document_type: candidate.document_type,
          document_number: candidate.document_number,
          email: candidate.email,
          phone: candidate.phone,
          mobile: candidate.mobile,
          address: candidate.address,
          city: candidate.city,
          department: candidate.department,
          birth_date: candidate.birth_date,
          gender: candidate.gender,
          education_level: candidate.education_level,
          profession: candidate.profession,
          position: (candidate.vacancies as any)?.position_title || 'Por definir',
          hire_date: new Date().toISOString().split('T')[0],
          status: 'active',
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Update candidate status and link to employee
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          status: 'hired',
          is_selected: true,
          employee_id: employee.id,
        })
        .eq('id', candidateId);

      if (updateError) throw updateError;

      return employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
    },
  });
}
