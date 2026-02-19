import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, AlertTriangle, Info } from 'lucide-react';
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
import {
  VacationRequestType,
  REQUEST_TYPE_LABELS,
  calculateBusinessDays,
  canCompensate,
  VacationBalance,
} from '@/types/vacation';

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
  
  const { data: employees } = useEmployees();
  const { data: balances } = useEmployeeVacationBalances(selectedEmployeeId);
  const { data: config } = useVacationConfig();
  const { data: allRequests } = useVacationRequests();
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
      const days = calculateBusinessDays(watchStartDate, watchEndDate);
      setBusinessDays(days);
    }
  }, [watchStartDate, watchEndDate]);

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

  const selectedBalance = balances?.find(b => b.id === watchBalanceId);
  
  // Validate compensation
  const compensationValidation = selectedBalance && watchType === 'compensacion'
    ? canCompensate(selectedBalance, businessDays, config?.max_compensation_percentage ?? 50)
    : null;

  // Check for overlapping vacation requests
  const overlappingRequest = useMemo(() => {
    if (!watchStartDate || !watchEndDate || !selectedEmployeeId || !allRequests) return null;
    const startStr = format(watchStartDate, 'yyyy-MM-dd');
    const endStr = format(watchEndDate, 'yyyy-MM-dd');
    return allRequests.find(
      r => r.employee_id === selectedEmployeeId
        && r.status !== 'cancelado'
        && r.start_date <= endStr
        && r.end_date >= startStr
    ) ?? null;
  }, [watchStartDate, watchEndDate, selectedEmployeeId, allRequests]);

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? 'Editar Solicitud' : 'Nueva Solicitud de Vacaciones'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Employee Selection */}
            <FormField
              control={form.control}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empleado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione empleado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.document_number}
                        </SelectItem>
                      ))}
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
                    <FormLabel>Período vacacional</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {balances.map((balance) => (
                          <SelectItem key={balance.id} value={balance.id}>
                            {format(new Date(balance.period_start), 'dd/MM/yyyy', { locale: es })} - {' '}
                            {format(new Date(balance.period_end), 'dd/MM/yyyy', { locale: es })} {' '}
                            (Disponibles: {balance.days_pending} días)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedBalance && (
                      <FormDescription>
                        Causados: {selectedBalance.days_accrued} | 
                        Tomados: {selectedBalance.days_taken} | 
                        Compensados: {selectedBalance.days_compensated}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Request Type */}
            <FormField
              control={form.control}
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de movimiento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.entries(REQUEST_TYPE_LABELS) as [VacationRequestType, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
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

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
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
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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

            {/* Business Days Calculation */}
            {watchStartDate && watchEndDate && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">
                  Días hábiles: <span className="text-primary">{businessDays}</span>
                </p>
                {selectedBalance && businessDays > Number(selectedBalance.days_pending) && (
                  <p className="text-sm text-destructive mt-1">
                    ⚠️ Los días solicitados ({businessDays}) exceden el saldo disponible ({selectedBalance.days_pending})
                  </p>
                )}
                {compensationValidation && !compensationValidation.allowed && (
                  <p className="text-sm text-destructive mt-1">
                    ⚠️ {compensationValidation.reason}
                  </p>
                )}
              </div>
            )}

            {/* Affected Shift Assignments Warning */}
            {affectedShifts && affectedShifts.total > 0 && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium">Se eliminarán {affectedShifts.total} asignación(es) de turno en este período:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>{affectedShifts.work} turno(s) de trabajo</li>
                    <li>{affectedShifts.rest} descanso(s)</li>
                  </ul>
                </div>
              </div>
            )}
            {overlappingRequest && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm text-destructive">
                  <p className="font-medium">Solapamiento detectado</p>
                  <p>
                    Este empleado ya tiene una solicitud de vacaciones ({format(new Date(overlappingRequest.start_date), 'dd/MM/yyyy', { locale: es })} - {format(new Date(overlappingRequest.end_date), 'dd/MM/yyyy', { locale: es })}) con estado "{overlappingRequest.status}". No se puede crear una solicitud con fechas superpuestas.
                  </p>
                </div>
              </div>
            )}

            {/* Compensation Amount (if compensation type) */}
            {watchType === 'compensacion' && (
              <FormField
                control={form.control}
                name="compensation_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto a compensar (COP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones adicionales..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createRequest.isPending || (compensationValidation && !compensationValidation.allowed) || !!overlappingRequest}
              >
                {createRequest.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
