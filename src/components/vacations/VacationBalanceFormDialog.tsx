import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addYears, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Calculator } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateVacationBalance, useVacationConfig } from '@/hooks/useVacations';
import { calculateAccruedDays } from '@/types/vacation';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  period_start: z.date({ required_error: 'Seleccione fecha de inicio' }),
  period_end: z.date({ required_error: 'Seleccione fecha de fin' }),
  days_accrued: z.number().min(0).max(30),
  is_accumulated: z.boolean().default(false),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VacationBalanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VacationBalanceFormDialog({ open, onOpenChange }: VacationBalanceFormDialogProps) {
  const { data: employees } = useEmployees();
  const { data: config } = useVacationConfig();
  const createBalance = useCreateVacationBalance();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      days_accrued: config?.days_per_year ?? 15,
      is_accumulated: false,
      notes: '',
    },
  });

  const watchEmployeeId = form.watch('employee_id');
  const watchPeriodStart = form.watch('period_start');

  // Auto-calculate period end when period start changes
  useEffect(() => {
    if (watchPeriodStart) {
      const periodEnd = subDays(addYears(watchPeriodStart, 1), 1);
      form.setValue('period_end', periodEnd);
    }
  }, [watchPeriodStart, form]);

  // Find selected employee to get hire date for calculation suggestion
  const selectedEmployee = employees?.find(e => e.id === watchEmployeeId);

  const onSubmit = async (data: FormData) => {
    const accumulationExpires = data.is_accumulated 
      ? format(addYears(new Date(), 2), 'yyyy-MM-dd')
      : undefined;

    await createBalance.mutateAsync({
      employee_id: data.employee_id,
      period_start: format(data.period_start, 'yyyy-MM-dd'),
      period_end: format(data.period_end, 'yyyy-MM-dd'),
      days_accrued: data.days_accrued,
      is_accumulated: data.is_accumulated,
      accumulation_expires: accumulationExpires,
      notes: data.notes,
    });
    
    form.reset();
    onOpenChange(false);
  };

  const activeEmployees = employees?.filter(e => e.is_active) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Período de Vacaciones</DialogTitle>
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
                        <SelectValue placeholder="Seleccione empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeEmployees.map((emp) => (
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

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period_start"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Inicio del período</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
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
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Generalmente es la fecha de ingreso o su aniversario
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period_end"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fin del período</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
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
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Se calcula automáticamente (1 año)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Days Accrued */}
            <FormField
              control={form.control}
              name="days_accrued"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Días causados</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Por ley colombiana son 15 días hábiles por año de servicio
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Accumulated */}
            <FormField
              control={form.control}
              name="is_accumulated"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Acumulación autorizada
                    </FormLabel>
                    <FormDescription>
                      Marcar si hay acuerdo de acumulación (máximo 2 años según ley)
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createBalance.isPending}>
                {createBalance.isPending ? 'Guardando...' : 'Crear Período'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
