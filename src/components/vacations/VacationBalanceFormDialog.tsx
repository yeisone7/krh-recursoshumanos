import { useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { History, Scale } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { useEmployees } from '@/hooks/useEmployees';
import { useAdjustVacationBalance } from '@/hooks/useVacations';

const adjustmentSchema = z.object({
  employee_id: z.string().uuid('Seleccione un empleado'),
  days: z.coerce.number().refine((value) => value !== 0, 'El ajuste debe ser diferente de cero'),
  effective_date: z.string().min(1, 'Seleccione una fecha'),
  reason: z.string().trim().min(10, 'Explique el motivo en al menos 10 caracteres').max(1000),
});

type AdjustmentForm = z.infer<typeof adjustmentSchema>;

interface VacationBalanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VacationBalanceFormDialog({ open, onOpenChange }: VacationBalanceFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const adjustBalance = useAdjustVacationBalance();
  const form = useForm<AdjustmentForm>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { employee_id: '', days: 0, effective_date: format(new Date(), 'yyyy-MM-dd'), reason: '' },
  });

  useEffect(() => {
    if (open) form.reset({ employee_id: '', days: 0, effective_date: format(new Date(), 'yyyy-MM-dd'), reason: '' });
  }, [form, open]);

  const employeeOptions = useMemo(() => employees
    .filter((employee) => employee.is_active && employee.status === 'active')
    .map((employee) => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.middle_name || ''} ${employee.last_name} ${employee.second_last_name || ''}`.replace(/\s+/g, ' ').trim(),
      keywords: employee.document_number,
      suffix: <span className="ml-auto pl-3 text-xs text-muted-foreground">{employee.document_number}</span>,
    })), [employees]);

  const submit = async (values: AdjustmentForm) => {
    await adjustBalance.mutateAsync({ ...values, idempotency_key: crypto.randomUUID() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b border-primary/15 bg-gradient-to-r from-primary/12 via-primary/5 to-background px-6 py-6 pr-12">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Scale className="h-6 w-6" /></span>
            <div className="text-left">
              <DialogTitle className="text-2xl font-black tracking-tight">Registrar ajuste de saldo</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Corrige una novedad sin alterar la causación automática.</p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-5 p-6">
            <div className="flex gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
              <History className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Cada ajuste queda en el libro de movimientos con usuario, fecha y justificación. Use valores negativos para descontar.</p>
            </div>

            <FormField control={form.control} name="employee_id" render={({ field }) => (
              <FormItem><FormLabel>Empleado activo</FormLabel><FormControl><SearchableSelect options={employeeOptions} value={field.value} onValueChange={field.onChange} placeholder="Buscar por nombre o documento" searchPlaceholder="Escriba nombre o documento..." /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="days" render={({ field }) => (
                <FormItem><FormLabel>Días del ajuste</FormLabel><FormControl><Input type="number" step="0.01" placeholder="Ej. 1.5 o -1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="effective_date" render={({ field }) => (
                <FormItem><FormLabel>Fecha efectiva</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="reason" render={({ field }) => (
              <FormItem><FormLabel>Justificación obligatoria</FormLabel><FormControl><Textarea rows={4} className="resize-none" placeholder="Describa la novedad, soporte o conciliación que origina el ajuste..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="flex justify-end gap-3 border-t pt-5">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={adjustBalance.isPending}>{adjustBalance.isPending ? 'Registrando...' : 'Registrar ajuste'}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
