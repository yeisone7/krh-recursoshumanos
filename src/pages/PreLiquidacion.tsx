import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calculator, AlertTriangle } from 'lucide-react';
import { PreLiquidationTable, PreLiquidationExport } from '@/components/payroll';
import { usePreLiquidation } from '@/hooks/usePreLiquidation';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { usePayrollNovelties } from '@/hooks/usePayrollNovelties';
import { useShiftAssignments } from '@/hooks/useSchedules';
import { useHolidaysSet } from '@/hooks/useHolidays';
import { useEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

export default function PreLiquidacion() {
  const { currentCompanyId } = useAuth();
  const today = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [calculated, setCalculated] = useState(false);

  const { data: config } = usePayrollConfig();
  const { data: employees = [] } = useEmployees();
  const { data: holidaysSet } = useHolidaysSet();
  const { data: assignments = [] } = useShiftAssignments({ startDate, endDate });
  const { data: novelties = [] } = usePayrollNovelties({ startDate, endDate });

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

  const preLiqData = calculated ? {
    assignments,
    holidays: holidaysSet || new Set<string>(),
    novelties: novelties.map(n => ({
      employee_id: n.employee_id,
      novelty_date: n.novelty_date,
      novelty_type: n.novelty_type,
      hours: n.hours,
    })),
    overtimeRecords,
    incapacities,
    vacations,
    leaves,
    employees: employees.map(e => ({
      id: e.id,
      first_name: e.first_name,
      last_name: e.last_name,
      document_number: e.document_number,
    })),
    config,
    filters: { startDate, endDate },
  } : null;

  const rows = usePreLiquidation(preLiqData);
  const warningCount = rows.filter(r => r.hasWarning).length;

  const handleCalculate = () => {
    if (!startDate || !endDate) {
      toast({ title: 'Seleccione un período válido', variant: 'destructive' });
      return;
    }
    setCalculated(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pre-Liquidación de Nómina</h1>
        <p className="text-muted-foreground">Cálculo de conceptos laborales por período</p>
      </div>

      {/* Period selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-2">
              <Label>Fecha inicio</Label>
              <Input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCalculated(false); }} />
            </div>
            <div className="space-y-2">
              <Label>Fecha fin</Label>
              <Input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCalculated(false); }} />
            </div>
            <Button onClick={handleCalculate}>
              <Calculator className="w-4 h-4 mr-2" />
              Calcular
            </Button>
            <PreLiquidationExport rows={rows} startDate={startDate} endDate={endDate} />
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
