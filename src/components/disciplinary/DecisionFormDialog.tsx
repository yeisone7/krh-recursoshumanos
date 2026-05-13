import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Gavel } from 'lucide-react';
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
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[95vh] rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground relative z-10 flex items-center gap-2">
            <Gavel className="w-6 h-6 text-primary" />
            Registrar Decisión
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Define la resolución final del proceso disciplinario
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <FormField
                control={form.control}
                name="sanction_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Sanción *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                          <SelectValue placeholder="Seleccione sanción" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border/50 shadow-xl">
                        {(Object.keys(sanctionTypeLabels) as SanctionType[]).map((type) => (
                          <SelectItem key={type} value={type} className="rounded-lg py-3">
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
                <div className="grid gap-6 sm:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <FormField
                    control={form.control}
                    name="sanction_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Días de Suspensión *</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(val) => field.onChange(parseInt(val))}
                            value={field.value?.toString()}
                          >
                            <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                              <SelectValue placeholder="Días" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/50 shadow-xl">
                              {selectedSanction === 'suspension_1_3_dias' ? (
                                <>
                                  <SelectItem value="1" className="rounded-lg py-3">1 día</SelectItem>
                                  <SelectItem value="2" className="rounded-lg py-3">2 días</SelectItem>
                                  <SelectItem value="3" className="rounded-lg py-3">3 días</SelectItem>
                                </>
                              ) : (
                                <>
                                  <SelectItem value="4" className="rounded-lg py-3">4 días</SelectItem>
                                  <SelectItem value="5" className="rounded-lg py-3">5 días</SelectItem>
                                  <SelectItem value="6" className="rounded-lg py-3">6 días</SelectItem>
                                  <SelectItem value="7" className="rounded-lg py-3">7 días</SelectItem>
                                  <SelectItem value="8" className="rounded-lg py-3">8 días</SelectItem>
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
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Inicio de Suspensión *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium text-left px-4 justify-start',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: es })
                                ) : (
                                  <span>Seleccione fecha</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-2xl border-border/50 shadow-2xl" align="start">
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
                <div className="text-sm bg-primary/5 border border-primary/10 p-4 rounded-2xl animate-in fade-in duration-500">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider text-primary">Período Proyectado</span>
                  </div>
                  <p className="text-foreground font-bold">
                    {format(sanctionStartDate, 'PPP', { locale: es })} al {format(addDays(sanctionStartDate, sanctionDays - 1), 'PPP', { locale: es })}
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="decision_summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Resumen de la Decisión *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa los fundamentos técnicos y legales de esta decisión..."
                        className="min-h-[150px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3 leading-relaxed"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border/50 bg-background/80 backdrop-blur-md p-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-xl font-bold text-muted-foreground hover:bg-muted/50 transition-all"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={setDecision.isPending} 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {setDecision.isPending ? 'Guardando...' : 'Registrar Decisión'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
