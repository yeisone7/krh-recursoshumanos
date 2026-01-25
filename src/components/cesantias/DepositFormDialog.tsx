import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays, differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateCesantiasDeposit, useUpdateCesantiasDeposit } from '@/hooks/useCesantias';
import type { CesantiasDeposit, CesantiasStatus } from '@/types/cesantias';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Empleado requerido'),
  year: z.coerce.number().min(2000).max(2100),
  calculation_start_date: z.string().min(1, 'Fecha inicio requerida'),
  calculation_end_date: z.string().min(1, 'Fecha fin requerida'),
  base_salary: z.coerce.number().min(0, 'Salario base requerido'),
  average_salary: z.coerce.number().optional(),
  days_worked: z.coerce.number().min(1).max(360),
  cesantias_amount: z.coerce.number().min(0),
  fund_name: z.string().min(1, 'Fondo requerido'),
  fund_account: z.string().optional(),
  due_date: z.string().min(1, 'Fecha límite requerida'),
  deposit_date: z.string().optional(),
  status: z.enum(['pendiente', 'calculado', 'depositado', 'extemporaneo']),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DepositFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deposit?: CesantiasDeposit | null;
}

const FUNDS = [
  'Porvenir',
  'Protección',
  'Colfondos',
  'Skandia',
  'FNA',
];

export function DepositFormDialog({ open, onOpenChange, deposit }: DepositFormDialogProps) {
  const { toast } = useToast();
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateCesantiasDeposit();
  const updateMutation = useUpdateCesantiasDeposit();

  const currentYear = new Date().getFullYear();
  const defaultDueDate = `${currentYear + 1}-02-14`;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      year: currentYear,
      calculation_start_date: `${currentYear}-01-01`,
      calculation_end_date: `${currentYear}-12-31`,
      base_salary: 0,
      days_worked: 360,
      cesantias_amount: 0,
      fund_name: '',
      due_date: defaultDueDate,
      status: 'pendiente',
      observations: '',
    },
  });

  useEffect(() => {
    if (deposit) {
      form.reset({
        employee_id: deposit.employee_id,
        year: deposit.year,
        calculation_start_date: deposit.calculation_start_date,
        calculation_end_date: deposit.calculation_end_date,
        base_salary: deposit.base_salary,
        average_salary: deposit.average_salary,
        days_worked: deposit.days_worked,
        cesantias_amount: deposit.cesantias_amount,
        fund_name: deposit.fund_name,
        fund_account: deposit.fund_account,
        due_date: deposit.due_date,
        deposit_date: deposit.deposit_date,
        status: deposit.status,
        observations: deposit.observations,
      });
    } else {
      form.reset({
        employee_id: '',
        year: currentYear,
        calculation_start_date: `${currentYear}-01-01`,
        calculation_end_date: `${currentYear}-12-31`,
        base_salary: 0,
        days_worked: 360,
        cesantias_amount: 0,
        fund_name: '',
        due_date: defaultDueDate,
        status: 'pendiente',
        observations: '',
      });
    }
  }, [deposit, open]);

  // Auto-calculate cesantías amount
  const baseSalary = form.watch('base_salary');
  const daysWorked = form.watch('days_worked');

  useEffect(() => {
    if (baseSalary && daysWorked) {
      // Formula: (Salary * Days) / 360
      const amount = (baseSalary * daysWorked) / 360;
      form.setValue('cesantias_amount', Math.round(amount));
    }
  }, [baseSalary, daysWorked]);

  // Check if deposit is late
  const depositDate = form.watch('deposit_date');
  const dueDate = form.watch('due_date');
  const status = form.watch('status');

  useEffect(() => {
    if (depositDate && dueDate && status === 'depositado') {
      const due = new Date(dueDate);
      const dep = new Date(depositDate);
      if (dep > due) {
        form.setValue('status', 'extemporaneo');
      }
    }
  }, [depositDate, dueDate, status]);

  const onSubmit = async (data: FormData) => {
    try {
      // Calculate late days
      let isLate = false;
      let lateDays = 0;

      if (data.deposit_date && data.due_date) {
        const due = new Date(data.due_date);
        const dep = new Date(data.deposit_date);
        if (dep > due) {
          isLate = true;
          lateDays = differenceInDays(dep, due);
        }
      }

      if (deposit) {
        await updateMutation.mutateAsync({
          id: deposit.id,
          deposit_date: data.deposit_date,
          status: data.status as any,
          is_late: isLate,
          late_days: lateDays,
          observations: data.observations,
        });
        toast({ title: 'Depósito actualizado correctamente' });
      } else {
        await createMutation.mutateAsync({
          employee_id: data.employee_id,
          year: data.year,
          calculation_start_date: data.calculation_start_date,
          calculation_end_date: data.calculation_end_date,
          base_salary: data.base_salary,
          average_salary: data.average_salary || data.base_salary,
          days_worked: data.days_worked,
          cesantias_amount: data.cesantias_amount,
          fund_name: data.fund_name,
          fund_account: data.fund_account,
          due_date: data.due_date,
          deposit_date: data.deposit_date,
          status: data.status as any,
          observations: data.observations,
        });
        toast({ title: 'Depósito registrado correctamente' });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {deposit ? 'Editar Depósito de Cesantías' : 'Nuevo Depósito de Cesantías'}
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={!!deposit}>
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
                      <Input type="number" {...field} disabled={!!deposit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="calculation_start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Inicio Cálculo *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!!deposit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calculation_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Fin Cálculo *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!!deposit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="base_salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Base *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={!!deposit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="days_worked"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días Trabajados *</FormLabel>
                    <FormControl>
                      <Input type="number" max={360} {...field} disabled={!!deposit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cesantias_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Cesantías *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="font-semibold" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fund_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fondo de Cesantías *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar fondo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {FUNDS.map((fund) => (
                          <SelectItem key={fund} value={fund}>{fund}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fund_account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Cuenta</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Límite *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!!deposit} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deposit_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Depósito</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="calculado">Calculado</SelectItem>
                        <SelectItem value="depositado">Depositado</SelectItem>
                        <SelectItem value="extemporaneo">Extemporáneo</SelectItem>
                      </SelectContent>
                    </Select>
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
                {deposit ? 'Actualizar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
