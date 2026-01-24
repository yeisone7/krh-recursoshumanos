import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAreas, useCreatePosition, useUpdatePosition } from '@/hooks/useSystemConfig';
import type { Position } from '@/types/config';

const positionSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  area_id: z.string().optional(),
  level: z.number().min(1).max(10).default(1),
  min_salary: z.string().optional(),
  max_salary: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
});

type PositionFormData = z.infer<typeof positionSchema>;

interface PositionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: Position | null;
}

export function PositionFormDialog({ open, onOpenChange, position }: PositionFormDialogProps) {
  const isEditing = !!position;
  const { data: areas = [] } = useAreas();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();

  const form = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: position ? {
      name: position.name,
      code: position.code || '',
      area_id: position.area_id || '',
      level: position.level,
      min_salary: position.min_salary?.toString() || '',
      max_salary: position.max_salary?.toString() || '',
      description: position.description || '',
      requirements: position.requirements || '',
    } : {
      name: '',
      code: '',
      area_id: '',
      level: 1,
      min_salary: '',
      max_salary: '',
      description: '',
      requirements: '',
    },
  });

  const onSubmit = async (data: PositionFormData) => {
    try {
      const payload = {
        name: data.name,
        code: data.code || undefined,
        area_id: data.area_id || undefined,
        level: data.level,
        min_salary: data.min_salary ? parseFloat(data.min_salary) : undefined,
        max_salary: data.max_salary ? parseFloat(data.max_salary) : undefined,
        description: data.description || undefined,
        requirements: data.requirements || undefined,
      };

      if (isEditing) {
        await updatePosition.mutateAsync({ id: position.id, ...payload });
        toast.success('Cargo actualizado');
      } else {
        await createPosition.mutateAsync(payload);
        toast.success('Cargo creado');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el cargo',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cargo' : 'Nuevo Cargo'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Analista de RRHH" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="ANL-RRHH" maxLength={15} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="area_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione área" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      <SelectItem value="">Sin área asignada</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Mínimo</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1.300.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_salary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salario Máximo</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2.500.000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del cargo..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisitos</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Requisitos del cargo..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPosition.isPending || updatePosition.isPending}>
                {(createPosition.isPending || updatePosition.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {isEditing ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
