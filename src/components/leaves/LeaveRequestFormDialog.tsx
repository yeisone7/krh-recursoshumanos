import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Upload, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeaveTypeConfigs, useCreateLeaveRequest, calculateBusinessDays } from '@/hooks/useLeaves';
import { LeaveType, LeaveDurationType, LEAVE_DURATION_TYPE_LABELS } from '@/types/leave';
import { toast } from 'sonner';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  leave_type: z.string().min(1, 'Seleccione el tipo de permiso'),
  duration_type: z.enum(['dias_completos', 'medio_dia', 'horas']),
  start_date: z.date({ required_error: 'Seleccione la fecha de inicio' }),
  end_date: z.date({ required_error: 'Seleccione la fecha de fin' }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reason: z.string().min(10, 'La razón debe tener al menos 10 caracteres'),
});

interface LeaveRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

export function LeaveRequestFormDialog({
  open,
  onOpenChange,
  preselectedEmployeeId,
}: LeaveRequestFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: leaveTypeConfigs = [] } = useLeaveTypeConfigs();
  const createRequest = useCreateLeaveRequest();
  
  const [selectedTypeConfig, setSelectedTypeConfig] = useState<typeof leaveTypeConfigs[0] | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: preselectedEmployeeId || '',
      leave_type: '',
      duration_type: 'dias_completos',
      reason: '',
    },
  });

  const watchDurationType = form.watch('duration_type');
  const watchStartDate = form.watch('start_date');
  const watchEndDate = form.watch('end_date');
  const watchLeaveType = form.watch('leave_type');

  // Update selected type config when leave type changes
  useEffect(() => {
    if (watchLeaveType) {
      const config = leaveTypeConfigs.find(c => c.leave_type === watchLeaveType);
      setSelectedTypeConfig(config || null);
    } else {
      setSelectedTypeConfig(null);
    }
  }, [watchLeaveType, leaveTypeConfigs]);

  // Calculate days when dates change
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      if (watchDurationType === 'dias_completos') {
        const days = calculateBusinessDays(watchStartDate, watchEndDate);
        setCalculatedDays(days);
      } else if (watchDurationType === 'medio_dia') {
        setCalculatedDays(0.5);
      }
    }
  }, [watchStartDate, watchEndDate, watchDurationType]);

  const activeLeaveTypes = leaveTypeConfigs.filter(c => c.is_active);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let totalDays = calculatedDays;
      let totalHours: number | undefined;

      if (values.duration_type === 'horas' && values.start_time && values.end_time) {
        const [startH, startM] = values.start_time.split(':').map(Number);
        const [endH, endM] = values.end_time.split(':').map(Number);
        totalHours = (endH * 60 + endM - startH * 60 - startM) / 60;
        totalDays = totalHours / 8; // Assuming 8-hour workday
      }

      await createRequest.mutateAsync({
        employee_id: values.employee_id,
        leave_type: values.leave_type as LeaveType,
        duration_type: values.duration_type as LeaveDurationType,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: format(values.end_date, 'yyyy-MM-dd'),
        start_time: values.start_time,
        end_time: values.end_time,
        total_days: totalDays,
        total_hours: totalHours,
        reason: values.reason,
      });

      toast.success('Solicitud de permiso creada exitosamente');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear la solicitud');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Permiso</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Selection */}
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.document_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Leave Type */}
            <FormField
              control={form.control}
              name="leave_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Permiso</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeLeaveTypes.map((type) => (
                        <SelectItem key={type.leave_type} value={type.leave_type}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: type.color }}
                            />
                            {type.display_name}
                            {!type.is_paid && (
                              <span className="text-xs text-muted-foreground">(No remunerado)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTypeConfig?.description && (
                    <FormDescription>{selectedTypeConfig.description}</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Info Alert for Selected Type */}
            {selectedTypeConfig && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-1">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {selectedTypeConfig.max_days_per_year && (
                      <span>Máximo: {selectedTypeConfig.max_days_per_year} días/año</span>
                    )}
                    {selectedTypeConfig.min_days_advance > 0 && (
                      <span>Anticipación mínima: {selectedTypeConfig.min_days_advance} días</span>
                    )}
                    <span>{selectedTypeConfig.is_paid ? 'Remunerado' : 'No remunerado'}</span>
                    {selectedTypeConfig.requires_document && (
                      <span className="text-destructive">Requiere soporte</span>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Duration Type */}
            <FormField
              control={form.control}
              name="duration_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Duración</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dias_completos">Días Completos</SelectItem>
                      {selectedTypeConfig?.allows_half_day && (
                        <SelectItem value="medio_dia">Medio Día</SelectItem>
                      )}
                      {selectedTypeConfig?.allows_hours && (
                        <SelectItem value="horas">Horas</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio</FormLabel>
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
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccione fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
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
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin</FormLabel>
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
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Seleccione fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => 
                            date < new Date() || 
                            (watchStartDate && date < watchStartDate)
                          }
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Time fields for hours duration */}
            {watchDurationType === 'horas' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Inicio</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Fin</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Calculated Days Display */}
            {calculatedDays > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  Total de días hábiles: <span className="font-semibold text-foreground">{calculatedDays}</span>
                </p>
              </div>
            )}

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de la Solicitud</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa el motivo del permiso..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Upload Note */}
            {selectedTypeConfig?.requires_document && (
              <Alert variant="destructive">
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  Este tipo de permiso requiere adjuntar un documento de soporte.
                  {selectedTypeConfig.document_description && (
                    <span className="block mt-1">{selectedTypeConfig.document_description}</span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRequest.isPending}>
                {createRequest.isPending ? 'Creando...' : 'Crear Solicitud'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
