import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Briefcase, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { 
  useWorkSchedules, 
  useShiftCycles, 
  useCreateEmployeeTimeConfig 
} from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import type { EmployeeTimeMode } from '@/types/schedule';

const configSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  mode: z.enum(['administrative', 'shift']),
  work_schedule_id: z.string().optional(),
  shift_cycle_id: z.string().optional(),
  cycle_start_date: z.date().optional(),
  start_date: z.date({ required_error: 'Fecha de inicio requerida' }),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.mode === 'administrative') {
    return !!data.work_schedule_id;
  }
  if (data.mode === 'shift') {
    return !!data.shift_cycle_id;
  }
  return false;
}, {
  message: 'Seleccione un horario o ciclo según la modalidad',
  path: ['work_schedule_id'],
});

type ConfigFormData = z.infer<typeof configSchema>;

interface EmployeeTimeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

export function EmployeeTimeConfigDialog({
  open,
  onOpenChange,
  preselectedEmployeeId,
}: EmployeeTimeConfigDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: workSchedules = [] } = useWorkSchedules();
  const { data: shiftCycles = [] } = useShiftCycles();
  const createConfig = useCreateEmployeeTimeConfig();

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      employee_id: preselectedEmployeeId || '',
      mode: 'administrative',
      work_schedule_id: '',
      shift_cycle_id: '',
      start_date: new Date(),
      notes: '',
    },
  });

  const selectedMode = form.watch('mode');

  useEffect(() => {
    if (preselectedEmployeeId) {
      form.setValue('employee_id', preselectedEmployeeId);
    }
  }, [preselectedEmployeeId, form]);

  // Reset dependent fields when mode changes
  useEffect(() => {
    if (selectedMode === 'administrative') {
      form.setValue('shift_cycle_id', '');
      form.setValue('cycle_start_date', undefined);
    } else {
      form.setValue('work_schedule_id', '');
    }
  }, [selectedMode, form]);

  const activeEmployees = employees.filter(e => e.is_active);
  const activeSchedules = workSchedules.filter(s => s.is_active);
  const activeCycles = shiftCycles.filter(c => c.is_active);

  const onSubmit = async (data: ConfigFormData) => {
    try {
      await createConfig.mutateAsync({
        employee_id: data.employee_id,
        mode: data.mode as EmployeeTimeMode,
        work_schedule_id: data.mode === 'administrative' ? data.work_schedule_id : undefined,
        shift_cycle_id: data.mode === 'shift' ? data.shift_cycle_id : undefined,
        cycle_start_date: data.cycle_start_date?.toISOString().split('T')[0],
        start_date: data.start_date.toISOString().split('T')[0],
        notes: data.notes,
      });
      toast.success('Configuración de tiempo asignada');
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar la configuración',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar Modalidad de Tiempo</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!preselectedEmployeeId && (
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empleado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione empleado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {activeEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {getEmployeeFullName(emp)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modalidad de Tiempo</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <label
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                          field.value === 'administrative'
                            ? 'border-primary bg-primary/5'
                            : 'border-input hover:border-primary/50'
                        )}
                      >
                        <RadioGroupItem value="administrative" className="sr-only" />
                        <Briefcase className={cn(
                          'w-5 h-5',
                          field.value === 'administrative' ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <div>
                          <p className="font-medium">Administrativo</p>
                          <p className="text-xs text-muted-foreground">Horario fijo de oficina</p>
                        </div>
                      </label>
                      <label
                        className={cn(
                          'flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                          field.value === 'shift'
                            ? 'border-primary bg-primary/5'
                            : 'border-input hover:border-primary/50'
                        )}
                      >
                        <RadioGroupItem value="shift" className="sr-only" />
                        <RotateCcw className={cn(
                          'w-5 h-5',
                          field.value === 'shift' ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <div>
                          <p className="font-medium">Turnos</p>
                          <p className="text-xs text-muted-foreground">Ciclo rotativo operativo</p>
                        </div>
                      </label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedMode === 'administrative' && (
              <FormField
                control={form.control}
                name="work_schedule_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horario Administrativo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione horario" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {activeSchedules.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground text-center">
                            No hay horarios activos
                          </div>
                        ) : (
                          activeSchedules.map((schedule) => (
                            <SelectItem key={schedule.id} value={schedule.id}>
                              <span>{schedule.name}</span>
                              <span className="text-muted-foreground ml-2">
                                ({schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)})
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedMode === 'shift' && (
              <>
                <FormField
                  control={form.control}
                  name="shift_cycle_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciclo de Rotación</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione ciclo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background">
                          {activeCycles.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No hay ciclos activos
                            </div>
                          ) : (
                            activeCycles.map((cycle) => (
                              <SelectItem key={cycle.id} value={cycle.id}>
                                <span>{cycle.name}</span>
                                <span className="text-muted-foreground ml-2">
                                  ({cycle.total_days} días)
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cycle_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Inicio del Ciclo</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd MMM yyyy', { locale: es })
                              ) : (
                                <span>Fecha de referencia del ciclo</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={es}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Fecha desde la cual se calcula la posición en el ciclo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vigente Desde</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'dd MMM yyyy', { locale: es })
                          ) : (
                            <span>Seleccione fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        locale={es}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observaciones adicionales..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createConfig.isPending}>
                {createConfig.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Asignar Modalidad
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
