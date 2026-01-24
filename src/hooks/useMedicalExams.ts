import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type MedicalExam = Database['public']['Tables']['medical_exams']['Row'];
type MedicalExamInsert = Database['public']['Tables']['medical_exams']['Insert'];

export function useMedicalExams() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['medical_exams', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medical_exams')
        .select(`
          *,
          employees!inner(
            id, first_name, last_name, document_number, company_id,
            operation_centers(id, name)
          )
        `)
        .eq('employees.company_id', currentCompanyId!)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useMedicalExam(id: string | undefined) {
  return useQuery({
    queryKey: ['medical_exam', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('medical_exams')
        .select(`
          *,
          employees(id, first_name, last_name, document_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMedicalExam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (exam: Omit<MedicalExamInsert, 'created_by'>) => {
      const { data, error } = await supabase
        .from('medical_exams')
        .insert({ ...exam, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
    },
  });
}

export function useUpdateMedicalExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MedicalExam> & { id: string }) => {
      const { data, error } = await supabase
        .from('medical_exams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exam', data.id] });
    },
  });
}

export function useDeleteMedicalExam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medical_exams')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
    },
  });
}

// Helper function to calculate exam status
export function getExamStatus(exam: { exam_type: string; expiration_date: string | null }) {
  if (!exam.expiration_date || exam.exam_type === 'egreso') return 'no_aplica';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expirationDate = new Date(exam.expiration_date);
  expirationDate.setHours(0, 0, 0, 0);

  const diffTime = expirationDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'vencido';
  if (diffDays <= 30) return 'por_vencer';
  return 'vigente';
}

export function getDaysRemaining(expirationDate: string | null): number | null {
  if (!expirationDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getAlertLevel(daysRemaining: number): 'info' | 'warning' | 'critical' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 15) return 'warning';
  return 'info';
}
