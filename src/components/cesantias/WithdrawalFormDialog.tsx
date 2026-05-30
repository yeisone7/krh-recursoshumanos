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
import { ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmployees } from '@/hooks/useEmployees';
import { useCreateCesantiasWithdrawal, useUpdateCesantiasWithdrawal } from '@/hooks/useCesantias';
import { todayDateOnlyString } from '@/lib/dateOnly';
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
      request_date: todayDateOnlyString(),
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
        request_date: todayDateOnlyString(),
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
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-0 sm:w-full rounded-[2rem] border shadow-2xl bg-background overflow-hidden">
        <DialogHeader className="px-8 py-8 bg-gradient-to-br from-info/10 via-background to-info/5 border-b border-info/10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-info flex items-center justify-center shadow-lg shadow-info/20">
              <ArrowRightLeft className="w-6 h-6 text-info-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tighter">
                {withdrawal ? 'Editar Retiro' : 'Nuevo Retiro'}
              </DialogTitle>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Solicitud de Cesantías</p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-info" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Información Básica</span>
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
                          disabled={!!withdrawal}
                          triggerClassName="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="request_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Solicitud *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={!!withdrawal} className="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="withdrawal_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Motivo del Retiro *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={reasonOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Seleccionar motivo"
                          searchPlaceholder="Buscar motivo..."
                          disabled={!!withdrawal}
                          triggerClassName="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-bold"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fund_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fondo de Cesantías *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={fundOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Seleccionar fondo"
                          searchPlaceholder="Buscar fondo..."
                          disabled={!!withdrawal}
                          triggerClassName="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-bold text-info"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-info" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Montos y Destino</span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="amount_requested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monto Solicitado *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} disabled={!!withdrawal} className="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount_approved"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Monto Aprobado</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} className="h-11 rounded-xl border-info/30 bg-info/5 text-info focus:bg-info/10 transition-all font-black" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="destination_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Descripción del Destino</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Ej: Compra de vivienda, pago de matrícula universitaria..." rows={3} className="rounded-2xl border-border/50 bg-background focus:bg-background transition-all resize-none" />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold" />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-info" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Beneficiario</span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="beneficiary_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre completo" className="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="beneficiary_document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Documento</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-mono" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-1 w-8 rounded-full bg-info" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estado y Fechas</span>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estado *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          options={statusOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Seleccionar estado"
                          searchPlaceholder="Buscar estado..."
                          triggerClassName="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-black text-xs"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="authorization_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Autorización</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="disbursement_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha Desembolso</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} className="h-11 rounded-xl border-border/50 bg-background focus:bg-background transition-all font-bold" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>

              {status === 'rechazado' && (
                <FormField
                  control={form.control}
                  name="rejection_reason"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-destructive ml-1">Motivo de Rechazo</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} className="rounded-2xl border-destructive/30 bg-destructive/5 focus:bg-destructive/10 transition-all resize-none" />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observaciones</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} className="rounded-2xl border-border/50 bg-background focus:bg-background transition-all resize-none" />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold" />
                </FormItem>
              )}
            />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-border/50">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-background transition-all">
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-info/20 hover:shadow-xl transition-all">
                {withdrawal ? 'Actualizar Registro' : 'Registrar Solicitud'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
