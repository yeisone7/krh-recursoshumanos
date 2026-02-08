import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  OvertimeRecord,
  OvertimeExportBatch,
  OvertimeType,
  OvertimeStatus,
  OVERTIME_SURCHARGES,
} from '@/types/overtime';
import { format } from 'date-fns';

// =============================================
// OVERTIME CLASSIFICATION LOGIC
// =============================================

/**
 * Determines if a date is a Sunday or a holiday
 * @param date - The date to check
 * @param holidaysSet - Optional set of holiday dates in 'yyyy-MM-dd' format (from useHolidaysSet hook)
 */
export function isHolidayOrSunday(date: Date, holidaysSet?: Set<string>): { isSunday: boolean; isHoliday: boolean } {
  const dayOfWeek = date.getDay();
  const dateStr = format(date, 'yyyy-MM-dd');
  
  return {
    isSunday: dayOfWeek === 0,
    isHoliday: holidaysSet ? holidaysSet.has(dateStr) : false,
  };
}

/**
 * Determines if a time is nocturnal (9PM - 6AM in Colombia)
 */
export function isNocturnalTime(timeStr: string): boolean {
  const [hours] = timeStr.split(':').map(Number);
  return hours >= 21 || hours < 6;
}

/**
 * Classifies overtime type based on date, time, and whether it's actual extra hours
 * @param workDate - The date of the overtime work
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 * @param isExtraHours - Whether this is extra hours (true) or regular hours with surcharge (false)
 * @param holidaysSet - Optional set of holiday dates in 'yyyy-MM-dd' format (from useHolidaysSet hook)
 */
export function classifyOvertimeType(
  workDate: Date,
  startTime: string,
  endTime: string,
  isExtraHours: boolean = true,
  holidaysSet?: Set<string>
): OvertimeType {
  const { isSunday, isHoliday } = isHolidayOrSunday(workDate, holidaysSet);
  const isNocturnal = isNocturnalTime(startTime) || isNocturnalTime(endTime);

  if (isHoliday) {
    return isNocturnal ? 'festivo_nocturna' : 'festivo_diurna';
  }

  if (isSunday) {
    return isNocturnal ? 'dominical_nocturna' : 'dominical_diurna';
  }

  if (!isExtraHours && isNocturnal) {
    return 'recargo_nocturno';
  }

  return isNocturnal ? 'extra_nocturna' : 'extra_diurna';
}

/**
 * Calculates total hours between two time strings
 */
export function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * Calculates the total value of overtime
 */
export function calculateOvertimeValue(
  hours: number,
  hourlyRate: number,
  surchargePercentage: number
): number {
  const surchargeMultiplier = 1 + surchargePercentage / 100;
  return hours * hourlyRate * surchargeMultiplier;
}

// =============================================
// OVERTIME RECORDS HOOKS
// =============================================

export function useOvertimeRecords(filters?: {
  status?: OvertimeStatus;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  isExported?: boolean;
}) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['overtime_records', currentCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('overtime_records')
        .select(`
          *,
          employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .order('work_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.employeeId) {
        query = query.eq('employee_id', filters.employeeId);
      }
      if (filters?.startDate) {
        query = query.gte('work_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('work_date', filters.endDate);
      }
      if (filters?.isExported !== undefined) {
        query = query.eq('is_exported', filters.isExported);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OvertimeRecord[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateOvertimeRecord() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (record: {
      employee_id: string;
      work_date: string;
      start_time: string;
      end_time: string;
      reason?: string;
      hourly_rate?: number;
    }) => {
      const workDate = new Date(record.work_date);
      const totalHours = calculateHours(record.start_time, record.end_time);
      const overtimeType = classifyOvertimeType(workDate, record.start_time, record.end_time);
      const surchargePercentage = OVERTIME_SURCHARGES[overtimeType];
      
      let totalValue: number | undefined;
      if (record.hourly_rate) {
        totalValue = calculateOvertimeValue(totalHours, record.hourly_rate, surchargePercentage);
      }

      const { data, error } = await supabase
        .from('overtime_records')
        .insert({
          company_id: currentCompanyId!,
          employee_id: record.employee_id,
          work_date: record.work_date,
          start_time: record.start_time,
          end_time: record.end_time,
          total_hours: totalHours,
          overtime_type: overtimeType,
          surcharge_percentage: surchargePercentage,
          hourly_rate: record.hourly_rate,
          total_value: totalValue,
          reason: record.reason,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime_records'] });
      queryClient.invalidateQueries({ queryKey: ['overtime_summary'] });
    },
  });
}

export function useApproveOvertimeRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, approval_notes }: { id: string; approval_notes?: string }) => {
      const { data, error } = await supabase
        .from('overtime_records')
        .update({
          status: 'aprobado' as OvertimeStatus,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approval_notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime_records'] });
      queryClient.invalidateQueries({ queryKey: ['overtime_summary'] });
    },
  });
}

export function useRejectOvertimeRecord() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, rejected_reason }: { id: string; rejected_reason: string }) => {
      const { data, error } = await supabase
        .from('overtime_records')
        .update({
          status: 'rechazado' as OvertimeStatus,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejected_reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime_records'] });
      queryClient.invalidateQueries({ queryKey: ['overtime_summary'] });
    },
  });
}

export function useDeleteOvertimeRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('overtime_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime_records'] });
      queryClient.invalidateQueries({ queryKey: ['overtime_summary'] });
    },
  });
}

// =============================================
// EXPORT FUNCTIONALITY
// =============================================

export function useOvertimeExportBatches() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['overtime_export_batches', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overtime_export_batches')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('exported_at', { ascending: false });

      if (error) throw error;
      return data as OvertimeExportBatch[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateOvertimeExport() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
      payrollPeriod,
      notes,
    }: {
      startDate: string;
      endDate: string;
      payrollPeriod: string;
      notes?: string;
    }) => {
      // Get approved, non-exported records in date range
      const { data: records, error: fetchError } = await supabase
        .from('overtime_records')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .eq('status', 'aprobado')
        .eq('is_exported', false)
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      if (fetchError) throw fetchError;
      if (!records || records.length === 0) {
        throw new Error('No hay registros aprobados para exportar en el período seleccionado');
      }

      // Calculate totals
      const totalHours = records.reduce((sum, r) => sum + Number(r.total_hours), 0);
      const totalValue = records.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0);

      // Generate batch number
      const batchNumber = `EXP-${format(new Date(), 'yyyyMMdd-HHmmss')}`;

      // Create export batch
      const { data: batch, error: batchError } = await supabase
        .from('overtime_export_batches')
        .insert({
          company_id: currentCompanyId!,
          batch_number: batchNumber,
          payroll_period: payrollPeriod,
          start_date: startDate,
          end_date: endDate,
          total_records: records.length,
          total_hours: totalHours,
          total_value: totalValue,
          exported_by: user?.id,
          notes,
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Mark records as exported
      const recordIds = records.map(r => r.id);
      const { error: updateError } = await supabase
        .from('overtime_records')
        .update({
          is_exported: true,
          exported_at: new Date().toISOString(),
          export_batch_id: batch.id,
          payroll_period: payrollPeriod,
          status: 'pagado' as OvertimeStatus,
        })
        .in('id', recordIds);

      if (updateError) throw updateError;

      return { batch, records };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overtime_records'] });
      queryClient.invalidateQueries({ queryKey: ['overtime_export_batches'] });
      queryClient.invalidateQueries({ queryKey: ['overtime_summary'] });
    },
  });
}

// =============================================
// SUMMARY & STATS
// =============================================

export function useOvertimeSummary(startDate?: string, endDate?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['overtime_summary', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('overtime_records')
        .select('*')
        .eq('company_id', currentCompanyId!);

      if (startDate) {
        query = query.gte('work_date', startDate);
      }
      if (endDate) {
        query = query.lte('work_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const records = data as OvertimeRecord[];

      return {
        totalRecords: records.length,
        totalHours: records.reduce((sum, r) => sum + Number(r.total_hours), 0),
        totalValue: records.reduce((sum, r) => sum + (Number(r.total_value) || 0), 0),
        pendingCount: records.filter(r => r.status === 'pendiente').length,
        approvedCount: records.filter(r => r.status === 'aprobado').length,
        byType: records.reduce((acc, r) => {
          if (!acc[r.overtime_type]) {
            acc[r.overtime_type] = { count: 0, hours: 0, value: 0 };
          }
          acc[r.overtime_type].count++;
          acc[r.overtime_type].hours += Number(r.total_hours);
          acc[r.overtime_type].value += Number(r.total_value) || 0;
          return acc;
        }, {} as Record<OvertimeType, { count: number; hours: number; value: number }>),
      };
    },
    enabled: !!currentCompanyId,
  });
}

export function usePendingOvertimeCount() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['pending_overtime_count', currentCompanyId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('overtime_records')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId!)
        .eq('status', 'pendiente');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!currentCompanyId,
  });
}
