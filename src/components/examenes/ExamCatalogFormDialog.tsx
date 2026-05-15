import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Stethoscope, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateExamCatalogItem, useUpdateExamCatalogItem, type ExamCatalogItem } from '@/hooks/useExamCatalog';

const schema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: ExamCatalogItem | null;
}

export function ExamCatalogFormDialog({ open, onOpenChange, item }: Props) {
  const isEditing = !!item;
  const createMutation = useCreateExamCatalogItem();
  const updateMutation = useUpdateExamCatalogItem();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name || '',
        code: item?.code || '',
        description: item?.description || '',
      });
    }
  }, [open, item]);
  const onSubmit = async (data: FormData) => {
    try {
      const payload = { name: data.name, code: data.code, description: data.description };
      if (isEditing) {
        await updateMutation.mutateAsync({ id: item.id, ...payload });
        toast.success('Tipo de examen actualizado');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Tipo de examen creado');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Ya existe un examen con este nombre');
      } else {
        toast.error('Error al guardar', { description: msg });
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[calc(100vw-1rem)] max-w-md overflow-y-auto p-0 sm:w-full rounded-[2rem] border shadow-2xl bg-background overflow-hidden">
        <DialogHeader className="px-8 py-8 bg-gradient-to-br from-primary/10 via-background to-primary/5 border-b border-border relative overflow-hidden">
          
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Stethoscope className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tighter text-foreground">
                {isEditing ? 'Editar Examen' : 'Nuevo Examen'}
              </DialogTitle>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary" /> Configuración de Catálogo
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-8 space-y-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Nombre del Procedimiento *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: Audiometría Clínica" 
                        {...field} 
                        className="h-12 rounded-xl bg-background border-border/50 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold uppercase" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Código / Identificador</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej: AUD-01" 
                        maxLength={10} 
                        {...field} 
                        className="h-12 rounded-xl bg-background border-border/50 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all font-medium uppercase"
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold uppercase" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Descripción Detallada</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe el propósito o detalles del examen..." 
                        className="min-h-[100px] rounded-2xl bg-background border-border/50 focus:bg-background focus:ring-4 focus:ring-primary/10 transition-all font-medium resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-[10px] font-bold uppercase" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-12 flex-1 rounded-xl font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="h-12 flex-[2] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:shadow-xl transition-all gap-2"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isEditing ? 'Actualizar Información' : 'Registrar Examen'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
