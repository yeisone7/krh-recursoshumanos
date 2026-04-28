import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSetDecision, useAdvanceStatus } from '@/hooks/useDisciplinaryProcesses';
import { sanctionTypeLabels, SanctionType, DisciplinaryStatus } from '@/types/disciplinary';

const decisionFormSchema = z.object({
  sanction_type: z.enum([
    'amonestacion_verbal',
    'amonestacion_escrita',
    'suspension_1_3_dias',
    'suspension_4_8_dias',
    'terminacion_justa_causa',
    'sin_sancion',
  ] as const),
  sanction_days: z.number().min(0).optional(),
  sanction_start_date: z.date().optional(),
  decision_summary: z.string().min(10, 'Ingrese un resumen de la decisión'),
});

type DecisionFormData = z.infer<typeof decisionFormSchema>;

interface DecisionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  currentStatus: DisciplinaryStatus;
}

export function DecisionFormDialog({
  open,
  onOpenChange,
  processId,
  currentStatus,
}: DecisionFormDialogProps) {
  const setDecision = useSetDecision();
  const advanceStatus = useAdvanceStatus();

  const form = useForm<DecisionFormData>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: {
      sanction_type: 'sin_sancion',
      sanction_days: 0,
      decision_summary: '',
    },
  });

  const selectedSanction = form.watch('sanction_type');
  const sanctionDays = form.watch('sanction_days');
  const sanctionStartDate = form.watch('sanction_start_date');
  const needsSuspensionDates = selectedSanction === 'suspension_1_3_dias' || selectedSanction === 'suspension_4_8_dias';

  const onSubmit = async (data: DecisionFormData) => {
    let endDate: string | undefined;
    
    if (needsSuspensionDates && data.sanction_start_date && data.sanction_days) {
      endDate = format(addDays(data.sanction_start_date, data.sanction_days - 1), 'yyyy-MM-dd');
    }

    await setDecision.mutateAsync({
      processId,
      sanctionType: data.sanction_type,
      sanctionDays: data.sanction_days,
      sanctionStartDate: data.sanction_start_date ? format(data.sanction_start_date, 'yyyy-MM-dd') : undefined,
      sanctionEndDate: endDate,
      decisionSummary: data.decision_summary,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[90vh]">
        <DialogHeader className="px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle>Registrar Decisión</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
            <FormField
              control={form.control}
              name="sanction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Sanción *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione sanción" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(sanctionTypeLabels) as SanctionType[]).map((type) => (
                        <SelectItem key={type} value={type}>
                          {sanctionTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {needsSuspensionDates && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sanction_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días de Suspensión *</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(val) => field.onChange(parseInt(val))}
                          value={field.value?.toString()}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Días" />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedSanction === 'suspension_1_3_dias' ? (
                              <>
                                <SelectItem value="1">1 día</SelectItem>
                                <SelectItem value="2">2 días</SelectItem>
                                <SelectItem value="3">3 días</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="4">4 días</SelectItem>
                                <SelectItem value="5">5 días</SelectItem>
                                <SelectItem value="6">6 días</SelectItem>
                                <SelectItem value="7">7 días</SelectItem>
                                <SelectItem value="8">8 días</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sanction_start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Inicio de Suspensión *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'P', { locale: es })
                              ) : (
                                <span>Seleccione</span>
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
              </div>
            )}

            {needsSuspensionDates && sanctionStartDate && sanctionDays && (
              <div className="text-sm bg-muted p-3 rounded-md">
                <span className="text-muted-foreground">Período de suspensión: </span>
                <span className="font-medium">
                  {format(sanctionStartDate, 'P', { locale: es })} - {format(addDays(sanctionStartDate, sanctionDays - 1), 'P', { locale: es })}
                </span>
              </div>
            )}

            <FormField
              control={form.control}
              name="decision_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resumen de la Decisión *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa los fundamentos de la decisión..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            </div>
            <div className="grid grid-cols-1 gap-2 border-t bg-background p-4 sm:flex sm:justify-end sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={setDecision.isPending} className="w-full sm:w-auto">
                {setDecision.isPending ? 'Guardando...' : 'Registrar Decisión'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
