import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useProfessions, Profession } from '@/hooks/useProfessions';

const professionSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  is_active: z.boolean().default(true),
});

type ProfessionFormData = z.infer<typeof professionSchema>;

interface ProfessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profession?: Profession | null;
}

export function ProfessionFormDialog({ open, onOpenChange, profession }: ProfessionFormDialogProps) {
  const isEditing = !!profession;
  const { create, update, isCreating, isUpdating } = useProfessions();

  const form = useForm<ProfessionFormData>({
    resolver: zodResolver(professionSchema),
    defaultValues: {
      name: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (profession) {
        form.reset({
          name: profession.name,
          is_active: profession.is_active,
        });
      } else {
        form.reset({
          name: '',
          is_active: true,
        });
      }
    }
  }, [open, profession, form]);

  const onSubmit = async (data: ProfessionFormData) => {
    try {
      if (isEditing && profession) {
        await update({ 
          id: profession.id, 
          name: data.name,
          is_active: data.is_active
        });
      } else {
        await create(data.name);
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      // Error handling is already done in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? 'Editar Profesión' : 'Nueva Profesión'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Administrador, Ingeniero..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Estado Activo</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Indica si esta profesión está disponible para selección.
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 pt-4 sm:flex-row sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating} className="w-full sm:w-auto">
                {(isCreating || isUpdating) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Guardar Cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
