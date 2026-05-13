import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Loader2, FileText, Banknote, ClipboardList, CheckCircle2, DollarSign } from 'lucide-react';
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
import { useCreateLoan, useUpdateLoan, type EmployeeLoan } from '@/hooks/useLoans';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal',
  vivienda: 'Vivienda',
  educacion: 'Educación',
  calamidad: 'Calamidad',
  libranza: 'Libranza',
  anticipo: 'Anticipo de Salario',
  otro: 'Otro',
};

const loanSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  loan_type: z.string().min(1, 'Seleccione un tipo'),
  description: z.string().optional(),
  start_date: z.string().min(1, 'Fecha requerida'),
  total_amount: z.coerce.number().min(1, 'Monto inválido'),
  interest_rate: z.coerce.number().min(0, 'Tasa inválida'),
  installments: z.coerce.number().min(1, 'Cuotas inválidas'),
  notes: z.string().optional(),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface LoanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan?: EmployeeLoan | null;
}

export function LoanFormDialog({
  open,
  onOpenChange,
  loan,
}: LoanFormDialogProps) {
  const createLoan = useCreateLoan();
  const updateLoan = useUpdateLoan();
  const { data: employees = [] } = useEmployees();
  const isEditing = !!loan;

  const [activeTab, setActiveTab] = useState('solicitud');

  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      employee_id: '',
      loan_type: 'personal',
      description: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      total_amount: 0,
      interest_rate: 0,
      installments: 1,
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (loan) {
        form.reset({
          employee_id: loan.employee_id,
          loan_type: loan.loan_type,
          description: loan.description || '',
          start_date: loan.start_date,
          total_amount: Number(loan.total_amount),
          interest_rate: Number(loan.interest_rate),
          installments: Number(loan.installments),
          notes: loan.notes || '',
        });
      } else {
        form.reset({
          employee_id: '',
          loan_type: 'personal',
          description: '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          total_amount: 0,
          interest_rate: 0,
          installments: 1,
          notes: '',
        });
      }
      setActiveTab('solicitud');
    }
  }, [open, loan, form]);

  const selectedEmployeeId = form.watch('employee_id');
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const totalAmount = form.watch('total_amount');
  const interestRate = form.watch('interest_rate');
  const installments = form.watch('installments');

  const totalWithInterest = Number(totalAmount) * (1 + Number(interestRate) / 100);
  const installmentAmount = totalWithInterest / Math.max(1, Number(installments));

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  const onSubmit = async (data: LoanFormData) => {
    try {
      const payload: any = {
        employee_id: data.employee_id,
        loan_type: data.loan_type,
        description: data.description || null,
        total_amount: data.total_amount,
        interest_rate: data.interest_rate,
        total_with_interest: Math.round(totalWithInterest * 100) / 100,
        installments: data.installments,
        installment_amount: Math.round(installmentAmount * 100) / 100,
        start_date: data.start_date,
        notes: data.notes || null,
      };

      if (isEditing) {
        const newBalance = Math.round(totalWithInterest * 100) / 100 - Number(loan.paid_amount);
        payload.remaining_balance = Math.max(0, newBalance);
        await updateLoan.mutateAsync({ id: loan.id, ...payload });
        toast.success('Préstamo actualizado exitosamente');
      } else {
        payload.remaining_balance = Math.round(totalWithInterest * 100) / 100;
        payload.status = 'solicitado';
        await createLoan.mutateAsync(payload);
        toast.success('Préstamo creado exitosamente');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error al guardar el préstamo', { description: error.message });
    }
  };

  const isPending = createLoan.isPending || updateLoan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {isEditing ? 'Editar Préstamo' : 'Nuevo Préstamo'}
          </DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-primary/5">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              NP
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {isEditing ? 'EDICIÓN' : 'NUEVO'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  PRÉSTAMOS
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                {isEditing ? 'Editar Préstamo' : 'Nuevo Préstamo'}
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
              <TabsTrigger value="solicitud" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <FileText className={cn("w-4 h-4 transition-colors", activeTab === 'solicitud' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'solicitud' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Solicitud
                  </span>
                </div>
                {activeTab === 'solicitud' && (
                  <motion.div layoutId="activeTabDot" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="condiciones" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <Banknote className={cn("w-4 h-4 transition-colors", activeTab === 'condiciones' ? "text-primary" : "text-muted-foreground")} />
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
            <form id="loanForm" onSubmit={form.handleSubmit(onSubmit)} className="p-6 sm:p-8 overflow-y-auto">
              <TabsContent value="solicitud" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                    name="loan_type"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tipo de Préstamo *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background">
                              <SelectValue placeholder="Seleccionar tipo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl border-primary/10">
                            {Object.entries(LOAN_TYPE_LABELS).map(([key, label]) => (
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Motivo / Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Compra de vivienda, calamidad familiar..." {...field} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="condiciones" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="total_amount"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Monto Total *</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="interest_rate"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tasa de Interés (%) *</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.1" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">N° Cuotas *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" step="1" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} className="h-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resumen de Condiciones */}
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="font-black text-sm text-primary uppercase tracking-widest">Resumen del Crédito</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Monto Solicitado</p>
                      <p className="font-mono text-base">{formatCurrency(Number(totalAmount))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-1">Total con Intereses</p>
                      <p className="font-mono text-base font-bold text-primary">{formatCurrency(totalWithInterest)}</p>
                    </div>
                    <div className="col-span-2 pt-3 border-t border-primary/10">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground font-medium">Valor por Cuota</p>
                        <p className="font-mono text-xl font-black text-foreground">{formatCurrency(installmentAmount)}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-right mt-1">Estimación en {installments || 0} pagos</p>
                    </div>
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
          <Button type="submit" form="loanForm" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Préstamo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
