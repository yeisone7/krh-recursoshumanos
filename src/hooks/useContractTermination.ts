import { toDateOnlyString } from '@/lib/dateOnly';
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
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ employeeId, examDate }: { employeeId: string; examDate: Date }) => {
      const { data, error } = await supabase
        .from('medical_exams')
        .insert({
          employee_id: employeeId,
          exam_type: 'egreso',
          exam_date: toDateOnlyString(examDate),
          result: 'pendiente',
          concept: 'Examen de egreso generado automáticamente por terminación de contrato',
          provider: 'Por definir',
          doctor_name: 'Por definir',
          created_by: user?.id,
          company_id: currentCompanyId!,
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
          termination_date: toDateOnlyString(terminationDate),
          termination_reason: terminationReason,
        })
        .eq('id', contractId)
        .select('*, employees(id, first_name, last_name)')
        .single();

      if (error) throw error;

      // Step 4: Update employee status to 'retired' (Retirado)
      const employeeData = data.employees as any;
      if (employeeData?.id) {
        const { error: employeeUpdateError } = await supabase
          .from('employees')
          .update({ status: 'retired' })
          .eq('id', employeeData.id);

        if (employeeUpdateError) {
          console.error('Error updating employee status:', employeeUpdateError);
          toast.warning('Advertencia', {
            description: 'El contrato fue terminado pero no se pudo actualizar el estado del empleado a Retirado.',
          });
        } else {
          toast.info('Estado actualizado', {
            description: 'El empleado ha sido marcado como Retirado.',
          });
        }
      }

      // Step 5: Log audit event
      if (user) {
        const employeeName = employeeData 
          ? `${employeeData.first_name} ${employeeData.last_name}`
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
            termination_date: toDateOnlyString(terminationDate),
            termination_reason: terminationReason,
            exit_exam_id: exitExamId,
            exit_exam_auto_created: !hasExitExam && autoCreateExitExam,
            employee_status_changed_to: 'retired',
          },
          user_agent: navigator.userAgent,
        });
      }

      return {
        contract: data,
        exitExamId,
        exitExamAutoCreated: !hasExitExam && autoCreateExitExam,
        employeeRetired: true,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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
