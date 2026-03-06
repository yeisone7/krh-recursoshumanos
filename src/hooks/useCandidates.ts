import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type ContractType = Database['public']['Enums']['contract_type'];
type LinkType = Database['public']['Enums']['link_type'];
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
      const { data: employee, error: createError } = await supabase
        .from('employees_v2')
        .insert({
          company_id: currentCompanyId!,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          document_type: candidate.document_type,
          document_number: candidate.document_number,
          birth_date: candidate.birth_date,
          gender: candidate.gender as any,
          is_active: true,
          created_by: user?.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Step 1b: Create contact record
      await supabase.from('employee_contact').insert({
        employee_id: employee.id,
        email: candidate.email,
        phone: candidate.phone,
        mobile: candidate.mobile,
        residence_address: candidate.address,
        residence_city: candidate.city,
        residence_department: candidate.department,
        is_current: true,
      });

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
