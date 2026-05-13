import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Scale } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useRegisterAppeal } from '@/hooks/useDisciplinaryProcesses';

const appealFormSchema = z.object({
  appeal_date: z.date({ required_error: 'Seleccione la fecha de apelación' }),
  appeal_resolution: z.string().min(10, 'Describa los motivos o resolución de la apelación'),
});

type AppealFormData = z.infer<typeof appealFormSchema>;

interface AppealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
}

export function AppealFormDialog({
  open,
  onOpenChange,
  processId,
}: AppealFormDialogProps) {
  const registerAppeal = useRegisterAppeal();

  const form = useForm<AppealFormData>({
    resolver: zodResolver(appealFormSchema),
    defaultValues: {
      appeal_resolution: '',
    },
  });

  const onSubmit = async (data: AppealFormData) => {
    await registerAppeal.mutateAsync({
      processId,
      appealDate: format(data.appeal_date, 'yyyy-MM-dd'),
      appealResolution: data.appeal_resolution,
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
            <Scale className="w-6 h-6 text-primary" />
            Registrar Apelación
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Trámite de segunda instancia solicitado por el colaborador
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <FormField
                control={form.control}
                name="appeal_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de Apelación *</FormLabel>
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

              <FormField
                control={form.control}
                name="appeal_resolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Motivos / Resolución de la Apelación *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa los fundamentos de la apelación o la resolución de la misma..."
                        className="min-h-[200px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3 leading-relaxed"
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
                disabled={registerAppeal.isPending} 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {registerAppeal.isPending ? 'Guardando...' : 'Registrar Apelación'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
