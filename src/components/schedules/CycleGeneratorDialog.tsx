import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays, eachDayOfInterval, parseISO, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Zap, AlertTriangle, CheckCircle2, User, Calendar as CalendarIconSVG, Users } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useShiftCycles, useCreateBulkShiftAssignments } from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { useEmployeeTimeConfigs } from '@/hooks/useSchedules';
import { getEmployeeFullName } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
    queryKey: ['employee_absences_generator', currentCompanyId, startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate || !currentCompanyId) return [];
      
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: vacations } = await supabase
        .from('vacation_requests')
        .select('employee_id, start_date, end_date')
        .eq('company_id', currentCompanyId)
        .in('status', ['aprobado', 'en_curso'])
        .gte('end_date', startStr)
        .lte('start_date', endStr);

      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date')
        .eq('company_id', currentCompanyId)
        .eq('status', 'aprobado')
        .gte('end_date', startStr)
        .lte('start_date', endStr);

      const { data: incapacities } = await supabase
        .from('employee_incapacities')
        .select('employee_id, start_date, end_date')
        .eq('company_id', currentCompanyId)
        .gte('end_date', startStr)
        .lte('start_date', endStr);

      return [...(vacations || []), ...(leaves || []), ...(incapacities || [])];
    },
    enabled: selectedEmployeeIds.length > 0 && !!startDate && !!endDate && !!currentCompanyId,
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
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>Generar Turnos</DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-border ">
          
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              GT
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  Automatización
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  Jornadas
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                Generar Turnos
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/80">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-primary/60" />
                  Asignación Masiva
                </div>
                {selectedCycleId && (
                  <div className="flex items-center gap-1.5">
                    <CalendarIconSVG className="w-4 h-4 text-primary/60" />
                    {selectedCycle?.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          {!previewMode ? (
            <Form {...form}>
              <form id="generatorForm" onSubmit={form.handleSubmit(generatePreview)} className="p-6 sm:p-8 overflow-y-auto space-y-6">
                
                <div className="p-5 rounded-2xl border border-border mb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <h3 className="font-black tracking-tight text-primary">Asignación Automática</h3>
                  </div>
                  <p className="text-xs font-medium text-primary/80">
                    Seleccione un ciclo de rotación y los empleados a los que desea aplicarlo. El sistema calculará automáticamente los turnos según las fechas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="shift_cycle_id"
                    render={({ field }) => (
                      <FormItem className="space-y-2 sm:col-span-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Ciclo de Rotación *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background">
                              <SelectValue placeholder="Seleccione un ciclo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-border ">
                            {activeCycles.map((cycle) => (
                              <SelectItem key={cycle.id} value={cycle.id} className="py-2">
                                {cycle.name} <span className="text-muted-foreground ml-1">({cycle.total_days} días)</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedCycle?.cycle_days && (
                    <div className="sm:col-span-2 p-4 bg-background /10 border border-border rounded-2xl">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">Secuencia del ciclo</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCycle.cycle_days
                          .sort((a, b) => a.day_number - b.day_number)
                          .map((cd) => (
                            <Badge 
                              key={cd.id} 
                              variant="outline"
                              className="text-xs py-1 px-2.5 rounded-lg border-primary/20 bg-background shadow-sm"
                              style={{ borderColor: cd.shifts?.color !== 'transparent' ? cd.shifts?.color : undefined, color: cd.shifts?.color !== 'transparent' ? cd.shifts?.color : undefined }}
                            >
                              <span className="font-bold mr-1 opacity-70">D{cd.day_number}:</span> 
                              {cd.shifts?.code || cd.shifts?.name.slice(0, 3)}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fecha Inicio *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'h-12 rounded-2xl bg-background border-border focus:bg-background w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar...'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="p-3 pointer-events-auto rounded-2xl"
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
                      <FormItem className="flex flex-col space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fecha Fin *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'h-12 rounded-2xl bg-background border-border focus:bg-background w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'dd/MM/yyyy') : 'Seleccionar...'}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < (startDate || new Date())}
                              initialFocus
                              className="p-3 pointer-events-auto rounded-2xl"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employee_ids"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Empleados <span className="lowercase font-normal">({shiftEmployees.length} configurados)</span>
                          </FormLabel>
                          <div className="flex gap-2 text-xs">
                            <button
                              type="button" 
                              className="text-primary hover:underline font-bold"
                              onClick={() => field.onChange(shiftEmployees.map(e => e.id))}
                            >
                              Todos
                            </button>
                            <span className="text-muted-foreground">/</span>
                            <button
                              type="button" 
                              className="text-muted-foreground hover:underline"
                              onClick={() => field.onChange([])}
                            >
                              Ninguno
                            </button>
                          </div>
                        </div>
                        <FormControl>
                          <div className="h-48 overflow-y-auto border border-border bg-background /5 rounded-2xl p-2">
                            {shiftEmployees.length === 0 ? (
                              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Users className="w-8 h-8 opacity-20" />
                                <p className="text-sm">No hay empleados con turnos habilitados</p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {shiftEmployees.map((emp) => (
                                  <label key={emp.id} className="flex items-center gap-3 cursor-pointer hover:bg-background p-2.5 rounded-xl transition-colors">
                                    <Checkbox
                                      checked={field.value.includes(emp.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, emp.id]);
                                        } else {
                                          field.onChange(field.value.filter(id => id !== emp.id));
                                        }
                                      }}
                                    />
                                    <span className="text-sm font-medium">{getEmployeeFullName(emp)}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {totalDays > 0 && selectedEmployeeIds.length > 0 && (
                  <Alert className="border-primary/20 rounded-2xl">
                    <Zap className="h-4 w-4 text-primary" />
                    <AlertDescription className="text-primary font-medium text-sm">
                      Se generarán aproximadamente <strong>{totalDays * selectedEmployeeIds.length}</strong> asignaciones en total.
                    </AlertDescription>
                  </Alert>
                )}

              </form>
            </Form>
          ) : (
            <div className="p-6 sm:p-8 space-y-6 overflow-y-auto">
              <Alert className="border-emerald-200 bg-emerald-50 rounded-2xl">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <AlertDescription className="text-emerald-800 font-medium ml-2">
                  Todo listo para generar <strong>{generatedAssignments.length}</strong> asignaciones de turno.
                </AlertDescription>
              </Alert>

              <div className="p-5 bg-background /10 border border-border rounded-2xl text-sm space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground text-xs font-black uppercase tracking-widest block mb-1">Ciclo Seleccionado</span>
                    <span className="font-medium text-foreground">{selectedCycle?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs font-black uppercase tracking-widest block mb-1">Empleados</span>
                    <span className="font-medium text-foreground">{selectedEmployeeIds.length}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs font-black uppercase tracking-widest block mb-1">Periodo</span>
                    <span className="font-medium text-foreground">
                      {startDate && format(startDate, "dd 'de' MMMM", { locale: es })} — {endDate && format(endDate, "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>

              {absences.length > 0 && (
                <Alert variant="default" className="border-amber-200 bg-amber-50 rounded-2xl">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-amber-800 font-medium ml-2">
                    Se omitirán turnos laborales en fechas con novedades activas (vacaciones, incapacidades o permisos).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border/50 bg-background /10 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
          {!previewMode ? (
            <>
              <Button type="button" variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border " onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="generatorForm" className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" disabled={activeCycles.length === 0 || selectedEmployeeIds.length === 0 || !startDate || !endDate}>
                Vista Previa
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border " onClick={() => setPreviewMode(false)}>
                Volver
              </Button>
              <Button 
                className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground"
                onClick={handleGenerate} 
                disabled={createBulkAssignments.isPending || generatedAssignments.length === 0}
              >
                {createBulkAssignments.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar Generación
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
