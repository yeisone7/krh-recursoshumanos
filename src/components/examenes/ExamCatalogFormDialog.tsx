import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
    defaultValues: item ? {
      name: item.name,
      code: item.code || '',
      description: item.description || '',
    } : {
      name: '',
      code: '',
      description: '',
    },
  });

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tipo de Examen' : 'Nuevo Tipo de Examen'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Audiometría clínica" {...field} />
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
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: AUD" maxLength={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción del examen..." className="min-h-[60px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditing ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
