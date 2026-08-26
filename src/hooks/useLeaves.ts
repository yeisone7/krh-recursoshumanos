import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cleanupShiftAssignments } from '@/hooks/useCleanupShiftAssignments';
import { 
  LeaveRequest, 
  LeaveTypeConfig, 
  LeaveBalance, 
  LeaveType,
  LeaveDurationType,
  LeaveRequestStatus 
} from '@/types/leave';
import { addDays, format } from 'date-fns';
import { parseDateOnlyOr } from '@/lib/dateOnly';
import { useHolidaysSet } from '@/hooks/useHolidays';

// =============================================
// LEAVE TYPE CONFIG
// =============================================

export function useLeaveTypeConfigs() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['leave_type_config', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_type_config')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('display_name');

      if (error) throw error;
      return data as LeaveTypeConfig[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpdateLeaveTypeConfig() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<LeaveTypeConfig>) => {
      const { data, error } = await supabase
        .from('leave_type_config')
        .update(updates)
        .eq('id', id)
        .eq('company_id', currentCompanyId!)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_type_config'] });
    },
  });
}

export type CreateLeaveTypeConfigInput = Pick<
  LeaveTypeConfig,
  | 'leave_type'
  | 'display_name'
  | 'description'
  | 'max_days_per_year'
  | 'is_paid'
  | 'requires_document'
  | 'document_description'
  | 'min_days_advance'
  | 'allows_half_day'
  | 'allows_hours'
  | 'is_active'
  | 'color'
>;

export function useCreateLeaveTypeConfig() {
  const queryClient = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (config: CreateLeaveTypeConfigInput) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa antes de crear el tipo de permiso.');

      const { data, error } = await supabase
        .from('leave_type_config')
        .insert({
          ...config,
          company_id: currentCompanyId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_type_config'] });
    },
  });
}

export interface LeaveTypeUsage {
  requests: number;
  balances: number;
}

export class LeaveTypeInUseError extends Error {
  usage: LeaveTypeUsage;

  constructor(usage: LeaveTypeUsage) {
    super('El tipo de permiso tiene información histórica asociada.');
    this.name = 'LeaveTypeInUseError';
    this.usage = usage;
  }
}

export function useDeleteLeaveTypeConfig() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (config: Pick<LeaveTypeConfig, 'id' | 'leave_type'>) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa antes de eliminar el tipo de permiso.');

      const [requestsResult, balancesResult] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompanyId)
          .eq('leave_type', config.leave_type),
        supabase
          .from('leave_balances')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompanyId)
          .eq('leave_type', config.leave_type),
      ]);

      if (requestsResult.error) throw requestsResult.error;
      if (balancesResult.error) throw balancesResult.error;

      const usage = {
        requests: requestsResult.count || 0,
        balances: balancesResult.count || 0,
      };
      if (usage.requests > 0 || usage.balances > 0) throw new LeaveTypeInUseError(usage);

      const { error } = await supabase
        .from('leave_type_config')
        .delete()
        .eq('id', config.id)
        .eq('company_id', currentCompanyId);

      if (error) throw error;
      return config.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_type_config'] });
    },
  });
}

// =============================================
// LEAVE BALANCES
// =============================================

export function useLeaveBalances(year?: number) {
  const { currentCompanyId } = useAuth();
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['leave_balances', currentCompanyId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select(`
          *,
          employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .eq('year', currentYear);

      if (error) throw error;
      return data as LeaveBalance[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useEmployeeLeaveBalances(employeeId: string, year?: number) {
  const currentYear = year || new Date().getFullYear();

  return useQuery({
    queryKey: ['leave_balances', 'employee', employeeId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', currentYear);

      if (error) throw error;
      return data as LeaveBalance[];
    },
    enabled: !!employeeId,
  });
}

export function useCreateLeaveBalance() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (balance: {
      employee_id: string;
      leave_type: LeaveType;
      year: number;
      entitled_days: number;
    }) => {
      const { data, error } = await supabase
        .from('leave_balances')
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
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
    },
  });
}

export function useUpdateLeaveBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      entitled_days: number;
      used_days: number;
      pending_days: number;
    }>) => {
      const { data, error } = await supabase
        .from('leave_balances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
    },
  });
}

// =============================================
// LEAVE REQUESTS
// =============================================

export function useLeaveRequests(filters?: {
  status?: LeaveRequestStatus;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['leave_requests', currentCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          employees_v2(
            id,
            first_name,
            last_name,
            document_number,
            avatar_url,
            employee_work_info(
              operation_center_id,
              is_current,
              operation_centers(id, name)
            )
          )
        `)
        .eq('company_id', currentCompanyId!)
        .order('requested_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.startDate) {
        query = query.gte('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('end_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useLeaveRequest(id: string) {
  return useQuery({
    queryKey: ['leave_request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as LeaveRequest;
    },
    enabled: !!id,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (request: {
      employee_id: string;
      leave_type: LeaveType;
      duration_type: LeaveDurationType;
      start_date: string;
      end_date: string;
      start_time?: string;
      end_time?: string;
      total_days: number;
      total_hours?: number;
      reason: string;
      document_url?: string;
      document_name?: string;
    }) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...request,
          company_id: currentCompanyId!,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update pending days in balance
      const year = parseDateOnlyOr(request.start_date, new Date()).getFullYear();
      
      // Get existing balance
      const { data: existingBalance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('leave_type', request.leave_type)
        .eq('year', year)
        .single();

      if (existingBalance) {
        await supabase
          .from('leave_balances')
          .update({
            pending_days: existingBalance.pending_days + request.total_days,
          })
          .eq('id', existingBalance.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
    },
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<LeaveRequest>) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
    },
  });
}

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, review_notes }: { id: string; review_notes?: string }) => {
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update request status
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'aprobado' as LeaveRequestStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          review_notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update balance: move from pending to used
      const year = parseDateOnlyOr(request.start_date, new Date()).getFullYear();
      const { data: existingBalance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('leave_type', request.leave_type)
        .eq('year', year)
        .single();

      if (existingBalance) {
        await supabase
          .from('leave_balances')
          .update({
            pending_days: Math.max(0, existingBalance.pending_days - request.total_days),
            used_days: existingBalance.used_days + request.total_days,
          })
          .eq('id', existingBalance.id);
      }

      // Cleanup conflicting shift assignments
      await cleanupShiftAssignments({
        employeeId: request.employee_id,
        startDate: request.start_date,
        endDate: request.end_date,
        absenceType: 'permiso',
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
      queryClient.invalidateQueries({ queryKey: ['shift_assignments'] });
    },
  });
}

export function useRejectLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, rejection_reason }: { id: string; rejection_reason: string }) => {
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update request status
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rechazado' as LeaveRequestStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Remove from pending days
      const year = parseDateOnlyOr(request.start_date, new Date()).getFullYear();
      const { data: existingBalance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('leave_type', request.leave_type)
        .eq('year', year)
        .single();

      if (existingBalance) {
        await supabase
          .from('leave_balances')
          .update({
            pending_days: Math.max(0, existingBalance.pending_days - request.total_days),
          })
          .eq('id', existingBalance.id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, cancellation_reason }: { id: string; cancellation_reason: string }) => {
      // First get the request details
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update request status
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'cancelado' as LeaveRequestStatus,
          cancelled_at: new Date().toISOString(),
          cancelled_by: user?.id,
          cancellation_reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Restore balance based on previous status
      const year = parseDateOnlyOr(request.start_date, new Date()).getFullYear();
      const { data: existingBalance } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', request.employee_id)
        .eq('leave_type', request.leave_type)
        .eq('year', year)
        .single();

      if (existingBalance) {
        if (request.status === 'pendiente') {
          await supabase
            .from('leave_balances')
            .update({
              pending_days: Math.max(0, existingBalance.pending_days - request.total_days),
            })
            .eq('id', existingBalance.id);
        } else if (request.status === 'aprobado') {
          await supabase
            .from('leave_balances')
            .update({
              used_days: Math.max(0, existingBalance.used_days - request.total_days),
            })
            .eq('id', existingBalance.id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave_requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave_balances'] });
    },
  });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Calculate business days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @param holidaysSet - Set of holiday dates in 'yyyy-MM-dd' format (from useHolidaysSet hook)
 */
export function calculateBusinessDays(startDate: Date, endDate: Date, holidaysSet?: Set<string>): number {
  let count = 0;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = format(current, 'yyyy-MM-dd');
    
    // Only Sundays are non-business days (dayOfWeek === 0)
    // Saturdays ARE business days for leaves/vacations
    if (dayOfWeek !== 0) {
      const isHoliday = holidaysSet ? holidaysSet.has(dateStr) : false;
      if (!isHoliday) {
        count++;
      }
    }
    
    current = addDays(current, 1);
  }
  
  return count;
}

// =============================================
// PENDING LEAVES ALERTS
// =============================================

export function usePendingLeavesCount() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['pending_leaves_count', currentCompanyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId!)
        .eq('status', 'pendiente');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentCompanyId,
  });
}
