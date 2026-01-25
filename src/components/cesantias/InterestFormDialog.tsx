import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateCesantiasInterest, useUpdateCesantiasInterest } from '@/hooks/useCesantias';
import type { CesantiasInterestPayment } from '@/types/cesantias';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Empleado requerido'),
  year: z.coerce.number().min(2000).max(2100),
  cesantias_balance: z.coerce.number().min(0, 'Saldo requerido'),
  interest_rate: z.coerce.number().min(0).max(100).default(12),
  days_accrued: z.coerce.number().min(1).max(360).default(360),
  interest_amount: z.coerce.number().min(0),
  due_date: z.string().min(1, 'Fecha límite requerida'),
  payment_date: z.string().optional(),
  is_paid: z.boolean().default(false),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InterestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interest?: CesantiasInterestPayment | null;
}

export function InterestFormDialog({ open, onOpenChange, interest }: InterestFormDialogProps) {
  const { toast } = useToast();
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateCesantiasInterest();
  const updateMutation = useUpdateCesantiasInterest();

  const currentYear = new Date().getFullYear();
  const defaultDueDate = `${currentYear + 1}-01-31`;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      year: currentYear,
      cesantias_balance: 0,
      interest_rate: 12,
      days_accrued: 360,
      interest_amount: 0,
      due_date: defaultDueDate,
      is_paid: false,
      observations: '',
    },
  });

  useEffect(() => {
    if (interest) {
      form.reset({
        employee_id: interest.employee_id,
        year: interest.year,
        cesantias_balance: interest.cesantias_balance,
        interest_rate: interest.interest_rate,
        days_accrued: interest.days_accrued,
        interest_amount: interest.interest_amount,
        due_date: interest.due_date,
        payment_date: interest.payment_date,
        is_paid: interest.is_paid,
        observations: interest.observations,
      });
    } else {
      form.reset({
        employee_id: '',
        year: currentYear,
        cesantias_balance: 0,
        interest_rate: 12,
        days_accrued: 360,
        interest_amount: 0,
        due_date: defaultDueDate,
        is_paid: false,
        observations: '',
      });
    }
  }, [interest, open]);

  // Auto-calculate interest amount
  const balance = form.watch('cesantias_balance');
  const rate = form.watch('interest_rate');
  const days = form.watch('days_accrued');

  useEffect(() => {
    if (balance && rate && days) {
      // Formula: (Balance * Rate * Days) / (360 * 100)
      const amount = (balance * rate * days) / (360 * 100);
      form.setValue('interest_amount', Math.round(amount));
    }
  }, [balance, rate, days]);

  const onSubmit = async (data: FormData) => {
    try {
      let isLate = false;
      let lateDays = 0;

      if (data.payment_date && data.due_date) {
        const due = new Date(data.due_date);
        const pay = new Date(data.payment_date);
        if (pay > due) {
          isLate = true;
          lateDays = differenceInDays(pay, due);
        }
      }

      if (interest) {
        await updateMutation.mutateAsync({
          id: interest.id,
          payment_date: data.payment_date,
          is_paid: data.is_paid,
          is_late: isLate,
          late_days: lateDays,
          observations: data.observations,
        });
        toast({ title: 'Intereses actualizados correctamente' });
      } else {
        await createMutation.mutateAsync({
          employee_id: data.employee_id,
          year: data.year,
          cesantias_balance: data.cesantias_balance,
          interest_rate: data.interest_rate,
          days_accrued: data.days_accrued,
          interest_amount: data.interest_amount,
          due_date: data.due_date,
          payment_date: data.payment_date,
          is_paid: data.is_paid,
          observations: data.observations,
        });
        toast({ title: 'Intereses registrados correctamente' });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const activeEmployees = employees.filter(e => e.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {interest ? 'Editar Pago de Intereses' : 'Nuevo Pago de Intereses'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empleado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!interest}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empleado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {activeEmployees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
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
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={!!interest} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cesantias_balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Cesantías *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={!!interest} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tasa (%) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled={!!interest} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days_accrued"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días *</FormLabel>
                    <FormControl>
                      <Input type="number" max={360} {...field} disabled={!!interest} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="interest_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Intereses *</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="font-semibold text-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Límite *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!!interest} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Pago</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_paid"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0">Marcar como pagado</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {interest ? 'Actualizar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
