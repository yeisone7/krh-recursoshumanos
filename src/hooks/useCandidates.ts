import { toDateOnlyString, todayDateOnlyString } from '@/lib/dateOnly';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { employeeDocumentFolderOrder, normalizeEmployeeDocumentFolder } from '@/types/employee';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type ContractType = Database['public']['Enums']['contract_type'];
type LinkType = Database['public']['Enums']['link_type'];
type GenderType = Database['public']['Enums']['gender_type'];
type EmployeeDocumentType = Database['public']['Enums']['employee_document_type'];
type CandidateInsert = Database['public']['Tables']['candidates']['Insert'];
type SelectionStep = Database['public']['Tables']['selection_steps']['Row'];
type SelectionStepInsert = Database['public']['Tables']['selection_steps']['Insert'];

const employeeDocumentFolders = new Set<string>(employeeDocumentFolderOrder);

function normalizeCandidateDocumentType(type: unknown): EmployeeDocumentType {
  if (typeof type !== 'string') return 'proceso_seleccion';

  const normalized = normalizeEmployeeDocumentFolder(type as EmployeeDocumentType);
  return employeeDocumentFolders.has(normalized) ? normalized : 'proceso_seleccion';
}

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
          identification_types(id, name, code),
          professions(id, name),
          education_levels(id, name),
          vacancies!inner(id, position_title, company_id, operation_center_id, operation_centers(id, name)),
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
          identification_types(id, name, code),
          professions(id, name),
          education_levels(id, name),
          vacancies(id, position_title, operation_center_id, position_id, operation_centers(name)),
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
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (candidate: Omit<CandidateInsert, 'created_by' | 'company_id'>) => {
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          ...candidate,
          company_id: currentCompanyId!,
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
    mutationFn: async (
      step: Omit<SelectionStepInsert, 'created_by' | 'company_id'> & Partial<Pick<SelectionStepInsert, 'company_id'>>
    ) => {
      const companyId = step.company_id || currentCompanyId;

      if (!companyId) {
        throw new Error('No hay una compañía activa para registrar la etapa.');
      }

      const { data, error } = await supabase
        .from('selection_steps')
        .insert({
          ...step,
          company_id: companyId,
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
      const hireDate = startDate || todayDateOnlyString();
      const employeeId = crypto.randomUUID();

      // Step 1: Create employee in new normalized model (employees_v2)
      const employeePayload: any = {
        id: employeeId,
        company_id: currentCompanyId!,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        identification_type_id: candidate.identification_type_id,
        document_type: candidate.document_type || null,
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
        profession_id: (candidate as any).profession_id,
        education_level_id: (candidate as any).education_level_id,
        is_active: true,
        created_by: user?.id,
      };

      let employee: Database['public']['Tables']['employees_v2']['Row'];

      const { error: createError } = await supabase
        .from('employees_v2')
        .insert(employeePayload);

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
        employee = employeePayload as Database['public']['Tables']['employees_v2']['Row'];
      }

      // Step 1b: Create contact record
      const { error: contactError } = await supabase.from('employee_contact').insert({
        employee_id: employee.id,
        company_id: currentCompanyId!,
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
      if (contactError) throw contactError;

      // Step 1b2: Copy family members from candidate to employee
      try {
        const { data: candidateFamilyMembers } = await supabase
          .from('candidate_family_members' as any)
          .select('*')
          .eq('candidate_id', candidateId);

        if (candidateFamilyMembers && candidateFamilyMembers.length > 0) {
          const employeeFamilyInserts = (candidateFamilyMembers as any[]).map((m: any) => ({
            employee_id: employee.id,
            company_id: currentCompanyId!,
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

      // Step 1b3: Make selection documents visible in the employee document module.
      try {
        const { data: candidateDocuments, error: candidateDocsError } = await supabase
          .from('candidate_documents' as any)
          .select('*')
          .eq('candidate_id', candidateId);

        if (candidateDocsError) throw candidateDocsError;

        const sourceDocuments = ((candidateDocuments || []) as any[]).filter((doc) => doc.file_url);

        if (sourceDocuments.length > 0) {
          const fileUrls = sourceDocuments.map((doc) => doc.file_url);
          const { data: existingDocuments, error: existingDocsError } = await supabase
            .from('employee_documents')
            .select('file_url')
            .eq('employee_id', employee.id)
            .in('file_url', fileUrls);

          if (existingDocsError) throw existingDocsError;

          const existingFileUrls = new Set((existingDocuments || []).map((doc) => doc.file_url));
          const employeeDocumentInserts = sourceDocuments
            .filter((doc) => !existingFileUrls.has(doc.file_url))
            .map((doc) => ({
              employee_id: employee.id,
              company_id: doc.company_id || currentCompanyId!,
              document_type: normalizeCandidateDocumentType(doc.document_type),
              document_name: doc.document_name || doc.file_name || 'Documento de selección',
              file_url: doc.file_url,
              file_name: doc.file_name || null,
              file_size: doc.file_size || null,
              mime_type: doc.mime_type || null,
              expiry_date: doc.expiry_date || null,
              is_valid: true,
              observations: doc.observations || null,
              uploaded_by: doc.uploaded_by || user?.id || null,
            }));

          if (employeeDocumentInserts.length > 0) {
            const { error: copyDocsError } = await supabase
              .from('employee_documents')
              .insert(employeeDocumentInserts as any);

            if (copyDocsError) throw copyDocsError;
          }
        }
      } catch (err) {
        console.error('Error copying candidate documents:', err);
        toast.warning('Documentos del aspirante', {
          description: 'El empleado fue creado, pero algunos documentos de selección deberán revisarse manualmente.',
        });
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
      
      const { error: workInfoError } = await supabase.from('employee_work_info').insert({
        employee_id: employee.id,
        company_id: currentCompanyId!,
        operation_center_id: centerId,
        position_name: vacancy?.position_title || 'Por definir',
        hire_date: hireDate,
        link_type: linkTypeMap[contractType || 'indefinido'] || 'indefinido',
        is_current: true,
      });
      if (workInfoError) throw workInfoError;

      // Step 2: Create contract using vacancy data or provided values
      const contractSalary = salary || candidate.salary_expectation || vacancy?.salary_range_min || 0;
      const contractTransport = transportAllowance !== undefined
        ? transportAllowance
        : (vacancy?.includes_transport ? 200000 : 0); // Default Colombian transport allowance
      const contractId = crypto.randomUUID();

      const contractData: any = {
        id: contractId,
        employee_id: employee.id,
        company_id: currentCompanyId!,
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
        contractData.trial_end_date = toDateOnlyString(trialEnd);
      }

      const { error: contractError } = await supabase
        .from('contracts')
        .insert(contractData);

      if (contractError) throw contractError;
      const contract = contractData;

      // Step 3: Copy medical exam data from selection_steps to medical_exams
      let entryExam = null;
      if (createEntryExam) {
        // Look for approved medical exam in selection steps
        const { data: medicalStep } = await supabase
          .from('selection_steps')
          .select('*')
          .eq('candidate_id', candidateId)
          .in('step_type', ['examenes_medicos', 'medical_exam'] as any)
          .eq('status', 'passed')
          .order('completed_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const resultMapping: Record<string, "apto" | "apto_restricciones" | "no_apto" | "pendiente"> = {
          apto: 'apto',
          apto_restricciones: 'apto_restricciones',
          no_apto: 'no_apto',
          favorable: 'apto',
          aplazado: 'pendiente',
          en_tratamiento: 'pendiente',
        };
        const mappedResult = (medicalStep?.result && resultMapping[medicalStep.result]) || 'pendiente';
        const entryExamId = crypto.randomUUID();

        const examData: any = {
          id: entryExamId,
          employee_id: employee.id,
          company_id: currentCompanyId!,
          exam_type: 'ingreso',
          exam_date: medicalStep?.completed_date?.split('T')[0] || hireDate,
          result: mappedResult,
          concept: (medicalStep as any)?.medical_concept || medicalStep?.notes || 'Examen de ingreso',
          provider: (medicalStep as any)?.provider || 'Por definir',
          doctor_name: (medicalStep as any)?.doctor_name || 'Por definir',
          order_type: (medicalStep as any)?.order_type || null,
          created_by: user?.id,
        };

        const { error: examError } = await supabase
          .from('medical_exams')
          .insert(examData);

        if (examError) {
          console.error('Error creating entry exam:', examError);
          toast.warning('Examen de ingreso', {
            description: 'No se pudo crear el examen de ingreso automáticamente. Créelo manualmente.',
          });
        } else {
          entryExam = examData;
          toast.success('Examen de ingreso registrado', {
            description: 'Se transfirió el examen médico de selección al historial del empleado.',
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

      // Step 6b: Check diversity compliance for the vacancy
      try {
        const { data: goalsConfig } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('company_id', currentCompanyId!)
          .eq('config_key', 'diversity_goals')
          .maybeSingle();

        const goals = goalsConfig?.config_value as any;
        if (goals?.enabled && goals?.notify_on_close) {
          const { data: vacCandidates } = await supabase
            .from('candidates')
            .select('gender, disability_type, ethnic_group, is_first_job, is_head_of_household')
            .eq('vacancy_id', vacancy?.id || '');

          if (vacCandidates && vacCandidates.length >= 3) {
            const total = vacCandidates.length;
            const threshold = (goals.notify_threshold_pct || 80) / 100;
            const failures: string[] = [];

            const femalePct = (vacCandidates.filter((c: any) => c.gender === 'F').length / total) * 100;
            if (femalePct < goals.min_female_pct * threshold) failures.push(`Mujeres: ${femalePct.toFixed(0)}% (meta: ${goals.min_female_pct}%)`);

            const disPct = (vacCandidates.filter((c: any) => c.disability_type && c.disability_type !== 'Ninguna').length / total) * 100;
            if (disPct < goals.min_disability_pct * threshold) failures.push(`Discapacidad: ${disPct.toFixed(0)}% (meta: ${goals.min_disability_pct}%)`);

            const ethPct = (vacCandidates.filter((c: any) => c.ethnic_group && c.ethnic_group !== 'No registrado' && c.ethnic_group !== 'Ninguno').length / total) * 100;
            if (ethPct < goals.min_ethnic_pct * threshold) failures.push(`Grupo Étnico: ${ethPct.toFixed(0)}% (meta: ${goals.min_ethnic_pct}%)`);

            if (failures.length > 0) {
              // Notify admins
              const { data: sysRoles } = await supabase
                .from('custom_roles')
                .select('id')
                .eq('company_id', currentCompanyId!)
                .eq('is_system', true);

              if (sysRoles?.length) {
                const { data: admUsers } = await supabase
                  .from('user_custom_roles')
                  .select('user_id')
                  .in('role_id', sysRoles.map(r => r.id));

                if (admUsers?.length) {
                  const diversityNotifs = admUsers.map(u => ({
                    user_id: u.user_id,
                    company_id: currentCompanyId,
                    title: '⚠️ Alerta de diversidad en selección',
                    message: `La vacante "${vacancy?.position_title || 'N/A'}" no cumple metas: ${failures.join(', ')}`,
                    type: 'warning' as const,
                    category: 'selection',
                    entity_type: 'vacancy',
                    entity_id: vacancy?.id,
                    action_url: `/seleccion?vacancy=${vacancy?.id}`,
                  }));
                  await supabase.from('notifications').insert(diversityNotifs);
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking diversity compliance:', err);
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
      queryClient.invalidateQueries({ queryKey: ['employee_documents'] });
    },
  });
}

// Candidate Documents
export function useCandidateDocuments(candidateId: string | undefined) {
  return useQuery({
    queryKey: ['candidate_documents', candidateId],
    queryFn: async () => {
      if (!candidateId) return [];
      
      const { data, error } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!candidateId,
  });
}

export interface CreateCandidateDocumentData {
  candidateId: string;
  companyId: string;
  documentType: string;
  documentName?: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  expiryDate?: Date;
  observations?: string;
}

export function useCreateCandidateDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCandidateDocumentData) => {
      const { data: doc, error } = await supabase
        .from('candidate_documents')
        .insert({
          candidate_id: data.candidateId,
          company_id: data.companyId,
          document_type: data.documentType,
          document_name: data.documentName || null,
          file_url: data.fileUrl,
          file_name: data.fileName || null,
          file_size: data.fileSize || null,
          mime_type: data.mimeType || null,
          expiry_date: data.expiryDate ? toDateOnlyString(data.expiryDate) : null,
          observations: data.observations || null,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return doc;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidate_documents', variables.candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.candidateId] });
    },
  });
}

export function useDeleteCandidateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, candidateId }: { id: string; candidateId: string }) => {
      const { error } = await supabase
        .from('candidate_documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, candidateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['candidate_documents', data.candidateId] });
    },
  });
}
