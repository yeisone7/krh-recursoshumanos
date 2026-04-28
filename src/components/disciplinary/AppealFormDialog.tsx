import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[90vh]">
        <DialogHeader className="px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle>Registrar Apelación</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
            <FormField
              control={form.control}
              name="appeal_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Apelación *</FormLabel>
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
                            <span>Seleccione fecha</span>
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
              name="appeal_resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivos / Resolución de la Apelación *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describa los motivos de la apelación presentada por el empleado..."
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
              <Button type="submit" disabled={registerAppeal.isPending} className="w-full sm:w-auto">
                {registerAppeal.isPending ? 'Guardando...' : 'Registrar Apelación'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
