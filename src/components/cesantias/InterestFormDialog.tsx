import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { Percent } from 'lucide-react';
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

  const employeeOptions = activeEmployees.map((emp) => ({
    value: emp.id,
    label: `${emp.first_name} ${emp.last_name}`,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-0 sm:w-full rounded-[2rem] border shadow-2xl bg-background/95 backdrop-blur-xl overflow-hidden">
        <DialogHeader className="px-8 py-8 bg-gradient-to-br from-violet/10 via-background to-violet/5 border-b border-violet/10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-violet flex items-center justify-center shadow-lg shadow-violet/20">
              <Percent className="w-6 h-6 text-violet-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tighter">
                {interest ? 'Editar Intereses' : 'Nuevo Pago'}
              </DialogTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Periodo {form.watch('year')}</p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-violet" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Información del Empleado</span>
              </div>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empleado *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={employeeOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Seleccionar empleado"
                          searchPlaceholder="Buscar empleado..."
                          disabled={!!interest}
                          triggerClassName="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Año *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={!!interest} className="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-violet" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cálculo de Intereses</span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="cesantias_balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Saldo Cesantías *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={!!interest} className="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interest_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tasa (%) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} disabled={!!interest} className="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="days_accrued"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Días *</FormLabel>
                      <FormControl>
                        <Input type="number" max={360} {...field} disabled={!!interest} className="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="interest_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Valor Intereses *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="h-12 rounded-xl border-violet/30 bg-violet/5 text-violet focus:bg-violet/10 transition-all font-black text-xl" />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-violet" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pago y Estado</span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Límite *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!!interest} className="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Pago</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-11 rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all font-bold text-violet" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_paid"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 bg-violet/5 p-4 rounded-2xl border border-violet/10 transition-all hover:bg-violet/10">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="h-5 w-5 rounded-md border-violet data-[state=checked]:bg-violet data-[state=checked]:text-violet-foreground" />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-violet cursor-pointer">Marcar como pagado</FormLabel>
                      <p className="text-[10px] text-muted-foreground font-medium">Confirma que el pago ha sido efectuado al empleado</p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observaciones</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="rounded-2xl border-border/50 bg-background/50 focus:bg-background transition-all resize-none" />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold" />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-background transition-all">
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet/20 hover:shadow-xl transition-all">
                {interest ? 'Actualizar Registro' : 'Registrar Pago'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
