import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateCesantiasWithdrawal, useUpdateCesantiasWithdrawal } from '@/hooks/useCesantias';
import { withdrawalReasonLabels, withdrawalStatusLabels } from '@/types/cesantias';
import type { CesantiasWithdrawal, CesantiasWithdrawalReason } from '@/types/cesantias';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Empleado requerido'),
  request_date: z.string().min(1, 'Fecha solicitud requerida'),
  withdrawal_reason: z.enum(['vivienda', 'educacion', 'terminacion_contrato']),
  amount_requested: z.coerce.number().min(1, 'Monto requerido'),
  amount_approved: z.coerce.number().optional(),
  authorization_date: z.string().optional(),
  disbursement_date: z.string().optional(),
  fund_name: z.string().min(1, 'Fondo requerido'),
  beneficiary_name: z.string().optional(),
  beneficiary_document: z.string().optional(),
  destination_description: z.string().optional(),
  status: z.string().default('solicitado'),
  rejection_reason: z.string().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface WithdrawalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  withdrawal?: CesantiasWithdrawal | null;
}

const FUNDS = ['Porvenir', 'Protección', 'Colfondos', 'Skandia', 'FNA'];

export function WithdrawalFormDialog({ open, onOpenChange, withdrawal }: WithdrawalFormDialogProps) {
  const { toast } = useToast();
  const { data: employees = [] } = useEmployees();
  const createMutation = useCreateCesantiasWithdrawal();
  const updateMutation = useUpdateCesantiasWithdrawal();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      request_date: new Date().toISOString().split('T')[0],
      withdrawal_reason: 'vivienda',
      amount_requested: 0,
      fund_name: '',
      status: 'solicitado',
      observations: '',
    },
  });

  useEffect(() => {
    if (withdrawal) {
      form.reset({
        employee_id: withdrawal.employee_id,
        request_date: withdrawal.request_date,
        withdrawal_reason: withdrawal.withdrawal_reason,
        amount_requested: withdrawal.amount_requested,
        amount_approved: withdrawal.amount_approved,
        authorization_date: withdrawal.authorization_date,
        disbursement_date: withdrawal.disbursement_date,
        fund_name: withdrawal.fund_name,
        beneficiary_name: withdrawal.beneficiary_name,
        beneficiary_document: withdrawal.beneficiary_document,
        destination_description: withdrawal.destination_description,
        status: withdrawal.status,
        rejection_reason: withdrawal.rejection_reason,
        observations: withdrawal.observations,
      });
    } else {
      form.reset({
        employee_id: '',
        request_date: new Date().toISOString().split('T')[0],
        withdrawal_reason: 'vivienda',
        amount_requested: 0,
        fund_name: '',
        status: 'solicitado',
        observations: '',
      });
    }
  }, [withdrawal, open]);

  const onSubmit = async (data: FormData) => {
    try {
      if (withdrawal) {
        await updateMutation.mutateAsync({
          id: withdrawal.id,
          amount_approved: data.amount_approved,
          authorization_date: data.authorization_date,
          disbursement_date: data.disbursement_date,
          status: data.status,
          rejection_reason: data.rejection_reason,
          observations: data.observations,
        });
        toast({ title: 'Retiro actualizado correctamente' });
      } else {
        await createMutation.mutateAsync({
          employee_id: data.employee_id,
          request_date: data.request_date,
          withdrawal_reason: data.withdrawal_reason as CesantiasWithdrawalReason,
          amount_requested: data.amount_requested,
          fund_name: data.fund_name,
          beneficiary_name: data.beneficiary_name,
          beneficiary_document: data.beneficiary_document,
          destination_description: data.destination_description,
          observations: data.observations,
        });
        toast({ title: 'Retiro registrado correctamente' });
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
  const status = form.watch('status');

  const employeeOptions = activeEmployees.map((emp) => ({
    value: emp.id,
    label: `${emp.first_name} ${emp.last_name}`,
  }));

  const reasonOptions = Object.entries(withdrawalReasonLabels).map(([value, label]) => ({
    value,
    label,
  }));

  const fundOptions = FUNDS.map((fund) => ({
    value: fund,
    label: fund,
  }));

  const statusOptions = Object.entries(withdrawalStatusLabels).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {withdrawal ? 'Editar Retiro Parcial' : 'Nuevo Retiro Parcial'}
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
                    <FormControl>
                      <SearchableSelect
                        options={employeeOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar empleado"
                        searchPlaceholder="Buscar empleado..."
                        disabled={!!withdrawal}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="request_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Solicitud *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={!!withdrawal} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="withdrawal_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo del Retiro *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={reasonOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar motivo"
                        searchPlaceholder="Buscar motivo..."
                        disabled={!!withdrawal}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fund_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fondo de Cesantías *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={fundOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar fondo"
                        searchPlaceholder="Buscar fondo..."
                        disabled={!!withdrawal}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_requested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Solicitado *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} disabled={!!withdrawal} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount_approved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Aprobado</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="destination_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción del Destino</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Ej: Compra de vivienda, pago de matrícula universitaria..." rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="beneficiary_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beneficiario</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre del beneficiario" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="beneficiary_document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento Beneficiario</FormLabel>
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={statusOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Seleccionar estado"
                        searchPlaceholder="Buscar estado..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="authorization_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Autorización</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disbursement_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Desembolso</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {status === 'rechazado' && (
              <FormField
                control={form.control}
                name="rejection_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de Rechazo</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {withdrawal ? 'Actualizar' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
