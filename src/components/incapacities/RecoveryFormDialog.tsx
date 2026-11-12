import { useId, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RecoveryUpdateConflict, useUpdateRecoveryStatus } from '@/hooks/useIncapacities';
import { parseDateOnly, toDateOnlyString } from '@/lib/dateOnly';
import { formatRecoveryCurrency, getRecoveryPayments, MAX_RECOVERY_AMOUNT, sumRecoveryPayments } from '@/lib/incapacityRecovery';
import { recoveryFormSchema, recoveryStatusLabels, type EmployeeIncapacity, type RecoveryFormData } from '@/types/incapacity';
import { IncapacityDialogHeader } from './IncapacityDialogHeader';

interface RecoveryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incapacity: EmployeeIncapacity | null;
  expectedAmount: number;
  onRestoreFocus?: () => void;
}

export function RecoveryFormDialog({ open, incapacity, ...props }: RecoveryFormDialogProps) {
  if (!open || !incapacity) return null;

  return <RecoveryForm key={incapacity.id} incapacity={incapacity} {...props} />;
}

function RecoveryForm({ incapacity, expectedAmount, onOpenChange, onRestoreFocus }: {
  incapacity: EmployeeIncapacity;
  expectedAmount: number;
  onOpenChange: (open: boolean) => void;
  onRestoreFocus?: () => void;
}) {
  const [original] = useState(incapacity);
  const [saveError, setSaveError] = useState('');
  const updateMutation = useUpdateRecoveryStatus();
  const headingId = useId();
  const addPaymentButton = useRef<HTMLButtonElement>(null);
  const originalPayments = getRecoveryPayments(original);
  const legacyUndatedAmount = originalPayments.find(({ date }) => !date)?.amount;
  const form = useForm<RecoveryFormData>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: {
      recovery_status: original.recovery_status,
      filing_date: parseDateOnly(original.filing_date),
      filing_number: original.filing_number || '',
      expected_payment_date: parseDateOnly(original.expected_payment_date),
      recovery_notes: original.recovery_notes || '',
      payments: originalPayments.map(({ date, amount }) => ({ date: date || '', amount: String(amount) })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'payments' });
  const payments = useWatch({ control: form.control, name: 'payments' });
  const status = useWatch({ control: form.control, name: 'recovery_status' });
  const expected = status === 'asumido_empresa' ? 0 : expectedAmount;
  const received = sumRecoveryPayments(payments.map(({ amount }) => ({
    amount: Number(amount.replace(',', '.')) || 0,
  })).filter(({ amount }) => amount > 0 && amount <= MAX_RECOVERY_AMOUNT));
  const difference = Math.round((expected - received) * 100) / 100;
  const pending = Math.max(0, difference);
  const excess = Math.max(0, -difference);
  const saving = form.formState.isSubmitting;

  const onSubmit = async (data: RecoveryFormData) => {
    setSaveError('');
    let legacyUndatedUsed = false;
    const undatedIndex = data.payments.findIndex(({ date, amount }) => {
      if (date) return false;
      if (legacyUndatedUsed || Number(amount.replace(',', '.')) !== legacyUndatedAmount) return true;
      legacyUndatedUsed = true;
      return false;
    });
    if (undatedIndex >= 0) {
      form.setError(`payments.${undatedIndex}.date`, { message: 'Ingresa la fecha de este abono.' }, { shouldFocus: true });
      return;
    }
    if (received > MAX_RECOVERY_AMOUNT) {
      setSaveError('El total recibido excede el valor máximo permitido.');
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: original.id, updatedAt: original.updated_at, data });
      toast.success('Recobro actualizado');
      onOpenChange(false);
    } catch (error) {
      setSaveError(error instanceof RecoveryUpdateConflict
        ? 'Otra persona actualizó este recobro. Revisa tu borrador antes de cerrar y vuelve a abrir el recobro para cargar los últimos cambios.'
        : 'No pudimos guardar el recobro. Tus cambios siguen en el formulario. Intenta nuevamente.');
    }
  };

  return (
    <Dialog open onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogContent
        className="incapacity-dialog incapacity-form-dialog w-[calc(100vw-1rem)] max-w-4xl"
        onCloseAutoFocus={(event) => {
          if (!onRestoreFocus) return;
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        <IncapacityDialogHeader
          title="Gestionar recobro"
          description="Registra los abonos recibidos y actualiza el estado del trámite."
        />
        <Form {...form}>
          <form className="incapacity-form flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="incapacity-dialog-body space-y-5">
              <div className="rounded-xl border bg-muted/30 px-4 py-3">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-[1.15fr_1fr_1fr]">
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-xs font-medium text-muted-foreground">Saldo pendiente</dt>
                    <dd className="text-2xl font-semibold tracking-tight tabular-nums text-primary">{formatRecoveryCurrency(pending)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Valor esperado</dt>
                    <dd className="text-base font-semibold tabular-nums">{formatRecoveryCurrency(expected)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Total recibido</dt>
                    <dd className="text-base font-semibold tabular-nums">{formatRecoveryCurrency(received)}</dd>
                  </div>
                </dl>
                <p className="sr-only" role="status">{formatRecoveryCurrency(pending)} de saldo pendiente.</p>
                {received > 0 && pending > 0 && <p className="mt-2 text-xs font-medium text-primary">Pago parcial</p>}
                {excess > 0 && <p className="mt-2 text-xs font-medium">Excedente recibido <span className="tabular-nums">{formatRecoveryCurrency(excess)}</span></p>}
              </div>

              <fieldset disabled={saving} className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
                <section aria-labelledby={`${headingId}-payments`} className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`${headingId}-payments`} className="font-semibold">Pagos recibidos</h3>
                    <Button ref={addPaymentButton} type="button" size="sm" variant="outline" onClick={() => append({ date: '', amount: '' })}>
                      <Plus className="mr-1.5 size-4" aria-hidden="true" />
                      Agregar abono
                    </Button>
                  </div>
                  {fields.length === 0 && <p className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Aún no hay pagos registrados.</p>}
                  {fields.length > 0 && (
                    <div aria-hidden="true" className="mt-4 hidden grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
                      <span>Fecha de pago</span>
                      <span>Valor recibido (COP)</span>
                    </div>
                  )}
                  <ol className="mt-2 divide-y sm:mt-0">
                    {fields.map((payment, index) => (
                      <li key={payment.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2 py-3">
                        <FormField
                          control={form.control}
                          name={`payments.${index}.date`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="flex min-h-8 items-end text-xs leading-tight sm:sr-only">Fecha de pago<span className="sr-only"> del abono {index + 1}</span></FormLabel>
                              <FormControl><Input className="min-w-0 px-2" type="date" {...field} /></FormControl>
                              {!field.value && payment.amount && !payment.date && <FormDescription className="text-xs">Sin fecha registrada</FormDescription>}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`payments.${index}.amount`}
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="flex min-h-8 items-end text-xs leading-tight sm:sr-only">Valor recibido (COP)<span className="sr-only"> del abono {index + 1}</span></FormLabel>
                              <FormControl><Input className="px-2 tabular-nums" inputMode="decimal" placeholder="0" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-10 text-muted-foreground hover:text-destructive sm:mt-1.5"
                          aria-label={`Quitar abono ${index + 1}`}
                          onClick={() => {
                            remove(index);
                            addPaymentButton.current?.focus();
                          }}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </li>
                    ))}
                  </ol>
                </section>

                <section aria-labelledby={`${headingId}-process`} className="min-w-0 space-y-3 border-t pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <h3 id={`${headingId}-process`} className="font-semibold">Trámite</h3>
                  <FormField control={form.control} name="recovery_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del recobro</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={saving}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {Object.entries(recoveryStatusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid gap-3 min-[420px]:grid-cols-2">
                    <FormField control={form.control} name="filing_number" render={({ field }) => (
                      <FormItem>
                        <FormLabel>N.º de radicado</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <RecoveryProcessDate form={form} name="filing_date" label="Fecha de radicación" />
                  </div>
                  <RecoveryProcessDate form={form} name="expected_payment_date" label="Fecha esperada de pago" />
                  <FormField control={form.control} name="recovery_notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas del recobro</FormLabel>
                      <FormControl><Textarea rows={2} className="min-h-0 resize-y" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </section>
              </fieldset>
            </div>
            <footer className="incapacity-dialog-footer justify-end">
              {saveError && <p role="alert" className="w-full text-sm text-destructive">{saveError}</p>}
              <Button type="button" variant="outline" className="sm:ml-auto" disabled={saving} onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </footer>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RecoveryProcessDate({ form, name, label }: {
  form: ReturnType<typeof useForm<RecoveryFormData>>;
  name: 'filing_date' | 'expected_payment_date';
  label: string;
}) {
  return (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            type="date"
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            value={toDateOnlyString(field.value)}
            onChange={(event) => field.onChange(parseDateOnly(event.target.value))}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );
}
