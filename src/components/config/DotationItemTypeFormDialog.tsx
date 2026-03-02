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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateDotationItemType, useUpdateDotationItemType } from '@/hooks/useSystemConfig';
import { DOTATION_CATEGORIES, STANDARD_SIZES, SHOE_SIZES } from '@/types/config';
import type { DotationItemType } from '@/types/config';

const dotationItemTypeSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  category: z.string().min(1, 'La categoría es requerida'),
  default_validity_months: z.number().min(1).max(60).default(12),
  requires_size: z.boolean().default(true),
  sizes_available: z.array(z.string()).optional(),
  description: z.string().optional(),
});

type DotationItemTypeFormData = z.infer<typeof dotationItemTypeSchema>;

interface DotationItemTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType?: DotationItemType | null;
}

export function DotationItemTypeFormDialog({ 
  open, 
  onOpenChange, 
  itemType 
}: DotationItemTypeFormDialogProps) {
  const isEditing = !!itemType;
  const createItemType = useCreateDotationItemType();
  const updateItemType = useUpdateDotationItemType();

  const form = useForm<DotationItemTypeFormData>({
    resolver: zodResolver(dotationItemTypeSchema),
    defaultValues: itemType ? {
      name: itemType.name,
      code: itemType.code || '',
      category: itemType.category,
      default_validity_months: itemType.default_validity_months,
      requires_size: itemType.requires_size,
      sizes_available: itemType.sizes_available || [],
      description: itemType.description || '',
    } : {
      name: '',
      code: '',
      category: 'uniforme',
      default_validity_months: 12,
      requires_size: true,
      sizes_available: STANDARD_SIZES,
      description: '',
    },
  });

  const category = form.watch('category');
  const requiresSize = form.watch('requires_size');

  const onSubmit = async (data: DotationItemTypeFormData) => {
    try {
      const payload = {
        name: data.name,
        code: data.code || undefined,
        category: data.category,
        default_validity_months: data.default_validity_months,
        requires_size: data.requires_size,
        sizes_available: data.requires_size ? data.sizes_available : undefined,
        description: data.description || undefined,
      };

      if (isEditing) {
        await updateItemType.mutateAsync({ id: itemType.id, ...payload });
        toast.success('Tipo de dotación actualizado');
      } else {
        await createItemType.mutateAsync(payload);
        toast.success('Tipo de dotación creado');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error('Error', {
        description: error.message || 'No se pudo guardar el tipo de dotación',
      });
    }
  };

  // Get default sizes based on category
  const getDefaultSizes = () => {
    if (category === 'calzado') return SHOE_SIZES;
    return STANDARD_SIZES;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tipo de Dotación' : 'Nuevo Tipo de Dotación'}
          </DialogTitle>
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
                    <Input placeholder="Camisa Polo" {...field} />
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
                      <Input placeholder="CPOLO" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Update sizes when category changes
                        if (value === 'calzado') {
                          form.setValue('sizes_available', SHOE_SIZES);
                        } else if (value !== 'epp' && value !== 'herramientas' && value !== 'otros') {
                          form.setValue('sizes_available', STANDARD_SIZES);
                        }
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        {DOTATION_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="default_validity_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigencia por defecto (meses)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 12)}
                    />
                  </FormControl>
                  <FormDescription>
                    Meses de vigencia antes de la siguiente entrega
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requires_size"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Requiere Talla</FormLabel>
                    <FormDescription>
                      El artículo tiene variantes de talla
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {requiresSize && (
              <FormField
                control={form.control}
                name="sizes_available"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tallas Disponibles</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {getDefaultSizes().map((size) => (
                        <Button
                          key={size}
                          type="button"
                          size="sm"
                          variant={field.value?.includes(size) ? 'default' : 'outline'}
                          onClick={() => {
                            const current = field.value || [];
                            if (current.includes(size)) {
                              field.onChange(current.filter((s) => s !== size));
                            } else {
                              field.onChange([...current, size]);
                            }
                          }}
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción del artículo..."
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
              <Button type="submit" disabled={createItemType.isPending || updateItemType.isPending}>
                {(createItemType.isPending || updateItemType.isPending) && (
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
