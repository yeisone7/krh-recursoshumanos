import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type ContractType = Database['public']['Enums']['contract_type'];
type LinkType = Database['public']['Enums']['link_type'];
type GenderType = Database['public']['Enums']['gender_type'];
type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];
type SelectionStepInsert = Database['public']['Tables']['selection_steps']['Insert'];

function normalizeCandidateGenderToEmployeeGender(gender: string | null | undefined): GenderType | null {
  if (!gender) return null;

  const value = gender.trim().toLowerCase();

  if (['m', 'masculino', 'hombre', 'male'].includes(value)) return 'M';
  if (['f', 'femenino', 'mujer', 'female'].includes(value)) return 'F';
  if (['o', 'otro', 'other', 'no_binario', 'no binario', 'non-binary', 'non binary'].includes(value)) return 'O';

  return null;
}

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
          vacancies(id, position_title, operation_center_id, operation_centers(name)),
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

// Helper: check if candidate completed all selection stages satisfactorily
const ALL_SELECTION_STEPS = [
  'prefiltro', 'entrevista_seleccion', 'entrevista_jefe',
  'validacion_antecedentes', 'pruebas_psicotecnicas', 'pruebas_conocimiento',
  'validacion_academica', 'validacion_referencias', 'examenes_medicos',
];

async function checkAllStagesCompleted(candidateId: string, currentCompanyId: string | null) {
  if (!currentCompanyId) return;

  const { data: steps } = await supabase
    .from('selection_steps')
    .select('step_type, status')
    .eq('candidate_id', candidateId);

  if (!steps || steps.length === 0) return;

  const stepMap: Record<string, string> = {};
  for (const s of steps) {
    stepMap[s.step_type] = s.status;
  }

  const allDone = ALL_SELECTION_STEPS.every(
    st => stepMap[st] === 'passed' || stepMap[st] === 'not_applicable'
  );

  if (!allDone) return;

  // Get candidate info
  const { data: candidate } = await supabase
    .from('candidates')
    .select('first_name, last_name, vacancy_id, vacancies(position_title)')
    .eq('id', candidateId)
    .single();

  if (!candidate) return;

  const vacancy = candidate.vacancies as any;
  const candidateName = `${candidate.first_name} ${candidate.last_name}`;

  // Get configured role for hiring notifications
  const { data: configData } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('company_id', currentCompanyId)
    .eq('config_key', 'hiring_notification_role')
    .maybeSingle();

  const roleId = (configData?.config_value as any)?.role_id;
  if (!roleId) return;

  const { data: roleUsers } = await supabase
    .from('user_custom_roles')
    .select('user_id')
    .eq('role_id', roleId);

  if (!roleUsers || roleUsers.length === 0) return;

  const notifs = roleUsers.map(ru => ({
    user_id: ru.user_id,
    company_id: currentCompanyId,
    title: '✅ Candidato listo para contratación',
    message: `${candidateName} ha completado todas las etapas de selección satisfactoriamente para el cargo ${vacancy?.position_title || 'N/A'}. Proceda con la contratación.`,
    type: 'success' as const,
    category: 'selection',
    entity_type: 'candidate',
    entity_id: candidateId,
    action_url: `/seleccion?vacancy=${candidate.vacancy_id}`,
  }));

  await supabase.from('notifications').insert(notifs);
}

// Selection Steps
export function useCreateSelectionStep() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

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

      // Check if all stages are now completed
      try {
        await checkAllStagesCompleted(data.candidate_id, currentCompanyId);
      } catch (err) {
        console.error('Error checking stage completion:', err);
      }

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
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SelectionStep> & { id: string }) => {
      const { data, error } = await supabase
        .from('selection_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Check if all stages are now completed
      try {
        await checkAllStagesCompleted(data.candidate_id, currentCompanyId);
      } catch (err) {
        console.error('Error checking stage completion:', err);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', data.candidate_id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

// Convert candidate to employee with automatic contract and entry medical exam
export interface ConvertToEmployeeParams {
  candidateId: string;
  operationCenterId?: string;
  // Contract data
  contractType?: ContractType;
  startDate?: string;
  endDate?: string;
  salary?: number;
  transportAllowance?: number;
  trialPeriodDays?: number;
  // Entry exam data
  createEntryExam?: boolean;
}

export function useConvertToEmployee() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      candidateId,
      operationCenterId,
      contractType,
      startDate,
      endDate,
      salary,
      transportAllowance,
      trialPeriodDays,
      createEntryExam = true,
    }: ConvertToEmployeeParams) => {
      // Get candidate data with full vacancy info
      const { data: candidate, error: fetchError } = await supabase
        .from('candidates')
        .select(`
          *,
          vacancies(
            id,
            operation_center_id,
            position_id,
            position_title,
            department_area,
            shift_type,
            vacancy_type,
            salary_range_min,
            salary_range_max,
            includes_transport
          )
        `)
        .eq('id', candidateId)
        .single();

      if (fetchError) throw fetchError;

      const vacancy = candidate.vacancies as any;
      const hireDate = startDate || new Date().toISOString().split('T')[0];

      // Step 1: Create employee in new normalized model (employees_v2)
      const employeePayload: any = {
        company_id: currentCompanyId!,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        document_type: candidate.document_type,
        document_number: candidate.document_number,
        birth_date: candidate.birth_date,
        gender: normalizeCandidateGenderToEmployeeGender(candidate.gender),
        gender_identity: candidate.gender_identity,
        gender_identity_other: candidate.gender_identity_other,
        marital_status: candidate.marital_status,
        blood_type: candidate.blood_type,
        document_issue_date: candidate.document_issue_date,
        document_issue_city: candidate.document_issue_city,
        is_first_job: candidate.is_first_job ?? false,
        is_head_of_household: candidate.is_head_of_household ?? false,
        disability_type: candidate.disability_type,
        ethnic_group: candidate.ethnic_group,
        is_conflict_victim: candidate.is_conflict_victim ?? false,
        is_demobilized: candidate.is_demobilized ?? false,
        is_active: true,
        created_by: user?.id,
      };

      let employee: Database['public']['Tables']['employees_v2']['Row'];

      const { data: createdEmployee, error: createError } = await supabase
        .from('employees_v2')
        .insert(employeePayload)
        .select()
        .single();

      if (createError) {
        if (createError.code !== '23505') throw createError;

        const { data: existingEmployee, error: existingEmployeeError } = await supabase
          .from('employees_v2')
          .select('*')
          .eq('company_id', currentCompanyId!)
          .eq('document_type', candidate.document_type)
          .eq('document_number', candidate.document_number)
          .maybeSingle();

        if (existingEmployeeError || !existingEmployee) throw createError;
        employee = existingEmployee;
      } else {
        employee = createdEmployee;
      }

      // Step 1b: Create contact record
      await supabase.from('employee_contact').insert({
        employee_id: employee.id,
        email: candidate.email,
        phone: candidate.phone,
        mobile: candidate.mobile,
        residence_address: candidate.address,
        residence_city: candidate.city,
        residence_department: candidate.department,
        residence_neighborhood: candidate.neighborhood,
        emergency_contact_name: candidate.emergency_contact_name,
        emergency_contact_phone: candidate.emergency_contact_phone,
        emergency_contact_relationship: candidate.emergency_contact_relationship,
        is_current: true,
      });

      // Step 1b2: Copy family members from candidate to employee
      try {
        const { data: candidateFamilyMembers } = await supabase
          .from('candidate_family_members' as any)
          .select('*')
          .eq('candidate_id', candidateId);

        if (candidateFamilyMembers && candidateFamilyMembers.length > 0) {
          const employeeFamilyInserts = (candidateFamilyMembers as any[]).map((m: any) => ({
            employee_id: employee.id,
            relationship: m.relationship,
            full_name: m.full_name,
            age: m.age,
            gender: m.gender,
            observations: m.observations,
          }));
          await supabase.from('employee_family_members').insert(employeeFamilyInserts);
        }
      } catch (err) {
        console.error('Error copying family members:', err);
      }

      // Step 1c: Create work info record
      const centerId = operationCenterId || vacancy?.operation_center_id;
      const linkTypeMap: Record<string, LinkType> = {
        'indefinido': 'indefinido',
        'fijo': 'fijo',
        'obra_labor': 'obra_labor',
        'aprendizaje': 'aprendizaje',
        'servicios': 'servicios',
      };
      
      await supabase.from('employee_work_info').insert({
        employee_id: employee.id,
        company_id: currentCompanyId!,
        operation_center_id: centerId,
        position_name: vacancy?.position_title || 'Por definir',
        hire_date: hireDate,
        link_type: linkTypeMap[contractType || 'indefinido'] || 'indefinido',
        is_current: true,
      });

      // Step 2: Create contract using vacancy data or provided values
      const contractSalary = salary || candidate.salary_expectation || vacancy?.salary_range_min || 0;
      const contractTransport = transportAllowance !== undefined
        ? transportAllowance
        : (vacancy?.includes_transport ? 200000 : 0); // Default Colombian transport allowance

      const contractData: any = {
        employee_id: employee.id,
        contract_type: contractType || 'indefinido',
        start_date: hireDate,
        salary: contractSalary,
        transport_allowance: contractTransport,
        trial_period_days: trialPeriodDays ?? 60,
        created_by: user?.id,
      };

      // Add end_date only for fixed-term contracts
      if (contractType && contractType !== 'indefinido' && endDate) {
        contractData.end_date = endDate;
      }

      // Calculate trial_end_date
      if (contractData.trial_period_days > 0) {
        const trialEnd = new Date(hireDate);
        trialEnd.setDate(trialEnd.getDate() + contractData.trial_period_days);
        contractData.trial_end_date = trialEnd.toISOString().split('T')[0];
      }

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert(contractData)
        .select()
        .single();

      if (contractError) throw contractError;

      // Step 3: Create entry medical exam (required by Colombian law)
      let entryExam = null;
      if (createEntryExam) {
        const { data: exam, error: examError } = await supabase
          .from('medical_exams')
          .insert({
            employee_id: employee.id,
            exam_type: 'ingreso',
            exam_date: hireDate,
            result: 'pendiente',
            concept: 'Examen de ingreso - Generado automáticamente al contratar',
            provider: 'Por definir',
            doctor_name: 'Por definir',
            created_by: user?.id,
          })
          .select()
          .single();

        if (examError) {
          console.error('Error creating entry exam:', examError);
          toast.warning('Examen de ingreso', {
            description: 'No se pudo crear el examen de ingreso automáticamente. Créelo manualmente.',
          });
        } else {
          entryExam = exam;
          toast.success('Examen de ingreso creado', {
            description: 'Se generó un examen de ingreso pendiente para el nuevo empleado.',
          });
        }
      }

      // Step 4: Update candidate status and link to employee
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          status: 'hired',
          is_selected: true,
          employee_id: employee.id,
        })
        .eq('id', candidateId);

      if (updateError) throw updateError;

      // Step 5: Log audit event
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          user_email: user.email,
          company_id: currentCompanyId,
          action: 'convert_candidate_to_employee',
          entity_type: 'employee',
          entity_id: employee.id,
          entity_name: `${employee.first_name} ${employee.last_name}`,
          new_values: {
            candidate_id: candidateId,
            vacancy_id: vacancy?.id,
            contract_id: contract.id,
            entry_exam_id: entryExam?.id,
            contract_type: contractData.contract_type,
            salary: contractSalary,
          },
          user_agent: navigator.userAgent,
        });
      }

      // Step 6: Send notifications to users with the configured role
      try {
        // Get the configured role for hiring notifications
        const { data: configData } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('company_id', currentCompanyId!)
          .eq('config_key', 'hiring_notification_role')
          .maybeSingle();

        const roleId = (configData?.config_value as any)?.role_id;
        if (roleId) {
          // Get all users with that role
          const { data: roleUsers } = await supabase
            .from('user_custom_roles')
            .select('user_id')
            .eq('role_id', roleId);

          if (roleUsers && roleUsers.length > 0) {
            const notifs = roleUsers.map(ru => ({
              user_id: ru.user_id,
              company_id: currentCompanyId,
              title: '🎉 Nuevo empleado contratado',
              message: `${employee.first_name} ${employee.last_name} ha sido contratado como ${vacancy?.position_title || 'nuevo empleado'}.`,
              type: 'success' as const,
              category: 'hiring',
              entity_type: 'employee',
              entity_id: employee.id,
              action_url: `/empleados?detail=${employee.id}`,
            }));
            await supabase.from('notifications').insert(notifs);
          }
        }
      } catch (err) {
        console.error('Error sending hiring notifications:', err);
      }

      // Step 7: Create onboarding tasks (use position template if available)
      try {
        const { PREDEFINED_TASKS } = await import('@/hooks/useOnboardingTasks');
        const { fetchPositionTemplates } = await import('@/hooks/useOnboardingTemplates');
        
        let taskSource: any[] | null = null;
        const posId = vacancy?.position_id;
        if (posId) {
          taskSource = await fetchPositionTemplates(currentCompanyId!, posId);
        }
        
        const tasks = (taskSource || PREDEFINED_TASKS).map(t => ({
          task_key: t.task_key,
          task_label: t.task_label,
          task_description: t.task_description,
          sort_order: t.sort_order,
          employee_id: employee.id,
          company_id: currentCompanyId!,
        }));
        await supabase.from('employee_onboarding_tasks').insert(tasks);
      } catch (err) {
        console.error('Error creating onboarding tasks:', err);
      }

      return {
        employee,
        contract,
        entryExam,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
    },
  });
}
