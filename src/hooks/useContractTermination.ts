import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface TerminationData {
  contractId: string;
  employeeId: string;
  terminationDate: Date;
  terminationReason: string;
}

interface ExitExamValidation {
  hasExitExam: boolean;
  exitExam: {
    id: string;
    result: string;
    exam_date: string;
  } | null;
  requiresExam: boolean;
}

/**
 * Hook to check if an exit exam exists for an employee
 */
export function useValidateExitExam() {
  return async (employeeId: string): Promise<ExitExamValidation> => {
    const { data: exitExams, error } = await supabase
      .from('medical_exams')
      .select('id, result, exam_date')
      .eq('employee_id', employeeId)
      .eq('exam_type', 'egreso')
      .order('exam_date', { ascending: false })
      .limit(1);

    if (error) throw error;

    const hasExitExam = exitExams && exitExams.length > 0;
    const exitExam = hasExitExam ? exitExams[0] : null;

    return {
      hasExitExam,
      exitExam,
      requiresExam: !hasExitExam,
    };
  };
}

/**
 * Hook to create a pending exit exam for an employee
 */
export function useCreateExitExam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ employeeId, examDate }: { employeeId: string; examDate: Date }) => {
      const { data, error } = await supabase
        .from('medical_exams')
        .insert({
          employee_id: employeeId,
          exam_type: 'egreso',
          exam_date: examDate.toISOString().split('T')[0],
          result: 'pendiente',
          concept: 'Examen de egreso generado automáticamente por terminación de contrato',
          provider: 'Por definir',
          doctor_name: 'Por definir',
          created_by: user?.id,
        })
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

/**
 * Hook to terminate a contract with exit exam validation and auto-generation
 */
export function useTerminateContract() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();
  const createExitExam = useCreateExitExam();

  return useMutation({
    mutationFn: async ({ 
      contractId, 
      employeeId, 
      terminationDate, 
      terminationReason,
      autoCreateExitExam = true,
    }: TerminationData & { autoCreateExitExam?: boolean }) => {
      // Step 1: Check if exit exam exists
      const { data: exitExams, error: examError } = await supabase
        .from('medical_exams')
        .select('id, result, exam_date')
        .eq('employee_id', employeeId)
        .eq('exam_type', 'egreso')
        .order('exam_date', { ascending: false })
        .limit(1);

      if (examError) throw examError;

      const hasExitExam = exitExams && exitExams.length > 0;
      let exitExamId: string | null = hasExitExam ? exitExams[0].id : null;

      // Step 2: If no exit exam and autoCreate is true, create one
      if (!hasExitExam && autoCreateExitExam) {
        const newExam = await createExitExam.mutateAsync({
          employeeId,
          examDate: terminationDate,
        });
        exitExamId = newExam.id;
        
        toast.info('Examen de egreso creado', {
          description: 'Se ha generado automáticamente un examen de egreso pendiente.',
        });
      }

      // Step 3: Terminate the contract
      const { data, error } = await supabase
        .from('contracts')
        .update({
          is_terminated: true,
          termination_date: terminationDate.toISOString().split('T')[0],
          termination_reason: terminationReason,
        })
        .eq('id', contractId)
        .select('*, employees(first_name, last_name)')
        .single();

      if (error) throw error;

      // Step 4: Log audit event
      if (user) {
        const employeeName = data.employees 
          ? `${(data.employees as any).first_name} ${(data.employees as any).last_name}`
          : 'Empleado';
        
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          company_id: currentCompanyId,
          action: 'terminate_contract',
          entity_type: 'contract',
          entity_id: data.id,
          entity_name: `Contrato - ${employeeName}`,
          new_values: { 
            termination_date: terminationDate.toISOString().split('T')[0],
            termination_reason: terminationReason,
            exit_exam_id: exitExamId,
            exit_exam_auto_created: !hasExitExam && autoCreateExitExam,
          },
          user_agent: navigator.userAgent,
        });
      }

      return {
        contract: data,
        exitExamId,
        exitExamAutoCreated: !hasExitExam && autoCreateExitExam,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
    },
  });
}

/**
 * Hook to check exit exam status before allowing contract termination
 */
export function useCheckExitExamStatus(employeeId: string | undefined) {
  return {
    check: async (): Promise<ExitExamValidation | null> => {
      if (!employeeId) return null;

      const { data: exitExams, error } = await supabase
        .from('medical_exams')
        .select('id, result, exam_date')
        .eq('employee_id', employeeId)
        .eq('exam_type', 'egreso')
        .order('exam_date', { ascending: false })
        .limit(1);

      if (error) throw error;

      const hasExitExam = exitExams && exitExams.length > 0;
      
      return {
        hasExitExam,
        exitExam: hasExitExam ? exitExams[0] : null,
        requiresExam: !hasExitExam,
      };
    },
  };
}
