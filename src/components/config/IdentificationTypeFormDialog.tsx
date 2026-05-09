import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { useCreateIdentificationType, useUpdateIdentificationType } from '@/hooks/useSystemConfig';
import type { IdentificationType } from '@/types/config';

const schema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
});

type IdentificationTypeFormData = z.infer<typeof schema>;

interface IdentificationTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: IdentificationType | null;
}

export function IdentificationTypeFormDialog({ open, onOpenChange, type }: IdentificationTypeFormDialogProps) {
  const isEditing = !!type;
  const createType = useCreateIdentificationType();
  const updateType = useUpdateIdentificationType();

  const form = useForm<IdentificationTypeFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      code: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (type) {
        form.reset({
          name: type.name,
          code: type.code || '',
        });
      } else {
        form.reset({
          name: '',
          code: '',
        });
      }
    }
  }, [open, type, form]);

  const onSubmit = async (data: IdentificationTypeFormData) => {
    try {
      if (isEditing) {
        await updateType.mutateAsync({ 
          id: type.id, 
          name: data.name,
          code: data.code || null,
        });
        toast.success('Tipo de identificación actualizado');
      } else {
        await createType.mutateAsync({
          name: data.name,
          code: data.code || undefined,
        });
        toast.success('Tipo de identificación creado');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el tipo de identificación',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Tipo de Identificación' : 'Nuevo Tipo de Identificación'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Cédula de Ciudadanía" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="CC" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createType.isPending || updateType.isPending}>
                {(createType.isPending || updateType.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Guardar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
