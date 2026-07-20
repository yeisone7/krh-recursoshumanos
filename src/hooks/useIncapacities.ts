import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { cleanupShiftAssignments } from '@/hooks/useCleanupShiftAssignments';
import { parseDateOnlyOr } from '@/lib/dateOnly';
import { logAuditEvent } from '@/lib/auditService';
import type { 
  EmployeeIncapacity, 
  IncapacityWithEmployee, 
  IncapacityFormData,
  RecoveryFormData,
  IncapacityOrigin,
  RecoveryStatus 
} from '@/types/incapacity';
import {
  calculatePaymentDistribution,
  getAccumulatedDays,
  getAccumulatedDaysForNewExtension,
  getIncapacityChain,
  getLegalMilestones,
  getLegalMinimumMonthlyWage,
  getRootIncapacity,
  getTotalChainDays,
  incapacityOriginValues,
  requiresReintegrationExam,
} from '@/types/incapacity';
import { calculateExpirationDate, PERIODIC_EXAM_VALIDITY_MONTHS } from '@/types/medicalExam';

// =====================================================
// FETCH HOOKS
// =====================================================

export function useIncapacities() {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['incapacities', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number, gender)
        `)
        .eq('company_id', currentCompanyId!)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      
      // Group extensions under parent incapacities
      const incapacityMap = new Map<string, IncapacityWithEmployee>();
      const extensions: IncapacityWithEmployee[] = [];
      
      for (const inc of (data as unknown as IncapacityWithEmployee[])) {
        if (inc.is_extension && inc.parent_incapacity_id) {
          extensions.push(inc);
        } else {
          incapacityMap.set(inc.id, { ...inc, extensions: [] });
        }
      }
      
      // Attach extensions to parents
      for (const ext of extensions) {
        const parent = incapacityMap.get(ext.parent_incapacity_id!);
        if (parent) {
          parent.extensions = parent.extensions || [];
          parent.extensions.push(ext);
          parent.extensions.sort((a, b) => a.extension_number - b.extension_number);
        } else {
          // Orphan extension, add as standalone
          incapacityMap.set(ext.id, ext);
        }
      }
      
      return Array.from(incapacityMap.values());
    },
    enabled: !!currentCompanyId,
  });
}

export function useIncapacity(id: string | undefined) {
  return useQuery({
    queryKey: ['incapacity', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number, gender)
        `)
        .eq('id', id!)
        .single();
      
      if (error) throw error;
      
      // Fetch extensions
      const { data: extensions } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('parent_incapacity_id', id!)
        .order('extension_number', { ascending: true });
      
      return { ...data, extensions: extensions || [] } as IncapacityWithEmployee;
    },
    enabled: !!id,
  });
}

export function useEmployeeIncapacities(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['employee_incapacities', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('employee_id', employeeId!)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as EmployeeIncapacity[];
    },
    enabled: !!employeeId,
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

export function useCreateIncapacity() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();
  
  return useMutation({
    mutationFn: async (formData: IncapacityFormData) => {
      // Get employee's social security info
      const { data: socialSecurity } = await supabase
        .from('employee_social_security')
        .select('eps, arl, afp')
        .eq('employee_id', formData.employee_id)
        .eq('is_current', true)
        .single();
      
      // Extensions always inherit the IBC and origin from the initial incapacity.
      let accumulatedDays = 0;
      let dailySalary = formData.daily_base_salary || 0;
      let calculationOrigin = formData.origin;
      let normalizedParentId = formData.parent_incapacity_id || null;
      let extensionNumber = 0;

      if (formData.is_extension && formData.parent_incapacity_id) {
        const { data: allIncapacities } = await supabase
          .from('employee_incapacities')
          .select('*')
          .eq('employee_id', formData.employee_id);
        
        if (allIncapacities) {
          const typedIncapacities = allIncapacities as EmployeeIncapacity[];
          const parent = typedIncapacities.find(inc => inc.id === formData.parent_incapacity_id);
          if (parent) {
            const root = getRootIncapacity(parent, typedIncapacities);
            accumulatedDays = getAccumulatedDaysForNewExtension(root.id, typedIncapacities);
            dailySalary = root.daily_base_salary || 0;
            calculationOrigin = root.origin;
            normalizedParentId = root.id;
            extensionNumber = getIncapacityChain(root.id, typedIncapacities)
              .reduce((maximum, item) => Math.max(maximum, item.extension_number || 0), 0) + 1;
          }
        }
      }
      
      // Calculate payment distribution
      const totalDays = differenceInDays(formData.end_date, formData.start_date) + 1;
      const distribution = calculatePaymentDistribution(
        calculationOrigin,
        totalDays,
        dailySalary,
        accumulatedDays,
        getLegalMinimumMonthlyWage(formData.start_date)
      );
      
      const insertData = {
        employee_id: formData.employee_id,
        company_id: currentCompanyId,
        origin: calculationOrigin,
        start_date: format(formData.start_date, 'yyyy-MM-dd'),
        end_date: format(formData.end_date, 'yyyy-MM-dd'),
        
        cie10_code: formData.cie10_code || null,
        diagnosis: formData.diagnosis,
        treating_doctor: formData.treating_doctor || null,
        certificate_number: formData.certificate_number || null,
        medical_entity: formData.medical_entity || null,
        
        eps_name: socialSecurity?.eps || null,
        arl_name: socialSecurity?.arl || null,
        afp_name: socialSecurity?.afp || null,
        
        daily_base_salary: dailySalary,
        employer_days: distribution.employerDays,
        eps_days: distribution.epsDays,
        arl_days: distribution.arlDays,
        afp_days: distribution.afpDays,
        employer_amount: distribution.employerAmount,
        eps_amount: distribution.epsAmount,
        arl_amount: distribution.arlAmount,
        afp_amount: distribution.afpAmount,
        total_amount: distribution.totalAmount,
        
        is_extension: formData.is_extension,
        parent_incapacity_id: normalizedParentId,
        extension_number: extensionNumber,
        
        requires_reintegration_exam: requiresReintegrationExam(totalDays, accumulatedDays),
        
        observations: formData.observations || null,
        created_by: user?.id,
      };
      
      const { data, error } = await supabase
        .from('employee_incapacities')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;

      await logAuditEvent({
        company_id: currentCompanyId!,
        action: 'create',
        entity_type: 'incapacity',
        module: 'incapacidades',
        entity_id: data.id,
        entity_name: formData.is_extension
          ? `Prórroga #${extensionNumber}`
          : `Incapacidad ${formData.diagnosis}`,
        description: formData.is_extension
          ? 'Se registró una prórroga con control independiente.'
          : 'Se registró una incapacidad.',
        new_values: insertData,
        metadata: {
          is_extension: formData.is_extension,
          inherited_ibc_from: formData.is_extension ? normalizedParentId : null,
          minimum_wage_floor_applied: distribution.usesMinimumWageFloor,
        },
      });
      
      // Auto-create reintegration exam if incapacity exceeds 30 days
      const totalChainDays = totalDays + accumulatedDays;
      if (totalChainDays > 30) {
        try {
          // Calculate expected return date (end_date + 1)
          const returnDate = new Date(formData.end_date);
          returnDate.setDate(returnDate.getDate() + 1);
          
          const examData = {
            employee_id: formData.employee_id,
            exam_type: 'reintegro' as const,
            exam_date: format(returnDate, 'yyyy-MM-dd'),
            expiration_date: null,
            result: 'pendiente' as const,
            concept: `Examen de reintegro por incapacidad > 30 días (${totalChainDays} días totales)`,
            provider: '',
            doctor_name: '',
            restrictions: null,
            observations: `Creado automáticamente por incapacidad ID: ${data.id}. Diagnóstico: ${formData.diagnosis}`,
            created_by: user?.id,
            company_id: currentCompanyId!,
          };
          
          const { data: examResult, error: examError } = await supabase
            .from('medical_exams')
            .insert(examData)
            .select()
            .single();
          
          if (!examError && examResult) {
            // Link exam to incapacity
            await supabase
              .from('employee_incapacities')
              .update({ reintegration_exam_id: examResult.id })
              .eq('id', data.id);
            
            toast.success('Examen de reintegro creado automáticamente', {
              description: 'La incapacidad supera 30 días. Se creó un examen pendiente.',
            });
          }
        } catch (examCreationError) {
          console.warn('Could not auto-create reintegration exam:', examCreationError);
        }
      }
      
      // Cleanup conflicting shift assignments
      await cleanupShiftAssignments({
        employeeId: formData.employee_id,
        startDate: format(formData.start_date, 'yyyy-MM-dd'),
        endDate: format(formData.end_date, 'yyyy-MM-dd'),
        absenceType: 'incapacidad',
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['employee_incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit_trail'] });
    },
  });
}

export function useUpdateIncapacity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<IncapacityFormData> }) => {
      const { data: currentRecord, error: currentError } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('id', id)
        .single();

      if (currentError) throw currentError;

      const { data: employeeRecords, error: employeeRecordsError } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('employee_id', currentRecord.employee_id);

      if (employeeRecordsError) throw employeeRecordsError;

      const typedRecords = employeeRecords as unknown as EmployeeIncapacity[];
      const typedCurrent = currentRecord as unknown as EmployeeIncapacity;
      const root = getRootIncapacity(typedCurrent, typedRecords);
      const effectiveOrigin = typedCurrent.is_extension
        ? root.origin
        : (formData.origin || typedCurrent.origin);
      const effectiveDailySalary = typedCurrent.is_extension
        ? (root.daily_base_salary || 0)
        : (formData.daily_base_salary ?? typedCurrent.daily_base_salary ?? 0);
      const effectiveStartDate = formData.start_date || parseDateOnlyOr(typedCurrent.start_date, new Date());
      const effectiveEndDate = formData.end_date || parseDateOnlyOr(typedCurrent.end_date, effectiveStartDate);
      const accumulatedDays = typedCurrent.is_extension
        ? getAccumulatedDays(typedCurrent, typedRecords)
        : 0;
      const totalDays = differenceInDays(effectiveEndDate, effectiveStartDate) + 1;
      const distribution = calculatePaymentDistribution(
        effectiveOrigin,
        totalDays,
        effectiveDailySalary,
        accumulatedDays,
        getLegalMinimumMonthlyWage(effectiveStartDate)
      );
      const updateData: Record<string, unknown> = {};
      
      updateData.origin = effectiveOrigin;
      if (formData.start_date) updateData.start_date = format(formData.start_date, 'yyyy-MM-dd');
      if (formData.end_date) updateData.end_date = format(formData.end_date, 'yyyy-MM-dd');
      if (formData.cie10_code !== undefined) updateData.cie10_code = formData.cie10_code || null;
      if (formData.diagnosis) updateData.diagnosis = formData.diagnosis;
      if (formData.treating_doctor !== undefined) updateData.treating_doctor = formData.treating_doctor || null;
      if (formData.certificate_number !== undefined) updateData.certificate_number = formData.certificate_number || null;
      if (formData.medical_entity !== undefined) updateData.medical_entity = formData.medical_entity || null;
      updateData.daily_base_salary = effectiveDailySalary;
      if (formData.observations !== undefined) updateData.observations = formData.observations || null;

      Object.assign(updateData, {
        employer_days: distribution.employerDays,
        eps_days: distribution.epsDays,
        arl_days: distribution.arlDays,
        afp_days: distribution.afpDays,
        employer_amount: distribution.employerAmount,
        eps_amount: distribution.epsAmount,
        arl_amount: distribution.arlAmount,
        afp_amount: distribution.afpAmount,
        total_amount: distribution.totalAmount,
        requires_reintegration_exam: requiresReintegrationExam(totalDays, accumulatedDays),
      });
      
      const { data, error } = await supabase
        .from('employee_incapacities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Recalculate the whole chain so later extensions stay aligned with the
      // initial IBC and with any edited duration in a previous record.
      const { data: refreshedRecords, error: refreshedError } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('employee_id', currentRecord.employee_id);

      if (refreshedError) throw refreshedError;

      const refreshed = refreshedRecords as unknown as EmployeeIncapacity[];
      const refreshedCurrent = refreshed.find((item) => item.id === id)!;
      const refreshedRoot = getRootIncapacity(refreshedCurrent, refreshed);
      const rootIbc = refreshedRoot.daily_base_salary || 0;
      let chainAccumulatedDays = 0;

      for (const item of getIncapacityChain(refreshedRoot.id, refreshed)) {
        const itemOrigin = item.is_extension ? refreshedRoot.origin : item.origin;
        const itemIbc = item.is_extension ? rootIbc : (item.daily_base_salary || 0);
        const itemDistribution = calculatePaymentDistribution(
          itemOrigin,
          item.total_days,
          itemIbc,
          chainAccumulatedDays,
          getLegalMinimumMonthlyWage(item.start_date)
        );

        const { error: chainUpdateError } = await supabase
          .from('employee_incapacities')
          .update({
            origin: itemOrigin,
            daily_base_salary: itemIbc,
            employer_days: itemDistribution.employerDays,
            eps_days: itemDistribution.epsDays,
            arl_days: itemDistribution.arlDays,
            afp_days: itemDistribution.afpDays,
            employer_amount: itemDistribution.employerAmount,
            eps_amount: itemDistribution.epsAmount,
            arl_amount: itemDistribution.arlAmount,
            afp_amount: itemDistribution.afpAmount,
            total_amount: itemDistribution.totalAmount,
            requires_reintegration_exam: requiresReintegrationExam(item.total_days, chainAccumulatedDays),
          })
          .eq('id', item.id);

        if (chainUpdateError) throw chainUpdateError;
        chainAccumulatedDays += item.total_days;
      }

      await logAuditEvent({
        company_id: currentRecord.company_id,
        action: 'update',
        entity_type: 'incapacity',
        module: 'incapacidades',
        entity_id: id,
        entity_name: currentRecord.is_extension
          ? `Prórroga #${currentRecord.extension_number || 0}`
          : `Incapacidad ${currentRecord.diagnosis}`,
        description: currentRecord.is_extension
          ? 'Se actualizaron los datos y valores independientes de la prórroga.'
          : 'Se actualizó la incapacidad y se recalculó su cadena de prórrogas.',
        old_values: currentRecord,
        new_values: { ...data, ...updateData },
        metadata: {
          is_extension: currentRecord.is_extension,
          minimum_wage_floor_applied: distribution.usesMinimumWageFloor,
        },
      });

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['employee_incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit_trail', 'incapacity', variables.id] });
    },
  });
}

export function useUpdateRecoveryStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecoveryFormData }) => {
      const { data: currentRecord, error: currentError } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('id', id)
        .single();

      if (currentError) throw currentError;

      const updateData: Record<string, unknown> = {
        recovery_status: data.recovery_status,
        filing_date: data.filing_date ? format(data.filing_date, 'yyyy-MM-dd') : null,
        filing_number: data.filing_number || null,
        expected_payment_date: data.expected_payment_date ? format(data.expected_payment_date, 'yyyy-MM-dd') : null,
        actual_payment_date: data.actual_payment_date ? format(data.actual_payment_date, 'yyyy-MM-dd') : null,
        recovered_amount: data.recovered_amount ?? 0,
        recovery_notes: data.recovery_notes || null,
      };
      
      const { data: result, error } = await supabase
        .from('employee_incapacities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      await logAuditEvent({
        company_id: currentRecord.company_id,
        action: 'update',
        entity_type: 'incapacity',
        module: 'incapacidades',
        entity_id: id,
        entity_name: currentRecord.is_extension
          ? `Prórroga #${currentRecord.extension_number || 0}`
          : `Incapacidad ${currentRecord.diagnosis}`,
        description: currentRecord.is_extension
          ? `Se actualizó el radicado independiente de la prórroga #${currentRecord.extension_number || 0}.`
          : 'Se actualizó el recobro de la incapacidad inicial.',
        old_values: {
          recovery_status: currentRecord.recovery_status,
          filing_date: currentRecord.filing_date,
          filing_number: currentRecord.filing_number,
          expected_payment_date: currentRecord.expected_payment_date,
          actual_payment_date: currentRecord.actual_payment_date,
          recovered_amount: currentRecord.recovered_amount,
          recovery_notes: currentRecord.recovery_notes,
        },
        new_values: updateData,
        metadata: { is_extension: currentRecord.is_extension },
      });

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['employee_incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit_trail', 'incapacity', variables.id] });
    },
  });
}

export function useLinkReintegrationExam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ incapacityId, examId }: { incapacityId: string; examId: string }) => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .update({ reintegration_exam_id: examId })
        .eq('id', incapacityId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity', variables.incapacityId] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
    },
  });
}

export function useCreateReintegrationExam() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();
  
  return useMutation({
    mutationFn: async ({ incapacity }: { incapacity: IncapacityWithEmployee }) => {
      // Calculate expected return date (end_date + 1)
      const returnDate = parseDateOnlyOr(incapacity.end_date, new Date());
      returnDate.setDate(returnDate.getDate() + 1);
      
      const examData = {
        employee_id: incapacity.employee_id,
        exam_type: 'reintegro' as const,
        exam_date: format(returnDate, 'yyyy-MM-dd'),
        expiration_date: null,
        result: 'pendiente' as const,
        concept: `Examen de reintegro por incapacidad > 30 días`,
        provider: '',
        doctor_name: '',
        restrictions: null,
        observations: `Creado para incapacidad ID: ${incapacity.id}. Diagnóstico: ${incapacity.diagnosis}`,
        created_by: user?.id,
        company_id: currentCompanyId!,
      };
      
      const { data: examResult, error: examError } = await supabase
        .from('medical_exams')
        .insert(examData)
        .select()
        .single();
      
      if (examError) throw examError;
      
      // Link exam to incapacity
      await supabase
        .from('employee_incapacities')
        .update({ reintegration_exam_id: examResult.id })
        .eq('id', incapacity.id);
      
      return examResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['medical_exams'] });
    },
  });
}

export function useDeleteIncapacity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: target, error: targetError } = await supabase
        .from('employee_incapacities')
        .select('id, employee_id, company_id, diagnosis, is_extension, extension_number')
        .eq('id', id)
        .single();

      if (targetError) throw targetError;

      const { data: employeeIncapacities, error: listError } = await supabase
        .from('employee_incapacities')
        .select('id, parent_incapacity_id')
        .eq('employee_id', target.employee_id);

      if (listError) throw listError;

      const childIdsByParent = new Map<string, string[]>();
      for (const incapacity of employeeIncapacities || []) {
        if (!incapacity.parent_incapacity_id) continue;
        const currentChildren = childIdsByParent.get(incapacity.parent_incapacity_id) || [];
        currentChildren.push(incapacity.id);
        childIdsByParent.set(incapacity.parent_incapacity_id, currentChildren);
      }

      const idsToDelete: string[] = [];
      const collectDescendantsFirst = (currentId: string) => {
        for (const childId of childIdsByParent.get(currentId) || []) {
          collectDescendantsFirst(childId);
        }
        idsToDelete.push(currentId);
      };

      collectDescendantsFirst(id);

      const { error: documentsError } = await supabase
        .from('document_versions')
        .delete()
        .in('entity_id', idsToDelete)
        .in('entity_type', ['incapacity', 'incapacity_clinical_history']);

      if (documentsError) throw documentsError;

      for (const incapacityId of idsToDelete) {
        const { error } = await supabase
          .from('employee_incapacities')
          .delete()
          .eq('id', incapacityId);

        if (error) throw error;
      }

      await logAuditEvent({
        company_id: target.company_id,
        action: 'delete',
        entity_type: 'incapacity',
        module: 'incapacidades',
        entity_id: target.id,
        entity_name: target.is_extension
          ? `Prórroga #${target.extension_number || 0}`
          : `Incapacidad ${target.diagnosis}`,
        description: target.is_extension
          ? 'Se eliminó una prórroga y sus controles independientes.'
          : `Se eliminó la incapacidad y ${Math.max(0, idsToDelete.length - 1)} prórroga(s).`,
        old_values: target,
        metadata: { deleted_record_ids: idsToDelete },
        severity: 'warning',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity'] });
      queryClient.invalidateQueries({ queryKey: ['employee_incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['document_versions'] });
      queryClient.invalidateQueries({ queryKey: ['current_document'] });
    },
  });
}

// =====================================================
// ALERTS HOOK
// =====================================================

export interface IncapacityAlert {
  id: string;
  type: 'extension_pending' | 'recovery_pending' | 'reintegration_exam' | 'legal_milestone';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  daysRemaining: number;
  incapacity: IncapacityWithEmployee;
}

export function useIncapacityAlerts() {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['incapacity-alerts', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      
      const alerts: IncapacityAlert[] = [];
      const today = new Date();
      const allIncapacities = (data as unknown as IncapacityWithEmployee[]) || [];
      const roots = new Map<string, IncapacityWithEmployee>();

      for (const inc of allIncapacities) {
        if (!inc.is_extension || !inc.parent_incapacity_id) {
          roots.set(inc.id, { ...inc, extensions: [] });
        }
      }

      for (const inc of allIncapacities) {
        if (inc.is_extension && inc.parent_incapacity_id) {
          const parent = roots.get(inc.parent_incapacity_id);
          if (parent) {
            parent.extensions = parent.extensions || [];
            parent.extensions.push(inc);
          }
        }
      }
      
      for (const inc of allIncapacities) {
        const endDate = parseDateOnlyOr(inc.end_date, today);
        const daysUntilEnd = differenceInDays(endDate, today);
        const employeeName = inc.employee 
          ? `${inc.employee.first_name} ${inc.employee.last_name}`
          : 'Empleado';
        
        // Alert for incapacities ending soon (potential extension needed)
        if (daysUntilEnd >= 0 && daysUntilEnd <= 5 && !inc.is_extension) {
          alerts.push({
            id: `ext-${inc.id}`,
            type: 'extension_pending',
            level: daysUntilEnd <= 2 ? 'critical' : 'warning',
            title: 'Incapacidad por vencer',
            description: `La incapacidad de ${employeeName} vence en ${daysUntilEnd} día(s). Verificar si requiere prórroga.`,
            daysRemaining: daysUntilEnd,
            incapacity: inc,
          });
        }
        
        // Alert for pending recovery filings
        if (inc.recovery_status === 'pendiente' && isBefore(endDate, today)) {
          const daysSinceEnd = differenceInDays(today, endDate);
          alerts.push({
            id: `rec-${inc.id}`,
            type: 'recovery_pending',
            level: daysSinceEnd > 15 ? 'critical' : daysSinceEnd > 7 ? 'warning' : 'info',
            title: 'Recobro pendiente',
            description: `La incapacidad de ${employeeName} finalizó hace ${daysSinceEnd} día(s) y no ha sido radicada para recobro.`,
            daysRemaining: -daysSinceEnd,
            incapacity: inc,
          });
        }
        
        // Alert for reintegration exam
        if (inc.requires_reintegration_exam && !inc.reintegration_exam_id && isBefore(endDate, addDays(today, 5))) {
          const daysToEnd = differenceInDays(endDate, today);
          alerts.push({
            id: `rein-${inc.id}`,
            type: 'reintegration_exam',
            level: daysToEnd <= 0 ? 'critical' : 'warning',
            title: 'Examen de reintegro pendiente',
            description: `${employeeName} requiere examen de reintegro antes de retornar. La incapacidad ${daysToEnd <= 0 ? 'ya finalizó' : `finaliza en ${daysToEnd} día(s)`}.`,
            daysRemaining: daysToEnd,
            incapacity: inc,
          });
        }
      }

      for (const root of roots.values()) {
        const chainDays = getTotalChainDays(root);
        const latestEndDate = [root, ...(root.extensions || [])]
          .map((inc) => parseDateOnlyOr(inc.end_date, new Date()))
          .sort((a, b) => b.getTime() - a.getTime())[0];
        const daysSinceLatestEnd = differenceInDays(today, latestEndDate);
        const employeeName = root.employee
          ? `${root.employee.first_name} ${root.employee.last_name}`
          : 'Empleado';

        if (root.origin !== 'comun' || daysSinceLatestEnd > 45) continue;

        for (const milestone of getLegalMilestones(root.origin, chainDays)) {
          const shouldAlert =
            (milestone.daysRemaining >= 0 && milestone.daysRemaining <= 20) ||
            (milestone.isReached && chainDays - milestone.day <= 20);

          if (!shouldAlert) continue;

          alerts.push({
            id: `legal-${milestone.key}-${root.id}`,
            type: 'legal_milestone',
            level: milestone.level,
            title: milestone.title,
            description: `${employeeName}: ${milestone.description} Días acumulados: ${chainDays}.`,
            daysRemaining: milestone.daysRemaining,
            incapacity: root,
          });
        }
      }
      
      // Sort by urgency (critical first, then by days remaining)
      alerts.sort((a, b) => {
        const levelOrder = { critical: 0, warning: 1, info: 2 };
        if (levelOrder[a.level] !== levelOrder[b.level]) {
          return levelOrder[a.level] - levelOrder[b.level];
        }
        return a.daysRemaining - b.daysRemaining;
      });
      
      return alerts;
    },
    enabled: !!currentCompanyId,
  });
}

// =====================================================
// STATISTICS HOOK
// =====================================================

export interface IncapacityStats {
  totalActive: number;
  totalThisMonth: number;
  totalDaysThisMonth: number;
  pendingRecovery: number;
  pendingRecoveryAmount: number;
  byOrigin: Record<IncapacityOrigin, number>;
  avgDuration: number;
}

export function useIncapacityStats() {
  const { currentCompanyId } = useAuth();
  
  return useQuery({
    queryKey: ['incapacity-stats', currentCompanyId],
    queryFn: async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select('*')
        .eq('company_id', currentCompanyId!);
      
      if (error) throw error;
      
      const incapacities = data as EmployeeIncapacity[];
      
      // Active incapacities (currently ongoing)
      const totalActive = incapacities.filter(inc => {
        const start = parseDateOnlyOr(inc.start_date, today);
        const end = parseDateOnlyOr(inc.end_date, today);
        return isBefore(start, today) && isAfter(end, today);
      }).length;
      
      // This month's incapacities
      const thisMonth = incapacities.filter(inc => {
        const start = parseDateOnlyOr(inc.start_date, today);
        return isAfter(start, startOfMonth);
      });
      
      // Pending recovery
      const pendingRecovery = incapacities.filter(inc => 
        inc.recovery_status === 'pendiente' && isBefore(parseDateOnlyOr(inc.end_date, today), today)
      );
      
      // By origin
      const byOrigin = incapacityOriginValues.reduce(
        (acc, origin) => {
          acc[origin] = 0;
          return acc;
        },
        {} as Record<IncapacityOrigin, number>
      );

      for (const inc of incapacities) {
        if (inc.origin in byOrigin) {
          byOrigin[inc.origin]++;
        }
      }
      
      // Average duration
      const avgDuration = incapacities.length > 0
        ? incapacities.reduce((sum, inc) => sum + inc.total_days, 0) / incapacities.length
        : 0;
      
      return {
        totalActive,
        totalThisMonth: thisMonth.length,
        totalDaysThisMonth: thisMonth.reduce((sum, inc) => sum + inc.total_days, 0),
        pendingRecovery: pendingRecovery.length,
        pendingRecoveryAmount: pendingRecovery.reduce((sum, inc) => sum + (inc.total_amount || 0), 0),
        byOrigin,
        avgDuration: Math.round(avgDuration * 10) / 10,
      } as IncapacityStats;
    },
    enabled: !!currentCompanyId,
  });
}
