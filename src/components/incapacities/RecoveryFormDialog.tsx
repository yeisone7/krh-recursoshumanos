import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { parseDateOnly } from '@/lib/dateOnly';

import { useUpdateRecoveryStatus } from '@/hooks/useIncapacities';
import { 
  recoveryFormSchema, 
  type RecoveryFormData, 
  type EmployeeIncapacity,
  recoveryStatusLabels 
} from '@/types/incapacity';

interface RecoveryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incapacity: EmployeeIncapacity | null;
}

export function RecoveryFormDialog({
  open,
  onOpenChange,
  incapacity,
}: RecoveryFormDialogProps) {
  const updateMutation = useUpdateRecoveryStatus();
  
  const form = useForm<RecoveryFormData>({
    resolver: zodResolver(recoveryFormSchema),
    defaultValues: {
      recovery_status: 'pendiente',
      filing_number: '',
      recovered_amount: 0,
      recovery_notes: '',
    },
  });
  
  // Load existing data
  useEffect(() => {
    if (incapacity) {
      form.reset({
        recovery_status: incapacity.recovery_status,
        filing_date: parseDateOnly(incapacity.filing_date),
        filing_number: incapacity.filing_number || '',
        expected_payment_date: parseDateOnly(incapacity.expected_payment_date),
        actual_payment_date: parseDateOnly(incapacity.actual_payment_date),
        recovered_amount: incapacity.recovered_amount || 0,
        recovery_notes: incapacity.recovery_notes || '',
      });
    }
  }, [incapacity, form]);
  
  const onSubmit = async (data: RecoveryFormData) => {
    if (!incapacity) return;
    
    try {
      await updateMutation.mutateAsync({ id: incapacity.id, data });
      toast.success('Estado de recobro actualizado');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating recovery:', error);
      toast.error('Error al actualizar el recobro');
    }
  };
  
  const isLoading = updateMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-0 bg-background border-border/50 shadow-2xl rounded-[2rem]">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  RECOBRO
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Gestionar Recobro
                </DialogTitle>
                <DialogDescription className="font-medium mt-1">
                  Actualice el estado del trámite de recobro ante la entidad responsable
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-6">
            <FormField
              control={form.control}
              name="recovery_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado del Recobro *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(recoveryStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="filing_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Radicación</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="filing_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. Radicado</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de radicación" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="expected_payment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Esperada Pago</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="actual_payment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Real Pago</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "dd/MM/yyyy", { locale: es }) : "Seleccionar"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="recovered_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto Recuperado</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="recovery_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas del Recobro</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observaciones del trámite"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-6 border-t sm:flex sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-2xl w-full sm:w-auto font-bold tracking-widest text-xs uppercase">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
