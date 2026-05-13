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
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[95vh] rounded-[2rem] border-border/50 shadow-2xl">
        <DialogHeader className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-primary/10 blur-[40px] pointer-events-none" />
          <DialogTitle className="text-2xl font-black tracking-tight text-foreground relative z-10 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Registrar Descargos
          </DialogTitle>
          <p className="text-muted-foreground font-medium mt-1 relative z-10">
            Versión oficial de los hechos por parte del empleado
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col bg-card/30">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="defense_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de Descargos *</FormLabel>
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Descargos *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/50 shadow-xl">
                          <SelectItem value="escrito" className="rounded-lg py-3">Escrito</SelectItem>
                          <SelectItem value="oral" className="rounded-lg py-3">Oral</SelectItem>
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
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Contenido de los Descargos *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Transcriba o resuma detalladamente los descargos presentados..."
                        className="min-h-[200px] rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium py-3 leading-relaxed"
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
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Recibido por</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nombre de quien recibe la diligencia" 
                        className="h-12 rounded-xl bg-background shadow-inner border-border/50 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
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
                disabled={addDefense.isPending} 
                className="h-12 px-8 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                {addDefense.isPending ? 'Guardando...' : 'Registrar Descargos'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
