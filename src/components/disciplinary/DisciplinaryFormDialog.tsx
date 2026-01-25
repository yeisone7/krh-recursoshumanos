import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateDisciplinaryProcess } from '@/hooks/useDisciplinaryProcesses';
import {
  disciplinaryFormSchema,
  DisciplinaryFormData,
  faultTypeLabels,
  FaultType,
} from '@/types/disciplinary';

interface DisciplinaryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId?: string;
}

export function DisciplinaryFormDialog({
  open,
  onOpenChange,
  employeeId,
}: DisciplinaryFormDialogProps) {
  const { data: employees } = useEmployees();
  const createProcess = useCreateDisciplinaryProcess();

  const form = useForm<DisciplinaryFormData>({
    resolver: zodResolver(disciplinaryFormSchema),
    defaultValues: {
      employee_id: employeeId || '',
      fault_type: 'leve',
      fault_date: new Date(),
      facts_description: '',
      article_violated: '',
      witnesses: '',
      investigator_name: '',
      observations: '',
    },
  });

  useEffect(() => {
    if (employeeId) {
      form.setValue('employee_id', employeeId);
    }
  }, [employeeId, form]);

  const onSubmit = async (data: DisciplinaryFormData) => {
    await createProcess.mutateAsync(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Proceso Disciplinario</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empleado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione empleado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees?.map((emp) => (
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

              <FormField
                control={form.control}
                name="fault_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Falta *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(faultTypeLabels) as FaultType[]).map((type) => (
                          <SelectItem key={type} value={type}>
                            {faultTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fault_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de los Hechos *</FormLabel>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facts_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de los Hechos *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa detalladamente los hechos que originan el proceso..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="article_violated"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artículos del Reglamento Violados</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Art. 15, Art. 23 del RIT"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="witnesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Testigos</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombres de testigos"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="investigator_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investigador Asignado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre del investigador"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createProcess.isPending}>
                {createProcess.isPending ? 'Guardando...' : 'Crear Proceso'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
