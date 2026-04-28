import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAddDefense } from '@/hooks/useDisciplinaryProcesses';
import { defenseFormSchema, DefenseFormData } from '@/types/disciplinary';

interface DefenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
}

export function DefenseFormDialog({
  open,
  onOpenChange,
  processId,
}: DefenseFormDialogProps) {
  const addDefense = useAddDefense();

  const form = useForm<DefenseFormData>({
    resolver: zodResolver(defenseFormSchema),
    defaultValues: {
      defense_date: new Date(),
      defense_type: 'escrito',
      content: '',
      received_by: '',
    },
  });

  const onSubmit = async (data: DefenseFormData) => {
    await addDefense.mutateAsync({ processId, data });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[90vh]">
        <DialogHeader className="px-4 pb-3 pt-4 pr-12 sm:px-6 sm:pt-6">
          <DialogTitle>Registrar Descargos</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4 sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="defense_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Descargos *</FormLabel>
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
                          disabled={(date) => date > new Date()}
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
                name="defense_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Descargos *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="escrito">Escrito</SelectItem>
                        <SelectItem value="oral">Oral</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido de los Descargos *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Transcriba o resuma los descargos presentados por el empleado..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="received_by"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recibido por</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de quien recibe" {...field} />
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
              <Button type="submit" disabled={addDefense.isPending} className="w-full sm:w-auto">
                {addDefense.isPending ? 'Guardando...' : 'Registrar Descargos'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
