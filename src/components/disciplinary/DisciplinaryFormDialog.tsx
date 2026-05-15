import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Scale } from 'lucide-react';
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
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[95vh] rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground relative z-10 flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            Nuevo Proceso Disciplinario
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Registro formal de descargos y diligencias legales
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Empleado Involucrado *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue placeholder="Seleccione empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl max-h-[300px]">
                          {employees?.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id} className="rounded-lg py-3">
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Calificación de la Falta *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue placeholder="Seleccione tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          {(Object.keys(faultTypeLabels) as FaultType[]).map((type) => (
                            <SelectItem key={type} value={type} className="rounded-lg py-3">
                              {faultTypeLabels[type]}
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
                  name="fault_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de los Hechos *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-left px-4 justify-start',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Seleccione fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-border/50 shadow-2xl" align="start">
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
              </div>

              <FormField
                control={form.control}
                name="facts_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Relato de los Hechos *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa detalladamente los hechos que originan el proceso..."
                        className="min-h-[140px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3 leading-relaxed"
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
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Normativa / RIT Violado</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Art. 15, Art. 23 del Reglamento Interno"
                        className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="witnesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Testigos / Terceros</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombres de testigos"
                          className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Responsable del Proceso</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nombre del investigador"
                          className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Notas Internas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones adicionales no incluidas en el acta..."
                        className="min-h-[100px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 bg-background p-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:bg-background transition-all"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createProcess.isPending} 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {createProcess.isPending ? 'Procesando...' : 'Iniciar Proceso'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
