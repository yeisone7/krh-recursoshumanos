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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Apelación</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={registerAppeal.isPending}>
                {registerAppeal.isPending ? 'Guardando...' : 'Registrar Apelación'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
