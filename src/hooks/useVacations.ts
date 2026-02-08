import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { cleanupShiftAssignments } from '@/hooks/useCleanupShiftAssignments';
import { 
  VacationConfig, 
  VacationBalance, 
  VacationRequest,
  VacationRequestType,
  VacationStatus,
  calculateBusinessDays,
  calculateCalendarDays,
  getVacationAlerts,
  VacationAlert
} from '@/types/vacation';

// ===== VACATION CONFIG =====
export function useVacationConfig() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['vacation-config', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_config')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .maybeSingle();

      if (error) throw error;
      
      // Return default config if none exists
      if (!data) {
        return {
          id: '',
          company_id: currentCompanyId!,
          days_per_year: 15,
          max_accumulation_years: 2,
          max_compensation_percentage: 50,
          alert_threshold_days: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as VacationConfig;
      }
      
      return data as VacationConfig;
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpsertVacationConfig() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<VacationConfig>) => {
      const { data, error } = await supabase
        .from('vacation_config')
        .upsert({
          company_id: currentCompanyId!,
          days_per_year: config.days_per_year ?? 15,
          max_accumulation_years: config.max_accumulation_years ?? 2,
          max_compensation_percentage: config.max_compensation_percentage ?? 50,
          alert_threshold_days: config.alert_threshold_days ?? 30,
        }, { onConflict: 'company_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-config'] });
      toast({ title: 'Configuración guardada', description: 'La configuración de vacaciones fue actualizada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ===== VACATION BALANCES =====
export function useVacationBalances() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['vacation-balances', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_balances')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as VacationBalance[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useEmployeeVacationBalances(employeeId: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['vacation-balances', 'employee', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_balances')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .eq('employee_id', employeeId!)
        .order('period_start', { ascending: false });

      if (error) throw error;
      return data as VacationBalance[];
    },
    enabled: !!currentCompanyId && !!employeeId,
  });
}

export function useCreateVacationBalance() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (balance: {
      employee_id: string;
      period_start: string;
      period_end: string;
      days_accrued: number;
      is_accumulated?: boolean;
      accumulation_expires?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('vacation_balances')
        .insert({
          ...balance,
          company_id: currentCompanyId!,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-balances'] });
      toast({ title: 'Saldo creado', description: 'El periodo de vacaciones fue registrado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVacationBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VacationBalance> & { id: string }) => {
      const { data, error } = await supabase
        .from('vacation_balances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-balances'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ===== VACATION REQUESTS =====
export function useVacationRequests(filters?: {
  status?: VacationStatus;
  request_type?: VacationRequestType;
  employee_id?: string;
}) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['vacation-requests', currentCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('vacation_requests')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number),
          balance:vacation_balances(*)
        `)
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.request_type) {
        query = query.eq('request_type', filters.request_type);
      }
      if (filters?.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as VacationRequest[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useVacationRequest(id: string | undefined) {
  return useQuery({
    queryKey: ['vacation-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number),
          balance:vacation_balances(*)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as VacationRequest;
    },
    enabled: !!id,
  });
}

export function useCreateVacationRequest() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (request: {
      employee_id: string;
      balance_id?: string;
      request_type: VacationRequestType;
      status?: VacationStatus;
      start_date: string;
      end_date: string;
      business_days: number;
      calendar_days?: number;
      compensation_amount?: number;
      notes?: string;
    }) => {
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      const calendarDays = request.calendar_days ?? calculateCalendarDays(startDate, endDate);

      const { data, error } = await supabase
        .from('vacation_requests')
        .insert({
          ...request,
          company_id: currentCompanyId!,
          calendar_days: calendarDays,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-balances'] });
      toast({ title: 'Solicitud creada', description: 'La solicitud de vacaciones fue registrada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVacationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<VacationRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-balances'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveVacation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      balanceId, 
      businessDays,
      requestType,
      employeeId,
      startDate,
      endDate,
    }: { 
      requestId: string; 
      balanceId?: string;
      businessDays: number;
      requestType: VacationRequestType;
      employeeId: string;
      startDate: string;
      endDate: string;
    }) => {
      // Update request status
      const { error: requestError } = await supabase
        .from('vacation_requests')
        .update({
          status: 'aprobado' as VacationStatus,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Update balance if applicable
      if (balanceId && requestType !== 'acumulacion') {
        const updateField = requestType === 'compensacion' ? 'days_compensated' : 'days_taken';
        
        // Get current balance
        const { data: balance, error: balanceGetError } = await supabase
          .from('vacation_balances')
          .select('days_taken, days_compensated')
          .eq('id', balanceId)
          .single();

        if (balanceGetError) throw balanceGetError;

        const currentValue = requestType === 'compensacion' 
          ? Number(balance.days_compensated) 
          : Number(balance.days_taken);

        const { error: balanceError } = await supabase
          .from('vacation_balances')
          .update({
            [updateField]: currentValue + businessDays
          })
          .eq('id', balanceId);

        if (balanceError) throw balanceError;
      }

      // Mark as accumulated if it's an accumulation request
      if (balanceId && requestType === 'acumulacion') {
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 2);
        
        const { error: balanceError } = await supabase
          .from('vacation_balances')
          .update({
            is_accumulated: true,
            accumulation_expires: expirationDate.toISOString().split('T')[0]
          })
          .eq('id', balanceId);

        if (balanceError) throw balanceError;
      }

      // Cleanup conflicting shift assignments (only for disfrute/compensacion)
      if (requestType === 'disfrute' || requestType === 'compensacion') {
        await cleanupShiftAssignments({
          employeeId,
          startDate,
          endDate,
          absenceType: 'vacaciones',
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-balances'] });
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
      toast({ title: 'Vacaciones aprobadas', description: 'El saldo fue actualizado correctamente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useInterruptVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      interruptionDate,
      interruptionReason,
      remainingDays
    }: {
      requestId: string;
      interruptionDate: string;
      interruptionReason: string;
      remainingDays: number;
    }) => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .update({
          status: 'interrumpido' as VacationStatus,
          interruption_date: interruptionDate,
          interruption_reason: interruptionReason,
          remaining_days: remainingDays
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['vacation-balances'] });
      toast({ 
        title: 'Vacaciones interrumpidas', 
        description: 'Los días restantes quedan pendientes para reprogramar.' 
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResumeVacation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      resumeStartDate,
      resumeEndDate
    }: {
      requestId: string;
      resumeStartDate: string;
      resumeEndDate: string;
    }) => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .update({
          resume_start_date: resumeStartDate,
          resume_end_date: resumeEndDate,
          remaining_days: 0
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      toast({ title: 'Vacaciones reprogramadas', description: 'Las fechas de reanudación fueron registradas.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteVacationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vacation_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacation-requests'] });
      toast({ title: 'Solicitud eliminada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// ===== VACATION CALENDAR =====
export function useVacationCalendar(year: number, month: number) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['vacation-calendar', currentCompanyId, year, month],
    queryFn: async () => {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const { data, error } = await supabase
        .from('vacation_requests')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name)
        `)
        .eq('company_id', currentCompanyId!)
        .in('status', ['aprobado', 'en_curso', 'completado'])
        .eq('request_type', 'disfrute')
        .or(`start_date.lte.${endOfMonth.toISOString().split('T')[0]},end_date.gte.${startOfMonth.toISOString().split('T')[0]}`);

      if (error) throw error;
      return data as VacationRequest[];
    },
    enabled: !!currentCompanyId,
  });
}

// ===== VACATION ALERTS =====
export function useVacationAlerts() {
  const { data: balances } = useVacationBalances();
  const { data: requests } = useVacationRequests();
  const { data: config } = useVacationConfig();

  return useQuery<VacationAlert[]>({
    queryKey: ['vacation-alerts', balances, requests, config],
    queryFn: () => {
      if (!balances || !requests || !config) return [];
      return getVacationAlerts(balances, requests, config);
    },
    enabled: !!balances && !!requests && !!config,
  });
}

// ===== VACATION STATS =====
export function useVacationStats() {
  const { data: balances } = useVacationBalances();
  const { data: requests } = useVacationRequests();
  const { data: config } = useVacationConfig();

  return useQuery({
    queryKey: ['vacation-stats', balances, requests, config],
    queryFn: () => {
      if (!balances || !requests || !config) {
        return {
          totalPendingDays: 0,
          employeesWithExcessiveAccumulation: 0,
          activeVacations: 0,
          pendingApprovals: 0
        };
      }

      const today = new Date();
      
      return {
        totalPendingDays: balances.reduce((sum, b) => sum + Number(b.days_pending), 0),
        employeesWithExcessiveAccumulation: balances.filter(b => 
          Number(b.days_pending) > config.alert_threshold_days
        ).length,
        activeVacations: requests.filter(r => {
          if (r.status !== 'aprobado' && r.status !== 'en_curso') return false;
          if (r.request_type !== 'disfrute') return false;
          const start = new Date(r.start_date);
          const end = new Date(r.end_date);
          return start <= today && end >= today;
        }).length,
        pendingApprovals: requests.filter(r => r.status === 'borrador').length
      };
    },
    enabled: !!balances && !!requests && !!config,
  });
}
