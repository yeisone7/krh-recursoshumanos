import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { cleanupShiftAssignments } from '@/hooks/useCleanupShiftAssignments';
import type { 
  EmployeeIncapacity, 
  IncapacityWithEmployee, 
  IncapacityFormData,
  RecoveryFormData,
  IncapacityOrigin,
  RecoveryStatus 
} from '@/types/incapacity';
import { calculatePaymentDistribution, getAccumulatedDays, requiresReintegrationExam } from '@/types/incapacity';
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
          employee:employees_v2(id, first_name, last_name, document_number)
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
          employee:employees_v2(id, first_name, last_name, document_number)
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
      
      // Get accumulated days if it's an extension
      let accumulatedDays = 0;
      if (formData.is_extension && formData.parent_incapacity_id) {
        const { data: allIncapacities } = await supabase
          .from('employee_incapacities')
          .select('*')
          .eq('employee_id', formData.employee_id);
        
        if (allIncapacities) {
          const parent = allIncapacities.find(inc => inc.id === formData.parent_incapacity_id);
          if (parent) {
            accumulatedDays = getAccumulatedDays(parent as EmployeeIncapacity, allIncapacities as EmployeeIncapacity[]);
            accumulatedDays += parent.total_days;
          }
        }
      }
      
      // Calculate payment distribution
      const totalDays = differenceInDays(formData.end_date, formData.start_date) + 1;
      const dailySalary = formData.daily_base_salary || 0;
      const distribution = calculatePaymentDistribution(
        formData.origin,
        totalDays,
        dailySalary,
        accumulatedDays
      );
      
      // Get extension number
      let extensionNumber = 0;
      if (formData.is_extension && formData.parent_incapacity_id) {
        const { count } = await supabase
          .from('employee_incapacities')
          .select('*', { count: 'exact', head: true })
          .eq('parent_incapacity_id', formData.parent_incapacity_id);
        extensionNumber = (count || 0) + 1;
      }
      
      const insertData = {
        employee_id: formData.employee_id,
        company_id: currentCompanyId,
        origin: formData.origin,
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
        parent_incapacity_id: formData.parent_incapacity_id || null,
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
    },
  });
}

export function useUpdateIncapacity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: Partial<IncapacityFormData> }) => {
      const updateData: Record<string, unknown> = {};
      
      if (formData.origin) updateData.origin = formData.origin;
      if (formData.start_date) updateData.start_date = format(formData.start_date, 'yyyy-MM-dd');
      if (formData.end_date) updateData.end_date = format(formData.end_date, 'yyyy-MM-dd');
      if (formData.cie10_code !== undefined) updateData.cie10_code = formData.cie10_code || null;
      if (formData.diagnosis) updateData.diagnosis = formData.diagnosis;
      if (formData.treating_doctor !== undefined) updateData.treating_doctor = formData.treating_doctor || null;
      if (formData.certificate_number !== undefined) updateData.certificate_number = formData.certificate_number || null;
      if (formData.medical_entity !== undefined) updateData.medical_entity = formData.medical_entity || null;
      if (formData.daily_base_salary !== undefined) updateData.daily_base_salary = formData.daily_base_salary;
      if (formData.observations !== undefined) updateData.observations = formData.observations || null;
      
      // Recalculate payment if dates or origin changed
      if (formData.start_date && formData.end_date && formData.origin !== undefined) {
        const totalDays = differenceInDays(formData.end_date, formData.start_date) + 1;
        const dailySalary = formData.daily_base_salary || 0;
        const distribution = calculatePaymentDistribution(formData.origin, totalDays, dailySalary, 0);
        
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
          requires_reintegration_exam: requiresReintegrationExam(totalDays),
        });
      }
      
      const { data, error } = await supabase
        .from('employee_incapacities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
    },
  });
}

export function useUpdateRecoveryStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RecoveryFormData }) => {
      const updateData: Record<string, unknown> = {
        recovery_status: data.recovery_status,
      };
      
      if (data.filing_date) updateData.filing_date = format(data.filing_date, 'yyyy-MM-dd');
      if (data.filing_number !== undefined) updateData.filing_number = data.filing_number || null;
      if (data.expected_payment_date) updateData.expected_payment_date = format(data.expected_payment_date, 'yyyy-MM-dd');
      if (data.actual_payment_date) updateData.actual_payment_date = format(data.actual_payment_date, 'yyyy-MM-dd');
      if (data.recovered_amount !== undefined) updateData.recovered_amount = data.recovered_amount;
      if (data.recovery_notes !== undefined) updateData.recovery_notes = data.recovery_notes || null;
      
      const { data: result, error } = await supabase
        .from('employee_incapacities')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
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
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ incapacity }: { incapacity: IncapacityWithEmployee }) => {
      // Calculate expected return date (end_date + 1)
      const returnDate = new Date(incapacity.end_date);
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
      const { error } = await supabase
        .from('employee_incapacities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      queryClient.invalidateQueries({ queryKey: ['incapacity-alerts'] });
    },
  });
}

// =====================================================
// ALERTS HOOK
// =====================================================

export interface IncapacityAlert {
  id: string;
  type: 'extension_pending' | 'recovery_pending' | 'reintegration_exam';
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
      
      for (const inc of (data as unknown as IncapacityWithEmployee[])) {
        const endDate = new Date(inc.end_date);
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
  byOrigin: { comun: number; laboral: number };
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
        const start = new Date(inc.start_date);
        const end = new Date(inc.end_date);
        return isBefore(start, today) && isAfter(end, today);
      }).length;
      
      // This month's incapacities
      const thisMonth = incapacities.filter(inc => {
        const start = new Date(inc.start_date);
        return isAfter(start, startOfMonth);
      });
      
      // Pending recovery
      const pendingRecovery = incapacities.filter(inc => 
        inc.recovery_status === 'pendiente' && isBefore(new Date(inc.end_date), today)
      );
      
      // By origin
      const byOrigin = {
        comun: incapacities.filter(inc => inc.origin === 'comun').length,
        laboral: incapacities.filter(inc => inc.origin === 'laboral').length,
      };
      
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
