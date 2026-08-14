import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, CircleDollarSign, Info, Plane, Umbrella, UserRound } from 'lucide-react';

import { AbsenceConflictAlert } from '@/components/shared/AbsenceConflictAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { useAbsenceConflicts } from '@/hooks/useAbsenceConflicts';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateVacationRequest, useEmployeeVacationBalances, useVacationConfig } from '@/hooks/useVacations';
import { parseDateOnlyOr } from '@/lib/dateOnly';

const requestSchema = z.object({
  employee_id: z.string().uuid('Seleccione un empleado'),
  enjoyment_days: z.coerce.number().min(0, 'No puede ser negativo'),
  compensated_days: z.coerce.number().min(0, 'No puede ser negativo'),
  start_date: z.string().min(1, 'Seleccione la fecha de inicio'),
  end_date: z.string().min(1, 'Seleccione la fecha final'),
  notes: z.string().max(1500, 'Máximo 1.500 caracteres').optional(),
}).superRefine((value, context) => {
  if (value.enjoyment_days + value.compensated_days <= 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['enjoyment_days'], message: 'Solicite al menos un día' });
  }
  if (value.start_date && value.end_date && value.end_date < value.start_date) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'Debe ser posterior o igual al inicio' });
  }
});

type RequestForm = z.infer<typeof requestSchema>;

interface VacationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: unknown;
}

const VACATION_NOTICE = 'Nota: El reintegro anticipado a sus labores deberá ser informado a Talento Humano con las justificaciones correspondientes. De lo contrario, se descontarán los días de su acumulado de vacaciones y no será sujeto a reclamaciones.';

export function VacationFormDialog({ open, onOpenChange }: VacationFormDialogProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: employees = [] } = useEmployees();
  const createRequest = useCreateVacationRequest();
  const { data: config } = useVacationConfig();

  const form = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      employee_id: '',
      enjoyment_days: 0,
      compensated_days: 0,
      start_date: '',
      end_date: '',
      notes: '',
    },
  });

  const employeeId = form.watch('employee_id');
  const enjoymentDays = Number(form.watch('enjoyment_days') || 0);
  const compensatedDays = Number(form.watch('compensated_days') || 0);
  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');
  const totalDays = enjoymentDays + compensatedDays;
  const { data: balances = [] } = useEmployeeVacationBalances(employeeId || undefined);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active && employee.status === 'active'),
    [employees],
  );
  const employeeOptions = useMemo(
    () => activeEmployees.map((employee) => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.middle_name || ''} ${employee.last_name} ${employee.second_last_name || ''}`.replace(/\s+/g, ' ').trim(),
      keywords: `${employee.document_number} ${employee.work_info?.position_name || ''}`,
      suffix: <span className="ml-auto pl-3 text-xs text-muted-foreground">{employee.document_number}</span>,
    })),
    [activeEmployees],
  );

  const availableDays = useMemo(
    () => balances.reduce((sum, balance) => sum + Math.max(Number(balance.days_pending ?? 0), 0), 0),
    [balances],
  );
  const maxCompensableDays = availableDays * ((config?.max_compensation_percentage ?? 50) / 100);
  const exceedsBalance = Boolean(employeeId) && totalDays > availableDays;
  const exceedsCompensation = compensatedDays > maxCompensableDays;

  const parsedStart = startDate ? parseDateOnlyOr(startDate, new Date()) : undefined;
  const parsedEnd = endDate ? parseDateOnlyOr(endDate, new Date()) : undefined;
  const { data: absenceConflicts = [] } = useAbsenceConflicts(employeeId || undefined, parsedStart, parsedEnd);

  useEffect(() => {
    if (open) {
      form.reset({
        employee_id: '',
        enjoyment_days: 0,
        compensated_days: 0,
        start_date: '',
        end_date: '',
        notes: '',
      });
    }
  }, [form, open]);

  const submit = async (values: RequestForm) => {
    await createRequest.mutateAsync(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-[1.75rem]">
        <DialogHeader className="shrink-0 border-b border-primary/15 bg-gradient-to-r from-primary/12 via-primary/5 to-background px-5 py-5 pr-12 sm:px-7 sm:py-6 sm:pr-14">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Plane className="h-6 w-6" />
            </span>
            <div className="min-w-0 text-left">
              <Badge variant="outline" className="mb-1 border-primary/20 bg-primary/10 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                Solicitud del empleado
              </Badge>
              <DialogTitle className="text-xl font-black tracking-tight sm:text-2xl">Nueva solicitud de vacaciones</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">La solicitud iniciará el ciclo de aprobación con el jefe inmediato.</p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
              <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                <div className="flex items-center gap-3 border-b border-border/60 bg-slate-50/80 px-5 py-4 dark:bg-slate-900/50">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-4 w-4" /></span>
                  <div>
                    <h3 className="font-bold">Espacio para diligenciamiento por el empleado</h3>
                    <p className="text-xs text-muted-foreground">Datos de la solicitud y periodo a disfrutar.</p>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FormLabel>Fecha de solicitud</FormLabel>
                    <Input value={format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })} disabled className="h-11 bg-muted/50" />
                  </div>

                  <FormField
                    control={form.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empleado</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={employeeOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Buscar empleado por nombre o documento"
                            searchPlaceholder="Escriba nombre o documento..."
                            emptyMessage="No hay empleados activos que coincidan."
                            triggerClassName="h-11 rounded-xl"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enjoyment_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días a disfrutar</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.5" className="h-11 rounded-xl" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compensated_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días compensados en dinero</FormLabel>
                        <FormControl><Input type="number" min="0" step="0.5" className="h-11 rounded-xl" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:col-span-2">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <div><p className="text-xs text-muted-foreground">Total solicitado</p><p className="text-xl font-black text-primary">{totalDays} días</p></div>
                      </div>
                      <div><p className="text-xs text-muted-foreground">Saldo disponible</p><p className="text-lg font-bold">{employeeId ? `${availableDays} días` : 'Seleccione empleado'}</p></div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><CircleDollarSign className="h-4 w-4" />Máximo compensable: {maxCompensableDays.toFixed(1)} días</div>
                    </div>
                    {exceedsBalance && <p className="mt-3 text-sm font-medium text-destructive">El total solicitado supera el saldo disponible.</p>}
                    {exceedsCompensation && <p className="mt-2 text-sm font-medium text-destructive">Los días compensados superan el máximo configurado.</p>}
                  </div>

                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem><FormLabel>Fecha inicio a disfrutar</FormLabel><FormControl><Input type="date" min={today} className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem><FormLabel>Fecha final a disfrutar</FormLabel><FormControl><Input type="date" min={startDate || today} className="h-11 rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2"><FormLabel>Observaciones (opcional)</FormLabel><FormControl><Textarea rows={3} placeholder="Información adicional para los aprobadores..." className="resize-none rounded-xl" {...field} /></FormControl><FormMessage /></FormItem>
                    )}
                  />
                </div>
              </section>

              <AbsenceConflictAlert conflicts={absenceConflicts} />

              <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-relaxed text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <p>{VACATION_NOTICE}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border/70 bg-background px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
              <Button
                type="submit"
                disabled={createRequest.isPending || exceedsBalance || exceedsCompensation || absenceConflicts.length > 0}
                className="rounded-xl px-6 shadow-lg shadow-primary/15"
              >
                <Umbrella className="mr-2 h-4 w-4" />
                {createRequest.isPending ? 'Enviando...' : 'Enviar a aprobación'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
