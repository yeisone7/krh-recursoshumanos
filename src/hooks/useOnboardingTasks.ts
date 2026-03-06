import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PREDEFINED_TASKS = [
  { task_key: 'documentos_personales', task_label: 'Documentos personales', task_description: 'Cédula, RUT, fotos y documentos básicos recopilados', sort_order: 1 },
  { task_key: 'examen_ingreso', task_label: 'Examen médico de ingreso', task_description: 'Examen ocupacional de ingreso realizado y con concepto apto', sort_order: 2 },
  { task_key: 'contrato_firmado', task_label: 'Contrato firmado', task_description: 'Contrato laboral revisado y firmado por ambas partes', sort_order: 3 },
  { task_key: 'afiliaciones_ss', task_label: 'Afiliaciones a seguridad social', task_description: 'EPS, AFP, ARL y caja de compensación registradas', sort_order: 4 },
  { task_key: 'cuenta_bancaria', task_label: 'Cuenta bancaria registrada', task_description: 'Datos bancarios para pago de nómina configurados', sort_order: 5 },
  { task_key: 'induccion', task_label: 'Inducción realizada', task_description: 'Inducción corporativa y al puesto de trabajo completada', sort_order: 6 },
  { task_key: 'dotacion_entregada', task_label: 'Dotación entregada', task_description: 'Elementos de dotación y EPP entregados según profesiograma', sort_order: 7 },
  { task_key: 'accesos_herramientas', task_label: 'Accesos y herramientas', task_description: 'Credenciales, correo, herramientas y accesos configurados', sort_order: 8 },
];

export function useOnboardingTasks(employeeId: string | null) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['onboarding-tasks', employeeId],
    enabled: !!employeeId && !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_onboarding_tasks')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOnboardingTasks() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const tasks = PREDEFINED_TASKS.map(t => ({
        ...t,
        employee_id: employeeId,
        company_id: currentCompanyId!,
      }));

      const { error } = await supabase
        .from('employee_onboarding_tasks')
        .insert(tasks);
      if (error) throw error;
    },
    onSuccess: (_, employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', employeeId] });
    },
  });
}

export function useToggleOnboardingTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, isCompleted, employeeId }: { taskId: string; isCompleted: boolean; employeeId: string }) => {
      const { error } = await supabase
        .from('employee_onboarding_tasks')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          completed_by: isCompleted ? user?.id : null,
        })
        .eq('id', taskId);
      if (error) throw error;
      return employeeId;
    },
    onSuccess: (employeeId) => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', employeeId] });
    },
  });
}

export function useOnboardingProgress(employeeId: string | null) {
  const { data: tasks } = useOnboardingTasks(employeeId);
  if (!tasks || tasks.length === 0) return null;
  const completed = tasks.filter(t => t.is_completed).length;
  return { completed, total: tasks.length, percentage: Math.round((completed / tasks.length) * 100) };
}

export { PREDEFINED_TASKS };
