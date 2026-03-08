import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, Info } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { 
  useCreateOvertimeRecord, 
  classifyOvertimeType, 
  calculateHours,
  isHolidayOrSunday 
} from '@/hooks/useOvertime';
import { useHolidaysSet } from '@/hooks/useHolidays';
import { OVERTIME_TYPE_LABELS, OVERTIME_SURCHARGES } from '@/types/overtime';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  work_date: z.date({ required_error: 'Seleccione la fecha' }),
  start_time: z.string().min(1, 'Ingrese la hora de inicio'),
  end_time: z.string().min(1, 'Ingrese la hora de fin'),
  reason: z.string().optional(),
  hourly_rate: z.number().optional(),
});

interface OvertimeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OvertimeFormDialog({ open, onOpenChange }: OvertimeFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const createRecord = useCreateOvertimeRecord();
  const { data: holidaysSet } = useHolidaysSet();
  
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewHours, setPreviewHours] = useState<number>(0);
  const [previewSurcharge, setPreviewSurcharge] = useState<number>(0);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      start_time: '',
      end_time: '',
      reason: '',
    },
  });

  const watchDate = form.watch('work_date');
  const watchStartTime = form.watch('start_time');
  const watchEndTime = form.watch('end_time');

  // Preview calculation
  useEffect(() => {
    if (watchDate && watchStartTime && watchEndTime) {
      try {
        const overtimeType = classifyOvertimeType(watchDate, watchStartTime, watchEndTime, true, holidaysSet);
        const hours = calculateHours(watchStartTime, watchEndTime);
        setPreviewType(overtimeType);
        setPreviewHours(hours);
        setPreviewSurcharge(OVERTIME_SURCHARGES[overtimeType]);
      } catch {
        setPreviewType(null);
        setPreviewHours(0);
        setPreviewSurcharge(0);
      }
    } else {
      setPreviewType(null);
    }
  }, [watchDate, watchStartTime, watchEndTime, holidaysSet]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await createRecord.mutateAsync({
        employee_id: values.employee_id,
        work_date: format(values.work_date, 'yyyy-MM-dd'),
        start_time: values.start_time,
        end_time: values.end_time,
        reason: values.reason,
        hourly_rate: values.hourly_rate,
      });

      toast.success('Hora extra registrada exitosamente');
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar la hora extra');
    }
  }

  const dateInfo = watchDate ? isHolidayOrSunday(watchDate) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Hora Extra</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      {employees.filter(e => e.is_active).map((emp) => (
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

            {/* Date */}
            <FormField
              control={form.control}
              name="work_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
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
                        disabled={(date) => date > new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {dateInfo && (dateInfo.isSunday || dateInfo.isHoliday) && (
                    <div className="flex gap-2 mt-1">
                      {dateInfo.isSunday && (
                        <Badge variant="secondary">Domingo</Badge>
                      )}
                      {dateInfo.isHoliday && (
                        <Badge variant="destructive">Festivo</Badge>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Inicio</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="time" className="pl-9" {...field} />
                      </div>
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
                    <FormLabel>Hora Fin</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="time" className="pl-9" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preview Classification */}
            {previewType && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Clasificación automática:</span>
                      <Badge>{OVERTIME_TYPE_LABELS[previewType as keyof typeof OVERTIME_TYPE_LABELS]}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Total horas:</span>
                      <span className="font-semibold">{previewHours.toFixed(2)}h</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Recargo:</span>
                      <span className="font-semibold text-primary">{previewSurcharge}%</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Hourly Rate (optional) */}
            <FormField
              control={form.control}
              name="hourly_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Hora (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ej: 15000"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Si se ingresa, se calculará el valor total de la hora extra
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa el motivo de la hora extra..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createRecord.isPending}>
                {createRecord.isPending ? 'Registrando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
