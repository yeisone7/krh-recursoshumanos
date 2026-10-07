import { supabase } from '@/integrations/supabase/client';
import { fetchAllAnalyticsRows } from './employeeAnalyticsData';
import { buildCyclePreview, type CycleGenerationRequest, type CycleAbsence, type CycleAssignment } from './cycleGeneration';
import { writePayrollRecords } from './payrollCorrections';
import type { EmployeeTimeConfig, ShiftCycle } from '@/types/schedule';

export async function prepareCycleGeneration(request: CycleGenerationRequest) {
  if (!request.companyId || !request.employeeIds.length) throw new Error('Selecciona una empresa y al menos un empleado.');
  const configs: EmployeeTimeConfig[] = [], absences: CycleAbsence[] = [], existing: CycleAssignment[] = [], activeEmployeeIds: string[] = [];
  const cycles = await fetchAllAnalyticsRows<ShiftCycle>(async (from, to) => {
    const result = await supabase.from('shift_cycles').select('*, cycle_days:shift_cycle_days(*, shifts(*))')
      .eq('company_id', request.companyId).order('id').range(from, to);
    return { data: result.data as ShiftCycle[], error: result.error };
  });
  for (let index = 0; index < request.employeeIds.length; index += 100) {
    const ids = request.employeeIds.slice(index, index + 100);
    const rows = await fetchAllAnalyticsRows(async (from, to) => supabase.from('employees_v2')
      .select('id').eq('company_id', request.companyId).in('id', ids).eq('is_active', true).eq('status', 'active').order('id').range(from, to));
    activeEmployeeIds.push(...rows.map(row => row.id));
    const configRows = await fetchAllAnalyticsRows(async (from, to) => supabase.from('employee_time_config')
      .select('*').eq('company_id', request.companyId).in('employee_id', ids).lte('start_date', request.end).order('id').range(from, to));
    configs.push(...configRows as unknown as EmployeeTimeConfig[]);
    const assignments = await fetchAllAnalyticsRows(async (from, to) => supabase.from('employee_shift_assignments')
      .select('employee_id,shift_id,assignment_date').eq('company_id', request.companyId).in('employee_id', ids)
      .gte('assignment_date', request.start).lte('assignment_date', request.end).order('id').range(from, to));
    existing.push(...assignments);
    for (const table of ['vacation_requests', 'leave_requests', 'employee_incapacities'] as const) {
      const records = await fetchAllAnalyticsRows<CycleAbsence>(async (from, to) => {
        let query = supabase.from(table).select('employee_id,start_date,end_date').eq('company_id', request.companyId)
          .in('employee_id', ids).gte('end_date', request.start).lte('start_date', request.end);
        if (table === 'vacation_requests') query = query.in('status', ['aprobado', 'en_curso']);
        if (table === 'leave_requests') query = query.eq('status', 'aprobado');
        const result = await query.order('id').range(from, to);
        return { data: result.data as CycleAbsence[], error: result.error };
      });
      absences.push(...records);
    }
  }
  return buildCyclePreview(request, { cycles, configs, absences, existing, activeEmployeeIds });
}

export async function saveCycleAssignments(companyId: string, assignments: CycleAssignment[]) {
  try {
    return await writePayrollRecords(companyId, assignments.map(values => ({ module: 'jornadas', action: 'create', expected: null, values: { ...values, source: 'cycle' } })));
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && ['23505', '40001'].includes(String(error.code))) {
      throw new Error('La programación cambió después de la vista previa. Vuelve a generar la vista previa; las jornadas existentes se conservarán.');
    }
    throw error;
  }
}
