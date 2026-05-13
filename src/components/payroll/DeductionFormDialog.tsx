import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, FileText, HandCoins, ClipboardList, CheckCircle2, DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCreateDeduction, useUpdateDeduction, type EmployeeDeduction } from '@/hooks/useDeductions';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';

const DEDUCTION_TYPE_LABELS: Record<string, string> = {
  judicial: 'Descuento Judicial',
  responsabilidad: 'Responsabilidad',
  cooperativa: 'Cooperativa',
  sindicato: 'Sindicato',
  otro: 'Otro',
};

const deductionSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  deduction_type: z.string().min(1, 'Seleccione un tipo'),
  description: z.string().min(1, 'Descripción requerida'),
  is_percentage: z.boolean(),
  amount: z.coerce.number().optional(),
  percentage_value: z.coerce.number().optional(),
  start_date: z.string().min(1, 'Fecha requerida'),
  end_date: z.string().optional(),
  is_recurring: z.boolean(),
  reference_number: z.string().optional(),
  entity_name: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => {
  if (data.is_percentage) {
    return data.percentage_value !== undefined && data.percentage_value > 0;
  }
  return data.amount !== undefined && data.amount > 0;
}, {
  message: "Debe indicar un valor válido (monto o porcentaje)",
  path: ["amount"]
});

type DeductionFormData = z.infer<typeof deductionSchema>;

interface DeductionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deduction?: EmployeeDeduction | null;
}

export function DeductionFormDialog({
  open,
  onOpenChange,
  deduction,
}: DeductionFormDialogProps) {
  const createDeduction = useCreateDeduction();
  const updateDeduction = useUpdateDeduction();
  const { data: employees = [] } = useEmployees();
  const isEditing = !!deduction;

  const [activeTab, setActiveTab] = useState('detalles');

  const form = useForm<DeductionFormData>({
    resolver: zodResolver(deductionSchema),
    defaultValues: {
      employee_id: '',
      deduction_type: 'judicial',
      description: '',
      is_percentage: false,
      amount: 0,
      percentage_value: 0,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      is_recurring: true,
      reference_number: '',
      entity_name: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (deduction) {
        form.reset({
          employee_id: deduction.employee_id,
          deduction_type: deduction.deduction_type,
          description: deduction.description,
          is_percentage: deduction.is_percentage,
          amount: Number(deduction.amount) || 0,
          percentage_value: Number(deduction.percentage_value) || 0,
          start_date: deduction.start_date,
          end_date: deduction.end_date || '',
          is_recurring: deduction.is_recurring,
          reference_number: deduction.reference_number || '',
          entity_name: deduction.entity_name || '',
          notes: deduction.notes || '',
        });
      } else {
        form.reset({
          employee_id: '',
          deduction_type: 'judicial',
          description: '',
          is_percentage: false,
          amount: 0,
          percentage_value: 0,
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: '',
          is_recurring: true,
          reference_number: '',
          entity_name: '',
          notes: '',
        });
      }
      setActiveTab('detalles');
    }
  }, [open, deduction, form]);

  const selectedEmployeeId = form.watch('employee_id');
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const isPercentage = form.watch('is_percentage');
  const amount = form.watch('amount');
  const percentage = form.watch('percentage_value');

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  const onSubmit = async (data: DeductionFormData) => {
    try {
      const payload: any = {
        employee_id: data.employee_id,
        deduction_type: data.deduction_type,
        description: data.description,
        is_percentage: data.is_percentage,
        amount: data.is_percentage ? null : data.amount,
        percentage_value: data.is_percentage ? data.percentage_value : null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        is_recurring: data.is_recurring,
        reference_number: data.reference_number || null,
        entity_name: data.entity_name || null,
        notes: data.notes || null,
      };

      if (isEditing) {
        await updateDeduction.mutateAsync({ id: deduction.id, ...payload });
        toast.success('Descuento actualizado exitosamente');
      } else {
        payload.status = 'activo';
        await createDeduction.mutateAsync(payload);
        toast.success('Descuento creado exitosamente');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error al guardar el descuento', { description: error.message });
    }
  };

  const isPending = createDeduction.isPending || updateDeduction.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isEditing ? 'Editar Descuento' : 'Nuevo Descuento'}
          </DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-primary/5">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              ND
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {isEditing ? 'EDICIÓN' : 'NUEVA'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  DESCUENTOS
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                {isEditing ? 'Editar Descuento' : 'Nuevo Descuento'}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/80">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary/80">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                  {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'Empleado no seleccionado'}
                </div>
                {form.watch('start_date') && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary/80">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    </span>
                    {format(new Date(form.watch('start_date')), 'dd/MM/yyyy')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-6 sm:px-8 pt-4 border-b border-border/50 bg-muted/20">
            <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger value="detalles" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <FileText className={cn("w-4 h-4 transition-colors", activeTab === 'detalles' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'detalles' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Detalles
                  </span>
                </div>
                {activeTab === 'detalles' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="condiciones" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <HandCoins className={cn("w-4 h-4 transition-colors", activeTab === 'condiciones' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'condiciones' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Condiciones
                  </span>
                </div>
                {activeTab === 'condiciones' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="observaciones" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <ClipboardList className={cn("w-4 h-4 transition-colors", activeTab === 'observaciones' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'observaciones' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Observaciones
                  </span>
                </div>
                {activeTab === 'observaciones' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <Form {...form}>
            <form id="deductionForm" onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 overflow-y-auto">
              <TabsContent value="detalles" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <FormField
                  control={form.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Empleado *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background">
                            <SelectValue placeholder="Seleccionar empleado..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-primary/10 max-h-[300px]">
                          {employees.filter(e => e.is_active).map(e => (
                            <SelectItem key={e.id} value={e.id} className="py-2">
                              {e.first_name} {e.last_name} <span className="text-muted-foreground ml-1">({e.document_number})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="deduction_type"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tipo de Descuento *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background">
                              <SelectValue placeholder="Seleccionar tipo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-primary/10">
                            {Object.entries(DEDUCTION_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key} className="py-2">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fecha de Inicio *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Descripción del Descuento *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Embargo alimentario, aporte sindical..." {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="entity_name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Entidad (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juzgado 3° Civil" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference_number"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">N° Referencia (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: RAD-2026-001" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="condiciones" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 mb-4">
                  <FormField
                    control={form.control}
                    name="is_percentage"
                    render={({ field }) => (
                      <FormItem className="flex items-start sm:items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <FormLabel className="text-sm font-black text-foreground">Cálculo Porcentual</FormLabel>
                          <FormDescription className="text-xs">
                            Calcular el descuento como porcentaje del salario base en lugar de un monto fijo.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                form.setValue('amount', 0);
                              } else {
                                form.setValue('percentage_value', 0);
                              }
                            }}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {isPercentage ? (
                    <FormField
                      control={form.control}
                      name="percentage_value"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Porcentaje (%) *</FormLabel>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <FormControl>
                              <Input type="number" min="0" step="0.1" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} className="h-12 pl-9 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background font-mono" />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Monto Fijo ($) *</FormLabel>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <FormControl>
                              <Input type="number" min="0" step="1000" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} className="h-12 pl-9 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background font-mono" />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fecha Fin (Opcional)</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_recurring"
                  render={({ field }) => (
                    <FormItem className="flex items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-muted/10 p-4">
                      <div className="min-w-0 space-y-1">
                        <FormLabel className="text-sm font-black text-foreground">Descuento Recurrente</FormLabel>
                        <FormDescription className="text-xs">
                          Se aplicará automáticamente en cada período de nómina mientras esté activo.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Resumen */}
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <HandCoins className="w-4 h-4 text-primary" />
                    <h3 className="font-black text-sm text-primary uppercase tracking-widest">Valor a descontar</h3>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-muted-foreground font-medium">
                      {isPercentage ? 'Porcentaje del salario' : 'Valor exacto por período'}
                    </p>
                    <p className="font-mono text-2xl font-black text-foreground">
                      {isPercentage ? `${percentage || 0}%` : formatCurrency(Number(amount) || 0)}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="observaciones" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notas Adicionales</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Cualquier información adicional relevante..."
                          className="min-h-[150px] rounded-2xl bg-muted/20 border-primary/5 focus:bg-background p-4 resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </form>
          </Form>
        </Tabs>

        <div className="p-6 border-t border-border/50 bg-muted/10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-primary/10" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="deductionForm" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Descuento'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
