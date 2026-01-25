import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useShiftTypes, useCreateEmployeeShift } from '@/hooks/useShifts';

const assignShiftSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  shift_type_id: z.string().min(1, 'Seleccione una jornada'),
  effective_from: z.date({ required_error: 'Fecha de inicio requerida' }),
  effective_to: z.date().optional(),
  notes: z.string().optional(),
});

type AssignShiftFormData = z.infer<typeof assignShiftSchema>;

interface AssignShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

export function AssignShiftDialog({ 
  open, 
  onOpenChange,
  preselectedEmployeeId,
}: AssignShiftDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: shiftTypes = [] } = useShiftTypes();
  const createEmployeeShift = useCreateEmployeeShift();

  const form = useForm<AssignShiftFormData>({
    resolver: zodResolver(assignShiftSchema),
    defaultValues: {
      employee_id: preselectedEmployeeId || '',
      shift_type_id: '',
      effective_from: new Date(),
      notes: '',
    },
  });

  const onSubmit = async (data: AssignShiftFormData) => {
    try {
      await createEmployeeShift.mutateAsync({
        employee_id: data.employee_id,
        shift_type_id: data.shift_type_id,
        effective_from: data.effective_from.toISOString().split('T')[0],
        effective_to: data.effective_to?.toISOString().split('T')[0],
        notes: data.notes,
      });
      toast.success('Jornada asignada exitosamente');
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo asignar la jornada',
      });
    }
  };

  const activeShiftTypes = shiftTypes.filter(s => s.is_active);
  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Jornada a Empleado</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <FormField
              control={form.control}
              name="shift_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jornada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione jornada" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      {activeShiftTypes.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          <span className="font-medium">{shift.name}</span>
                          <span className="text-muted-foreground ml-2">
                            ({shift.start_time} - {shift.end_time})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effective_from"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Desde</FormLabel>
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
                              <span>Seleccione</span>
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
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effective_to"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Hasta (opcional)</FormLabel>
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
                              <span>Sin límite</span>
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
                          disabled={(date) => date < (form.getValues('effective_from') || new Date())}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observaciones..."
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
              <Button
                type="submit"
                disabled={createEmployeeShift.isPending}
              >
                {createEmployeeShift.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Asignar Jornada
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
