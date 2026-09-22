import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { Calculator, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { PreLiquidationTable, PreLiquidationExport } from '@/components/payroll';
import { usePreLiquidation } from '@/hooks/usePreLiquidation';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { usePayrollNovelties } from '@/hooks/usePayrollNovelties';
import { useShiftAssignments } from '@/hooks/useSchedules';
import { useHolidaysSet } from '@/hooks/useHolidays';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { getEmployeeOperationCenterIds } from '@/lib/scheduleCenterScope';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const REST_DAY_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  sábado: 'Sábado',
  domingo: 'Domingo',
};

function formatRestDay(restDay?: string | null) {
  if (!restDay) return 'Sin asignar';
  return REST_DAY_LABELS[restDay.trim().toLowerCase()] || restDay;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado';
}

export default function PreLiquidacion() {
  const { currentCompanyId, user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [calculated, setCalculated] = useState(false);
  const [selectedCenterIds, setSelectedCenterIds] = useState<string[]>([]);

  const { data: config } = usePayrollConfig();
  const { data: employees = [] } = useEmployees();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: holidaysSet } = useHolidaysSet();
  const { data: assignments = [] } = useShiftAssignments({ startDate, endDate });
  const { data: novelties = [] } = usePayrollNovelties({ startDate, endDate });

  useEffect(() => {
    setSelectedCenterIds([]);
  }, [currentCompanyId]);

  const { data: employeeSchedules = [] } = useQuery({
    queryKey: ['employee_schedules_for_preliq', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_schedule')
        .select('employee_id, employment_cycle_id, rest_day, shift_type_id, shift_types(id, name)')
        .eq('company_id', currentCompanyId!)
        .eq('is_current', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  // Fetch overtime records
  const { data: overtimeRecords = [] } = useQuery({
    queryKey: ['overtime_for_preliq', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('overtime_records')
        .select('employee_id, work_date, overtime_type, total_hours, status')
        .eq('company_id', currentCompanyId!)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .in('status', ['aprobado', 'pagado']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  // Fetch incapacities
  const { data: incapacities = [] } = useQuery({
    queryKey: ['incapacities_for_preliq', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_incapacities')
        .select('employee_id, start_date, end_date')
        .eq('company_id', currentCompanyId!)
        .lte('start_date', endDate)
        .gte('end_date', startDate);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  // Fetch vacations
  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations_for_preliq', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vacation_requests')
        .select('employee_id, start_date, end_date, status')
        .eq('company_id', currentCompanyId!)
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .in('status', ['aprobado']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  // Fetch leaves
  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves_for_preliq', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, status')
        .eq('company_id', currentCompanyId!)
        .lte('start_date', endDate)
        .gte('end_date', startDate)
        .in('status', ['aprobado']);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  // Fetch active loans
  const { data: activeLoans = [] } = useQuery({
    queryKey: ['loans_for_preliq', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_loans')
        .select('id, employee_id, loan_type, description, installment_amount, status')
        .eq('company_id', currentCompanyId!)
        .eq('status', 'activo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  // Fetch active deductions
  const { data: activeDeductions = [] } = useQuery({
    queryKey: ['deductions_for_preliq', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_deductions')
        .select('id, employee_id, deduction_type, description, amount, is_percentage, percentage_value, status')
        .eq('company_id', currentCompanyId!)
        .eq('status', 'activo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompanyId && calculated,
  });

  const operationCenterNameById = useMemo(
    () => new Map(operationCenters.map(center => [center.id, center.name])),
    [operationCenters],
  );

  const employeeScheduleIndexes = useMemo(() => {
    const byEmployeeId = new Map<string, typeof employeeSchedules[number]>();
    const byEmployeeCycle = new Map<string, typeof employeeSchedules[number]>();

    employeeSchedules.forEach(schedule => {
      if (!byEmployeeId.has(schedule.employee_id)) {
        byEmployeeId.set(schedule.employee_id, schedule);
      }
      if (schedule.employment_cycle_id) {
        byEmployeeCycle.set(`${schedule.employee_id}_${schedule.employment_cycle_id}`, schedule);
      }
    });

    return { byEmployeeId, byEmployeeCycle };
  }, [employeeSchedules]);

  const preLiqData = useMemo(() => calculated ? {
    assignments,
    holidays: holidaysSet || new Set<string>(),
    novelties: novelties.map(n => ({
      employee_id: n.employee_id,
      novelty_date: n.novelty_date,
      novelty_type: n.novelty_type,
      hours: n.hours,
      status: n.status,
    })),
    overtimeRecords,
    incapacities,
    vacations,
    leaves,
    loans: activeLoans,
    deductions: activeDeductions,
    employees: employees.map(e => {
      const centerIds = getEmployeeOperationCenterIds(e);
      const centerNames = centerIds
        .map(centerId => operationCenterNameById.get(centerId))
        .filter((name): name is string => Boolean(name));
      const cycleKey = e.active_employment_cycle?.id
        ? `${e.id}_${e.active_employment_cycle.id}`
        : null;
      const schedule = (cycleKey ? employeeScheduleIndexes.byEmployeeCycle.get(cycleKey) : null)
        || employeeScheduleIndexes.byEmployeeId.get(e.id);

      return {
        id: e.id,
        first_name: e.first_name,
        last_name: e.last_name,
        document_number: e.document_number,
        operationCenterIds: centerIds,
        operationCenterName: centerNames.length > 0 ? centerNames.join(', ') : 'Sin asignar',
        restDay: formatRestDay(schedule?.rest_day),
        shiftName: schedule?.shift_types?.name || 'Sin asignar',
      };
    }),
    config,
    filters: { startDate, endDate },
  } : null, [
    activeDeductions,
    activeLoans,
    assignments,
    calculated,
    config,
    employeeScheduleIndexes,
    employees,
    endDate,
    holidaysSet,
    incapacities,
    leaves,
    novelties,
    operationCenterNameById,
    overtimeRecords,
    startDate,
    vacations,
  ]);

  const allRows = usePreLiquidation(preLiqData);
  const rows = selectedCenterIds.length === 0
    ? allRows
    : allRows.filter(row => row.operationCenterIds.some(centerId => selectedCenterIds.includes(centerId)));
  const warningCount = rows.filter(r => r.hasWarning).length;
  const rowsWithDeductions = allRows.filter(r => r.totalDeducciones > 0);

  const handleCalculate = () => {
    if (!startDate || !endDate) {
      toast({ title: 'Seleccione un período válido', variant: 'destructive' });
      return;
    }
    setCalculated(true);
  };

  // Close period mutation — registers loan payments for all active loans
  const closePeriodMutation = useMutation({
    mutationFn: async () => {
      const period = `${startDate} a ${endDate}`;
      const promises: Promise<void>[] = [];

      for (const row of allRows) {
        for (const loan of row.loanDetail) {
          promises.push((async () => {
            // Get loan current state
            const { data: loanData, error: loanErr } = await supabase
              .from('employee_loans')
              .select('paid_installments, paid_amount, total_with_interest, installments')
              .eq('id', loan.loanId)
              .single();
            if (loanErr) throw loanErr;

            const newPaidInstallments = (loanData.paid_installments || 0) + 1;
            const newPaidAmount = Number(loanData.paid_amount || 0) + loan.installmentAmount;
            const newBalance = Number(loanData.total_with_interest) - newPaidAmount;
            const newStatus = newPaidInstallments >= loanData.installments ? 'pagado' : 'activo';

            // Insert payment
            const { error: payErr } = await supabase
              .from('employee_loan_payments')
              .insert({
                company_id: currentCompanyId!,
                loan_id: loan.loanId,
                payment_number: newPaidInstallments,
                payment_date: endDate,
                amount: loan.installmentAmount,
                balance_after: Math.max(0, newBalance),
                payroll_period: period,
                notes: 'Descuento automático por nómina',
                created_by: user?.id,
              });
            if (payErr) throw payErr;

            // Update loan
            const { error: updErr } = await supabase
              .from('employee_loans')
              .update({
                paid_installments: newPaidInstallments,
                paid_amount: newPaidAmount,
                remaining_balance: Math.max(0, newBalance),
                status: newStatus,
              })
              .eq('id', loan.loanId);
            if (updErr) throw updErr;
          })());
        }
      }

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan_payments'] });
      queryClient.invalidateQueries({ queryKey: ['loans_for_preliq'] });
      toast({ title: 'Período cerrado exitosamente', description: 'Se registraron los descuentos de préstamos automáticamente.' });
    },
    onError: (error: unknown) => {
      toast({ title: 'Error al cerrar período', description: getErrorMessage(error), variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pre-Liquidación de Nómina</h1>
        <p className="text-muted-foreground">Cálculo de conceptos laborales por período</p>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input className="w-full" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCalculated(false); }} />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input className="w-full" type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCalculated(false); }} />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:w-72">
              <Label>Centros de operación</Label>
              <MultiSelect
                options={operationCenters.map(center => ({ value: center.id, label: center.name }))}
                value={selectedCenterIds}
                onChange={setSelectedCenterIds}
                placeholder="Todos los centros"
              />
            </div>
            <Button onClick={handleCalculate} className="w-full lg:w-auto">
              <Calculator className="w-4 h-4 mr-2" />
              Calcular
            </Button>
            <div className="w-full lg:w-auto">
              <PreLiquidationExport rows={rows} startDate={startDate} endDate={endDate} />
            </div>
            
            {/* Close period button */}
            {rows.length > 0 && rowsWithDeductions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default" disabled={closePeriodMutation.isPending} className="w-full lg:w-auto">
                    {closePeriodMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Cerrar Período
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Cerrar período de nómina?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción registrará automáticamente los pagos de cuotas de préstamos para {rowsWithDeductions.length} empleado(s) con deducciones activas en el período {startDate} a {endDate}. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => closePeriodMutation.mutate()}>
                      Confirmar Cierre
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {warningCount > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {warningCount} empleado(s) con inconsistencias: total de días supera los días del período.
          </span>
        </div>
      )}

      {/* Config summary */}
      {config && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">Jornada: {config.daily_hours}h/día</Badge>
          <Badge variant="outline">Máx semanal: {config.max_weekly_hours}h</Badge>
          <Badge variant="outline">Nocturno: {config.night_start?.substring(0, 5)}-{config.night_end?.substring(0, 5)}</Badge>
        </div>
      )}

      {/* Results */}
      <PreLiquidationTable
        rows={rows}
        displayUnit={config?.display_unit as 'hours' | 'days' || 'days'}
        dailyHours={config?.daily_hours || 8}
      />
    </div>
  );
}
