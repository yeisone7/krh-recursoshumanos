import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useShiftCycles, useEmployeeTimeConfigs, useCreateBulkShiftAssignments } from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const bulkSchema = z.object({
  start_date: z.date({ required_error: 'Fecha de inicio requerida' }),
  end_date: z.date({ required_error: 'Fecha de fin requerida' }),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['end_date'],
});

type BulkFormData = z.infer<typeof bulkSchema>;

interface BulkCycleGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkCycleGeneratorDialog({ open, onOpenChange }: BulkCycleGeneratorDialogProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [generatedAssignments, setGeneratedAssignments] = useState<{ employee_id: string; shift_id: string; assignment_date: string }[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);

  const { currentCompanyId } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { data: shiftCycles = [] } = useShiftCycles();
  const { data: timeConfigs = [] } = useEmployeeTimeConfigs();
  const createBulkAssignments = useCreateBulkShiftAssignments();

  const form = useForm<BulkFormData>({
    resolver: zodResolver(bulkSchema),
    defaultValues: {
      start_date: new Date(),
      end_date: addDays(new Date(), 14),
    },
  });

  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');

  // Get all employees with active shift mode
  const shiftEmployeesWithConfig = useMemo(() => {
    return timeConfigs
      .filter(tc => tc.is_active && tc.mode === 'shift' && tc.shift_cycle_id)
      .map(tc => {
        const emp = employees.find(e => e.id === tc.employee_id);
        const cycle = shiftCycles.find(c => c.id === tc.shift_cycle_id);
        return emp && cycle ? { employee: emp, config: tc, cycle } : null;
      })
      .filter(Boolean) as { employee: any; config: any; cycle: any }[];
  }, [timeConfigs, employees, shiftCycles]);

  const employeeIds = useMemo(() => shiftEmployeesWithConfig.map(e => e.employee.id), [shiftEmployeesWithConfig]);

  // Fetch absences
  const { data: absences = [] } = useQuery({
    queryKey: ['bulk_absences', currentCompanyId, startDate, endDate, employeeIds],
    queryFn: async () => {
      if (!startDate || !endDate || employeeIds.length === 0) return [];
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const [vacations, leaves, incapacities] = await Promise.all([
        supabase.from('vacation_requests').select('employee_id, start_date, end_date')
          .in('employee_id', employeeIds).in('status', ['aprobado', 'en_curso'])
          .gte('end_date', startStr).lte('start_date', endStr),
        supabase.from('leave_requests').select('employee_id, start_date, end_date')
          .in('employee_id', employeeIds).eq('status', 'aprobado')
          .gte('end_date', startStr).lte('start_date', endStr),
        supabase.from('employee_incapacities').select('employee_id, start_date, end_date')
          .in('employee_id', employeeIds)
          .gte('end_date', startStr).lte('start_date', endStr),
      ]);

      return [...(vacations.data || []), ...(leaves.data || []), ...(incapacities.data || [])];
    },
    enabled: employeeIds.length > 0 && !!startDate && !!endDate,
  });

  const totalDays = startDate && endDate
    ? eachDayOfInterval({ start: startDate, end: endDate }).length
    : 0;

  const generatePreview = () => {
    if (!startDate || !endDate) return;

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const assignments: { employee_id: string; shift_id: string; assignment_date: string }[] = [];
    let skipped = 0;

    shiftEmployeesWithConfig.forEach(({ employee, config, cycle }) => {
      if (!cycle.cycle_days || cycle.cycle_days.length === 0) return;

      const cycleDays = cycle.cycle_days.sort((a: any, b: any) => a.day_number - b.day_number);
      const totalCycleDays = cycle.total_days;
      const cycleStartDate = config.cycle_start_date ? parseISO(config.cycle_start_date) : startDate;

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        const hasAbsence = absences.some(a => {
          const absStart = parseISO(a.start_date);
          const absEnd = parseISO(a.end_date);
          return a.employee_id === employee.id && isWithinInterval(day, { start: absStart, end: absEnd });
        });

        const daysDiff = Math.floor((day.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const cycleDayNumber = ((daysDiff % totalCycleDays) + totalCycleDays) % totalCycleDays + 1;
        const cycleDay = cycleDays.find((cd: any) => cd.day_number === cycleDayNumber);
        if (!cycleDay) return;

        const shift = cycleDay.shifts;
        if (hasAbsence && shift && !shift.is_rest_day) {
          skipped++;
          return;
        }

        assignments.push({
          employee_id: employee.id,
          shift_id: cycleDay.shift_id,
          assignment_date: dateStr,
        });
      });
    });

    setGeneratedAssignments(assignments);
    setSkippedCount(skipped);
    setPreviewMode(true);

    if (skipped > 0) {
      toast.info(`Se omitieron ${skipped} asignación(es) por novedades activas`);
    }
  };

  const handleGenerate = async () => {
    if (generatedAssignments.length === 0) return;
    try {
      await createBulkAssignments.mutateAsync(
        generatedAssignments.map(a => ({ ...a, source: 'cycle' as const }))
      );
      toast.success(`${generatedAssignments.length} asignación(es) generada(s) correctamente`);
      onOpenChange(false);
      form.reset();
      setPreviewMode(false);
      setGeneratedAssignments([]);
    } catch (error: any) {
      toast.error('Error al generar asignaciones', { description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) { setPreviewMode(false); setGeneratedAssignments([]); }
    }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-start sm:items-center gap-2 text-base sm:text-lg">
            <Users className="w-5 h-5 text-primary" />
            Generar Ciclo a Todos los Empleados
          </DialogTitle>
          <DialogDescription>
            Genera automáticamente asignaciones usando el ciclo configurado de cada empleado.
          </DialogDescription>
        </DialogHeader>

        {!previewMode ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(generatePreview)} className="space-y-4 overflow-y-auto min-h-0 pr-1">
              {/* Summary */}
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  Se encontraron <strong>{shiftEmployeesWithConfig.length}</strong> empleado(s) con modalidad de turnos y ciclo asignado.
                  {shiftEmployeesWithConfig.length === 0 && (
                    <span className="block text-muted-foreground mt-1">
                      No hay empleados con ciclo de rotación configurado.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Employee list preview */}
              {shiftEmployeesWithConfig.length > 0 && (
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {shiftEmployeesWithConfig.map(({ employee, cycle }) => (
                    <div key={employee.id} className="flex items-start sm:items-center justify-between gap-2 text-sm py-1 px-2 hover:bg-muted rounded">
                      <span className="min-w-0 truncate">{getEmployeeFullName(employee)}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{cycle.name}</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Inicio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha Fin</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < (startDate || new Date())} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {totalDays > 0 && shiftEmployeesWithConfig.length > 0 && (
                <Alert>
                  <AlertDescription>
                    Se generarán aproximadamente <strong>{totalDays * shiftEmployeesWithConfig.length}</strong> asignaciones
                    ({shiftEmployeesWithConfig.length} empleados × {totalDays} días)
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={shiftEmployeesWithConfig.length === 0}>Vista Previa</Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 overflow-y-auto min-h-0 pr-1">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Se generarán <strong>{generatedAssignments.length}</strong> asignaciones de turno.
              </AlertDescription>
            </Alert>

            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p><strong>Empleados:</strong> {shiftEmployeesWithConfig.length}</p>
              <p><strong>Periodo:</strong> {startDate && format(startDate, 'dd/MM/yyyy')} - {endDate && format(endDate, 'dd/MM/yyyy')}</p>
              {skippedCount > 0 && <p><strong>Omitidas por novedades:</strong> {skippedCount}</p>}
            </div>

            {absences.length > 0 && (
              <Alert variant="default" className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Se detectaron novedades activas. Los turnos laborales en esas fechas serán omitidos automáticamente.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setPreviewMode(false)}>Volver</Button>
              <Button className="w-full sm:w-auto" onClick={handleGenerate} disabled={createBulkAssignments.isPending || generatedAssignments.length === 0}>
                {createBulkAssignments.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Generación
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
