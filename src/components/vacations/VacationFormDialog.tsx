import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly, parseDateOnlyOr } from '@/lib/dateOnly';
import { CalendarIcon, AlertTriangle, Info, Plane, User, Calendar as CalendarLucide, FileText } from 'lucide-react';
import { useAbsenceConflicts } from '@/hooks/useAbsenceConflicts';
import { AbsenceConflictAlert } from '@/components/shared/AbsenceConflictAlert';
import {
  Dialog,
  DialogContent,
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
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { 
  useEmployeeVacationBalances, 
  useCreateVacationRequest,
  useVacationConfig,
  useVacationRequests,
} from '@/hooks/useVacations';
import { useHolidaysSet } from '@/hooks/useHolidays';
import {
  VacationRequestType,
  REQUEST_TYPE_LABELS,
  calculateBusinessDays,
  canCompensate,
  VacationBalance,
} from '@/types/vacation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  balance_id: z.string().optional(),
  request_type: z.enum(['disfrute', 'compensacion', 'acumulacion', 'interrupcion']),
  start_date: z.date({ required_error: 'Seleccione fecha de inicio' }),
  end_date: z.date({ required_error: 'Seleccione fecha de fin' }),
  compensation_amount: z.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VacationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: any;
}

export function VacationFormDialog({ open, onOpenChange, editData }: VacationFormDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | undefined>();
  const [businessDays, setBusinessDays] = useState<number>(0);
  const [affectedShifts, setAffectedShifts] = useState<{ total: number; work: number; rest: number } | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  const { data: employees } = useEmployees();
  const { data: balances } = useEmployeeVacationBalances(selectedEmployeeId);
  const { data: config } = useVacationConfig();
  const { data: allRequests } = useVacationRequests();
  const { data: holidaysSet } = useHolidaysSet();
  const createRequest = useCreateVacationRequest();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      balance_id: '',
      request_type: 'disfrute',
      notes: '',
    },
  });

  const watchType = form.watch('request_type');
  const watchStartDate = form.watch('start_date');
  const watchEndDate = form.watch('end_date');
  const watchBalanceId = form.watch('balance_id');

  // Calculate business days when dates change
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      const days = calculateBusinessDays(watchStartDate, watchEndDate, holidaysSet);
      setBusinessDays(days);
    }
  }, [watchStartDate, watchEndDate, holidaysSet]);

  // Query affected shift assignments when dates and employee change
  useEffect(() => {
    if (!selectedEmployeeId || !watchStartDate || !watchEndDate) {
      setAffectedShifts(null);
      return;
    }
    const startStr = format(watchStartDate, 'yyyy-MM-dd');
    const endStr = format(watchEndDate, 'yyyy-MM-dd');

    supabase
      .from('employee_shift_assignments')
      .select('id, shifts(is_rest_day)')
      .eq('employee_id', selectedEmployeeId)
      .gte('assignment_date', startStr)
      .lte('assignment_date', endStr)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setAffectedShifts(null);
          return;
        }
        let work = 0;
        let rest = 0;
        data.forEach((row: any) => {
          const isRest = row.shifts?.is_rest_day;
          if (isRest) rest++;
          else work++;
        });
        setAffectedShifts({ total: data.length, work, rest });
      });
  }, [selectedEmployeeId, watchStartDate, watchEndDate]);

  // Update selected employee when form changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'employee_id' && value.employee_id) {
        setSelectedEmployeeId(value.employee_id);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Reset tab on open
  useEffect(() => {
    if (open) {
      setActiveTab('general');
      if (!editData) {
        form.reset();
        setSelectedEmployeeId(undefined);
      }
    }
  }, [open, editData, form]);

  const selectedBalance = balances?.find(b => b.id === watchBalanceId);
  
  // Validate compensation
  const compensationValidation = selectedBalance && watchType === 'compensacion'
    ? canCompensate(selectedBalance, businessDays, config?.max_compensation_percentage ?? 50)
    : null;

  // Unified absence conflict detection
  const { data: absenceConflicts = [] } = useAbsenceConflicts(
    selectedEmployeeId,
    watchStartDate,
    watchEndDate,
  );
  const hasConflicts = absenceConflicts.length > 0;

  const onSubmit = async (data: FormData) => {
    await createRequest.mutateAsync({
      employee_id: data.employee_id,
      balance_id: data.balance_id || undefined,
      request_type: data.request_type as VacationRequestType,
      start_date: format(data.start_date, 'yyyy-MM-dd'),
      end_date: format(data.end_date, 'yyyy-MM-dd'),
      business_days: businessDays,
      compensation_amount: data.compensation_amount,
      notes: data.notes,
    });
    
    form.reset();
    onOpenChange(false);
  };

  const activeEmployees = employees?.filter(e => e.is_active) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border/50 shadow-2xl rounded-[2rem]">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <Plane className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  NOVEDADES
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {editData ? 'Editar Solicitud' : 'Nueva Solicitud de Vacaciones'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground font-medium mt-1">
                  Programa los descansos y compensaciones del personal.
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-background rounded-2xl mb-6">
                <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                  <User className="w-4 h-4 mr-2" /> General
                </TabsTrigger>
                <TabsTrigger value="fechas" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                  <CalendarLucide className="w-4 h-4 mr-2" /> Fechas
                </TabsTrigger>
                <TabsTrigger value="notas" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                  <FileText className="w-4 h-4 mr-2" /> Observaciones
                </TabsTrigger>
              </TabsList>

              <div className="min-h-[280px]">
                {/* TAB 1: GENERAL */}
                <AnimatePresence mode="wait">
                  {activeTab === 'general' && (
                    <motion.div
                      key="general"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      {/* Employee Selection */}
                      <FormField
                        control={form.control}
                        name="employee_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Empleado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background transition-colors">
                                  <SelectValue placeholder="Seleccione el empleado..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-2xl border-border ">
                                {activeEmployees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id} className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                                      <span className="text-[10px] text-muted-foreground opacity-70">CC: {emp.document_number}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Request Type */}
                      <FormField
                        control={form.control}
                        name="request_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Tipo de Movimiento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-2xl border-border ">
                                {(Object.entries(REQUEST_TYPE_LABELS) as [VacationRequestType, string][]).map(
                                  ([value, label]) => (
                                    <SelectItem key={value} value={value} className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">
                                      {label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Balance Selection */}
                      {selectedEmployeeId && balances && balances.length > 0 && (
                        <FormField
                          control={form.control}
                          name="balance_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Período Vacacional (Opcional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background transition-colors">
                                    <SelectValue placeholder="Seleccione período a afectar..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-2xl border-border ">
                                  {balances.map((balance) => (
                                    <SelectItem key={balance.id} value={balance.id} className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {formatDateOnly(balance.period_start, 'MMM yyyy', { locale: es })} - {formatDateOnly(balance.period_end, 'MMM yyyy', { locale: es })}
                                        </span>
                                        <span className="text-[10px] text-primary font-bold opacity-80">Disponibles: {balance.days_pending} días</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selectedBalance && (
                                <div className="mt-2 p-3 rounded-xl border border-border flex items-center justify-between text-xs">
                                  <div className="text-center">
                                    <span className="block font-black text-muted-foreground">Causados</span>
                                    <span className="font-medium">{selectedBalance.days_accrued}</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="block font-black text-muted-foreground">Tomados</span>
                                    <span className="font-medium">{selectedBalance.days_taken}</span>
                                  </div>
                                  <div className="text-center">
                                    <span className="block font-black text-muted-foreground">Compensados</span>
                                    <span className="font-medium">{selectedBalance.days_compensated}</span>
                                  </div>
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* TAB 2: FECHAS */}
                  {activeTab === 'fechas' && (
                    <motion.div
                      key="fechas"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-5"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="start_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fecha Inicio</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        'h-12 rounded-2xl bg-background border-border focus:bg-background transition-colors pl-4 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                      )}
                                    >
                                      {field.value ? (
                                        <span className="font-medium text-foreground">{format(field.value, 'dd/MM/yyyy', { locale: es })}</span>
                                      ) : (
                                        <span>Seleccionar</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-xl" align="start">
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
                          name="end_date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Fecha Fin</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        'h-12 rounded-2xl bg-background border-border focus:bg-background transition-colors pl-4 text-left font-normal',
                                        !field.value && 'text-muted-foreground'
                                      )}
                                    >
                                      {field.value ? (
                                        <span className="font-medium text-foreground">{format(field.value, 'dd/MM/yyyy', { locale: es })}</span>
                                      ) : (
                                        <span>Seleccionar</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 rounded-2xl border-border shadow-xl" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => watchStartDate ? date < watchStartDate : false}
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

                      {/* Info Cards */}
                      <div className="space-y-3">
                        {/* Business Days Calculation */}
                        {watchStartDate && watchEndDate && (
                          <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-black uppercase tracking-widest text-primary">Días Hábiles:</span>
                              <span className="text-xl font-black text-primary">{businessDays}</span>
                            </div>
                            {selectedBalance && businessDays > Number(selectedBalance.days_pending) && (
                              <p className="text-xs text-destructive mt-2 flex items-center font-bold">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Excede el saldo disponible ({selectedBalance.days_pending})
                              </p>
                            )}
                            {compensationValidation && !compensationValidation.allowed && (
                              <p className="text-xs text-destructive mt-2 flex items-center font-bold">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {compensationValidation.reason}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Affected Shift Assignments Warning */}
                        {affectedShifts && affectedShifts.total > 0 && (
                          <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 flex items-start gap-3">
                            <Info className="h-5 w-5 text-orange-500 shrink-0" />
                            <div className="text-sm text-orange-800">
                              <p className="font-bold">Se afectarán {affectedShifts.total} asignaciones de turno:</p>
                              <ul className="list-disc list-inside mt-1 opacity-80 text-xs">
                                <li>{affectedShifts.work} turno(s) de trabajo</li>
                                <li>{affectedShifts.rest} día(s) de descanso</li>
                              </ul>
                            </div>
                          </div>
                        )}
                        <AbsenceConflictAlert conflicts={absenceConflicts} />
                      </div>

                      {/* Compensation Amount */}
                      {watchType === 'compensacion' && (
                        <FormField
                          control={form.control}
                          name="compensation_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Monto a compensar (COP)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  className="h-12 rounded-2xl bg-background border-border focus:bg-background text-lg font-mono"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </motion.div>
                  )}

                  {/* TAB 3: OBSERVACIONES */}
                  {activeTab === 'notas' && (
                    <motion.div
                      key="notas"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">Observaciones (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Escribe cualquier detalle relevante sobre esta solicitud..."
                                className="min-h-[200px] resize-none rounded-2xl bg-background border-border focus:bg-background p-4"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Tabs>

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border/50">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="rounded-2xl font-black uppercase tracking-widest text-xs h-12 px-6"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createRequest.isPending || (compensationValidation && !compensationValidation.allowed) || hasConflicts}
                className="rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all h-12 px-8"
              >
                {createRequest.isPending ? 'Procesando...' : 'Guardar Solicitud'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
