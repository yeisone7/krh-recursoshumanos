import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, addDays, subDays } from 'date-fns';
import { parseDateOnlyOr } from '@/lib/dateOnly';

export type CalendarEventType = 'vacation' | 'leave' | 'incapacity' | 'contract' | 'training';

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  employeeId?: string;
  employeeName?: string;
  status?: string;
  color: string;
  bgColor: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

const EVENT_STYLES: Record<CalendarEventType, { color: string; bgColor: string; label: string }> = {
  vacation: { color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/50', label: 'Vacaciones' },
  leave: { color: 'text-violet-700 dark:text-violet-300', bgColor: 'bg-violet-100 dark:bg-violet-900/50', label: 'Permisos' },
  incapacity: { color: 'text-rose-700 dark:text-rose-300', bgColor: 'bg-rose-100 dark:bg-rose-900/50', label: 'Incapacidades' },
  contract: { color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/50', label: 'Contratos' },
  training: { color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/50', label: 'Capacitaciones' },
};

export function useUnifiedCalendar(
  year: number,
  month: number,
  view: 'month' | 'week' | 'agenda' = 'month',
  selectedDate: Date = new Date(),
  enabledTypes: CalendarEventType[] = ['vacation', 'leave', 'incapacity', 'contract', 'training']
) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['unified-calendar', currentCompanyId, year, month, view, selectedDate.toISOString(), enabledTypes],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      // Calculate date range based on view
      let rangeStart: Date;
      let rangeEnd: Date;

      if (view === 'week') {
        rangeStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      } else {
        const monthDate = new Date(year, month, 1);
        rangeStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
        rangeEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
      }

      // Add buffer for events that might span the boundaries
      const queryStart = format(subDays(rangeStart, 7), 'yyyy-MM-dd');
      const queryEnd = format(addDays(rangeEnd, 7), 'yyyy-MM-dd');

      const events: CalendarEvent[] = [];

      // Fetch vacations
      if (enabledTypes.includes('vacation')) {
        const { data: vacations } = await supabase
          .from('vacation_requests')
          .select(`
            id, start_date, end_date, request_type, status, business_days,
            employee:employees_v2(id, first_name, last_name)
          `)
          .eq('company_id', currentCompanyId)
          .in('status', ['aprobado', 'en_curso', 'completado'])
          .or(`start_date.lte.${queryEnd},end_date.gte.${queryStart}`);

        if (vacations) {
          for (const v of vacations) {
            const style = EVENT_STYLES.vacation;
            const employee = v.employee as { id: string; first_name: string; last_name: string } | null;
            events.push({
              id: `vacation-${v.id}`,
              type: 'vacation',
              title: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              description: `Vacaciones (${v.business_days} días)`,
              startDate: parseDateOnlyOr(v.start_date, new Date()),
              endDate: parseDateOnlyOr(v.end_date, new Date()),
              employeeId: employee?.id,
              employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              status: v.status,
              color: style.color,
              bgColor: style.bgColor,
              actionUrl: '/vacaciones',
              metadata: { requestType: v.request_type },
            });
          }
        }
      }

      // Fetch leaves
      if (enabledTypes.includes('leave')) {
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select(`
            id, start_date, end_date, leave_type, status, total_days, reason,
            employee:employees_v2(id, first_name, last_name)
          `)
          .eq('company_id', currentCompanyId)
          .in('status', ['aprobado'])
          .or(`start_date.lte.${queryEnd},end_date.gte.${queryStart}`);

        if (leaves) {
          const leaveTypeLabels: Record<string, string> = {
            calamidad_domestica: 'Calamidad',
            cita_medica: 'Cita médica',
            licencia_maternidad: 'Maternidad',
            licencia_paternidad: 'Paternidad',
            licencia_luto: 'Luto',
            permiso_sindical: 'Sindical',
            licencia_no_remunerada: 'No remunerada',
            otro: 'Otro',
          };
          
          for (const l of leaves) {
            const style = EVENT_STYLES.leave;
            const employee = l.employee as { id: string; first_name: string; last_name: string } | null;
            events.push({
              id: `leave-${l.id}`,
              type: 'leave',
              title: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              description: leaveTypeLabels[l.leave_type] || l.leave_type,
              startDate: parseDateOnlyOr(l.start_date, new Date()),
              endDate: parseDateOnlyOr(l.end_date, new Date()),
              employeeId: employee?.id,
              employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              status: l.status,
              color: style.color,
              bgColor: style.bgColor,
              actionUrl: '/permisos',
              metadata: { leaveType: l.leave_type, reason: l.reason },
            });
          }
        }
      }

      // Fetch incapacities
      if (enabledTypes.includes('incapacity')) {
        const { data: incapacities } = await supabase
          .from('employee_incapacities')
          .select(`
            id, start_date, end_date, diagnosis, origin, total_days,
            employee:employees_v2(id, first_name, last_name)
          `)
          .eq('company_id', currentCompanyId)
          .or(`start_date.lte.${queryEnd},end_date.gte.${queryStart}`);

        if (incapacities) {
          for (const i of incapacities) {
            const style = EVENT_STYLES.incapacity;
            const employee = i.employee as { id: string; first_name: string; last_name: string } | null;
            events.push({
              id: `incapacity-${i.id}`,
              type: 'incapacity',
              title: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              description: `${i.origin === 'laboral' ? 'Laboral' : 'Común'} - ${i.diagnosis}`,
              startDate: parseDateOnlyOr(i.start_date, new Date()),
              endDate: parseDateOnlyOr(i.end_date, new Date()),
              employeeId: employee?.id,
              employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              color: style.color,
              bgColor: style.bgColor,
              actionUrl: '/incapacidades',
              metadata: { diagnosis: i.diagnosis, origin: i.origin, totalDays: i.total_days },
            });
          }
        }
      }

      // Fetch contract expirations (only end dates within range)
      if (enabledTypes.includes('contract')) {
        const { data: contracts } = await supabase
          .from('contracts')
          .select(`
            id, start_date, end_date, contract_type, is_terminated,
            employee_id
          `)
          .eq('is_terminated', false)
          .not('end_date', 'is', null)
          .gte('end_date', queryStart)
          .lte('end_date', queryEnd);

        if (contracts && contracts.length > 0) {
          // Fetch employee names from employees_v2
          const employeeIds = [...new Set(contracts.map(c => c.employee_id))];
          const { data: employees } = await supabase
            .from('employees_v2')
            .select('id, first_name, last_name')
            .in('id', employeeIds);

          const employeeMap = new Map(employees?.map(e => [e.id, e]) || []);

          const contractTypeLabels: Record<string, string> = {
            fijo: 'Término fijo',
            indefinido: 'Indefinido',
            obra_labor: 'Obra/Labor',
            aprendizaje: 'Aprendizaje',
            servicios: 'Servicios',
          };
          
          for (const c of contracts) {
            if (!c.end_date) continue;
            const style = EVENT_STYLES.contract;
            const employee = employeeMap.get(c.employee_id);
            // Contract expiration is a single-day event
            events.push({
              id: `contract-${c.id}`,
              type: 'contract',
              title: `Vence: ${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              description: `Contrato ${contractTypeLabels[c.contract_type] || c.contract_type}`,
              startDate: parseDateOnlyOr(c.end_date, new Date()),
              endDate: parseDateOnlyOr(c.end_date, new Date()),
              employeeId: employee?.id,
              employeeName: `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim(),
              color: style.color,
              bgColor: style.bgColor,
              actionUrl: '/contratos',
              metadata: { contractType: c.contract_type },
            });
          }
        }
      }

      // Fetch training sessions
      if (enabledTypes.includes('training')) {
        const { data: trainings } = await supabase
          .from('training_sessions')
          .select(`
            id, start_date, end_date, status, location, instructor_name,
            course:training_courses(id, name)
          `)
          .eq('company_id', currentCompanyId)
          .in('status', ['programado', 'en_curso', 'completado'])
          .or(`start_date.lte.${queryEnd},end_date.gte.${queryStart}`);

        if (trainings) {
          for (const t of trainings) {
            const style = EVENT_STYLES.training;
            const course = t.course as { id: string; name: string } | null;
            events.push({
              id: `training-${t.id}`,
              type: 'training',
              title: course?.name || 'Capacitación',
              description: t.instructor_name ? `Instructor: ${t.instructor_name}` : (t.location || 'Sin ubicación'),
              startDate: parseDateOnlyOr(t.start_date, new Date()),
              endDate: parseDateOnlyOr(t.end_date, new Date()),
              status: t.status,
              color: style.color,
              bgColor: style.bgColor,
              actionUrl: '/capacitaciones',
              metadata: { location: t.location, instructor: t.instructor_name },
            });
          }
        }
      }

      return events;
    },
    enabled: !!currentCompanyId,
  });
}

export { EVENT_STYLES };
