import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useShiftCycles, useCreateBulkShiftAssignments } from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeTimeConfigs } from '@/hooks/useSchedules';
import { getEmployeeFullName } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const generatorSchema = z.object({
  shift_cycle_id: z.string().min(1, 'Seleccione un ciclo'),
  employee_ids: z.array(z.string()).min(1, 'Seleccione al menos un empleado'),
  start_date: z.date({ required_error: 'Fecha de inicio requerida' }),
  end_date: z.date({ required_error: 'Fecha de fin requerida' }),
}).refine((data) => data.end_date >= data.start_date, {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['end_date'],
});

type GeneratorFormData = z.infer<typeof generatorSchema>;

interface CycleGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeIds?: string[];
}

export function CycleGeneratorDialog({
  open,
  onOpenChange,
  preselectedEmployeeIds = [],
}: CycleGeneratorDialogProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [generatedAssignments, setGeneratedAssignments] = useState<{ employee_id: string; shift_id: string; assignment_date: string }[]>([]);
  
  const { currentCompanyId } = useAuth();
  const { data: employees = [] } = useEmployees();
  const { data: shiftCycles = [] } = useShiftCycles();
  const { data: timeConfigs = [] } = useEmployeeTimeConfigs();
  const createBulkAssignments = useCreateBulkShiftAssignments();

  const form = useForm<GeneratorFormData>({
    resolver: zodResolver(generatorSchema),
    defaultValues: {
      shift_cycle_id: '',
      employee_ids: preselectedEmployeeIds,
      start_date: new Date(),
      end_date: addDays(new Date(), 14),
    },
  });

  const selectedCycleId = form.watch('shift_cycle_id');
  const selectedEmployeeIds = form.watch('employee_ids');
  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');

  // Get employees with shift mode configured
  const shiftEmployees = useMemo(() => {
    const configuredIds = new Set(
      timeConfigs
        .filter(tc => tc.is_active && tc.mode === 'shift')
        .map(tc => tc.employee_id)
    );
    return employees.filter(e => e.is_active && configuredIds.has(e.id));
  }, [employees, timeConfigs]);

  // Fetch absences for validation
  const { data: absences = [] } = useQuery({
    queryKey: ['employee_absences_generator', currentCompanyId, startDate, endDate, selectedEmployeeIds],
    queryFn: async () => {
      if (!startDate || !endDate || selectedEmployeeIds.length === 0) return [];
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: vacations } = await supabase
        .from('vacation_requests')
        .select('employee_id, start_date, end_date')
        .in('employee_id', selectedEmployeeIds)
        .in('status', ['aprobado', 'en_curso'])
        .gte('end_date', startStr)
        .lte('start_date', endStr);

      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date')
        .in('employee_id', selectedEmployeeIds)
        .eq('status', 'aprobado')
        .gte('end_date', startStr)
        .lte('start_date', endStr);

      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('employee_id, start_date, end_date')
        .in('employee_id', selectedEmployeeIds)
        .gte('end_date', startStr)
        .lte('start_date', endStr);

      return [...(vacations || []), ...(leaves || []), ...(incapacities || [])];
    },
    enabled: selectedEmployeeIds.length > 0 && !!startDate && !!endDate,
  });

  const selectedCycle = shiftCycles.find(c => c.id === selectedCycleId);

  const generatePreview = () => {
    if (!selectedCycle?.cycle_days || !startDate || !endDate) return;

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const cycleDays = selectedCycle.cycle_days.sort((a, b) => a.day_number - b.day_number);
    const totalCycleDays = selectedCycle.total_days;

    const assignments: { employee_id: string; shift_id: string; assignment_date: string }[] = [];
    let skippedDueToAbsence = 0;

    selectedEmployeeIds.forEach(employeeId => {
      // Get the employee's cycle_start_date from their config
      const config = timeConfigs.find(tc => tc.employee_id === employeeId && tc.is_active && tc.mode === 'shift');
      const cycleStartDate = config?.cycle_start_date ? parseISO(config.cycle_start_date) : startDate;

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        
        // Check for absences
        const hasAbsence = absences.some(a => {
          const absStart = parseISO(a.start_date);
          const absEnd = parseISO(a.end_date);
          return a.employee_id === employeeId && isWithinInterval(day, { start: absStart, end: absEnd });
        });

        // Calculate which day of the cycle this is
        const daysDiff = Math.floor((day.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const cycleDayNumber = ((daysDiff % totalCycleDays) + totalCycleDays) % totalCycleDays + 1;
        
        const cycleDay = cycleDays.find(cd => cd.day_number === cycleDayNumber);
        if (!cycleDay) return;

        const shift = cycleDay.shifts;
        const isWorkShift = shift && !shift.is_rest_day;

        // Skip work shifts on absence days
        if (hasAbsence && isWorkShift) {
          skippedDueToAbsence++;
          return;
        }

        assignments.push({
          employee_id: employeeId,
          shift_id: cycleDay.shift_id,
          assignment_date: dateStr,
        });
      });
    });

    setGeneratedAssignments(assignments);
    setPreviewMode(true);

    if (skippedDueToAbsence > 0) {
      toast.info(`Se omitieron ${skippedDueToAbsence} asignación(es) por novedades activas`);
    }
  };

  const handleGenerate = async () => {
    if (generatedAssignments.length === 0) return;

    try {
      await createBulkAssignments.mutateAsync(
        generatedAssignments.map(a => ({
          ...a,
          source: 'cycle' as const,
        }))
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

  const activeCycles = shiftCycles.filter(c => c.is_active && c.cycle_days && c.cycle_days.length > 0);

  const totalDays = startDate && endDate 
    ? eachDayOfInterval({ start: startDate, end: endDate }).length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) {
        setPreviewMode(false);
        setGeneratedAssignments([]);
      }
    }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-start sm:items-center gap-2 text-base sm:text-lg">
            <Zap className="w-5 h-5 text-primary" />
            Generar Turnos desde Ciclo
          </DialogTitle>
          <DialogDescription>
            Genera automáticamente asignaciones de turno basadas en un ciclo de rotación.
          </DialogDescription>
        </DialogHeader>

        {!previewMode ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(generatePreview)} className="space-y-4 overflow-y-auto min-h-0 px-1 pb-1 sm:px-2">
              <FormField
                control={form.control}
                name="shift_cycle_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciclo de Rotación</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione ciclo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {activeCycles.map((cycle) => (
                          <SelectItem key={cycle.id} value={cycle.id}>
                            {cycle.name} ({cycle.total_days} días)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedCycle?.cycle_days && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium mb-2">Secuencia del ciclo:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedCycle.cycle_days
                      .sort((a, b) => a.day_number - b.day_number)
                      .map((cd) => (
                        <Badge 
                          key={cd.id} 
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: cd.shifts?.color, color: cd.shifts?.color }}
                        >
                          D{cd.day_number}: {cd.shifts?.code || cd.shifts?.name.slice(0, 3)}
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="employee_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empleados ({shiftEmployees.length} con modalidad turnos)</FormLabel>
                    <FormControl>
                      <div className="h-40 sm:h-32 overflow-y-auto border rounded-md p-2">
                        {shiftEmployees.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hay empleados con modalidad de turnos configurada
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {shiftEmployees.map((emp) => (
                              <label key={emp.id} className="flex items-start gap-2 cursor-pointer hover:bg-muted p-2 sm:p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={field.value.includes(emp.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      field.onChange([...field.value, emp.id]);
                                    } else {
                                      field.onChange(field.value.filter(id => id !== emp.id));
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm min-w-0 break-words">{getEmployeeFullName(emp)}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0"
                        onClick={() => field.onChange(shiftEmployees.map(e => e.id))}
                      >
                        Seleccionar todos
                      </Button>
                      {' / '}
                      <Button 
                        type="button" 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0"
                        onClick={() => field.onChange([])}
                      >
                        Limpiar
                      </Button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
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
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < (startDate || new Date())}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {totalDays > 0 && selectedEmployeeIds.length > 0 && (
                <Alert>
                  <AlertDescription>
                    Se generarán aproximadamente <strong>{totalDays * selectedEmployeeIds.length}</strong> asignaciones 
                    ({selectedEmployeeIds.length} empleados × {totalDays} días)
                  </AlertDescription>
                </Alert>
              )}

              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={activeCycles.length === 0}>
                  Vista Previa
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 overflow-y-auto min-h-0 px-1 pb-1 sm:px-2">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Se generarán <strong>{generatedAssignments.length}</strong> asignaciones de turno.
              </AlertDescription>
            </Alert>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><strong>Ciclo:</strong> {selectedCycle?.name}</p>
              <p><strong>Empleados:</strong> {selectedEmployeeIds.length}</p>
              <p><strong>Periodo:</strong> {startDate && format(startDate, 'dd/MM/yyyy')} - {endDate && format(endDate, 'dd/MM/yyyy')}</p>
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
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setPreviewMode(false)}>
                Volver
              </Button>
              <Button 
                className="w-full sm:w-auto"
                onClick={handleGenerate} 
                disabled={createBulkAssignments.isPending || generatedAssignments.length === 0}
              >
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
