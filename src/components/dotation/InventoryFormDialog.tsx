import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { dotationItemTypeLabels } from '@/types/dotation';
import { useCreateInventoryItem, useUpdateInventoryItem, type DotationInventoryItem } from '@/hooks/useDotationInventory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface InventoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: DotationInventoryItem | null;
}

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const shoeSizeOptions = Array.from({ length: 13 }, (_, i) => (35 + i).toString());

export function InventoryFormDialog({ open, onOpenChange, editItem }: InventoryFormDialogProps) {
  const { currentCompanyId } = useAuth();
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const { data: centers = [] } = useQuery({
    queryKey: ['operation_centers_list', currentCompanyId],
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const { data } = await (supabase as any).from('operation_centers').select('id, name').eq('company_id', currentCompanyId!).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!currentCompanyId,
  });

  const form = useForm({
    defaultValues: {
      operation_center_id: '',
      item_type: '',
      item_name: '',
      size: '',
      quantity_available: 0,
      minimum_stock: 0,
    },
  });

  useEffect(() => {
    if (editItem) {
      form.reset({
        operation_center_id: editItem.operation_center_id || '',
        item_type: editItem.item_type,
        item_name: editItem.item_name,
        size: editItem.size || '',
        quantity_available: editItem.quantity_available,
        minimum_stock: editItem.minimum_stock,
      });
    } else {
      form.reset({
        operation_center_id: '',
        item_type: '',
        item_name: '',
        size: '',
        quantity_available: 0,
        minimum_stock: 0,
      });
    }
  }, [editItem, open, form]);

  const selectedItemType = form.watch('item_type');
  const isFootwear = selectedItemType === 'calzado_seguridad' || selectedItemType === 'calzado_dielectrico';

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        operation_center_id: values.operation_center_id || null,
        item_type: values.item_type,
        item_name: values.item_name,
        size: values.size || null,
        quantity_available: values.quantity_available,
        minimum_stock: values.minimum_stock,
      };

      if (editItem) {
        await updateItem.mutateAsync({ id: editItem.id, ...payload });
        toast.success('Artículo actualizado');
      } else {
        await createItem.mutateAsync(payload);
        toast.success('Artículo agregado al inventario');
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error', { description: error.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {editItem ? 'Editar Artículo' : 'Nuevo Artículo de Inventario'}
          </DialogTitle>
          <DialogDescription>
            {editItem ? 'Modifica los datos del artículo' : 'Agrega un nuevo artículo al inventario de dotación'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="operation_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Operación</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="General (todos los centros)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">General</SelectItem>
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="item_type"
              rules={{ required: 'Seleccione el tipo' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Artículo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(dotationItemTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="item_name"
              rules={{ required: 'El nombre es requerido' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Artículo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Camisa polo azul corporativa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Talla</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin talla" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Sin talla</SelectItem>
                      {(isFootwear ? shoeSizeOptions : sizeOptions).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
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
                name="quantity_available"
                rules={{ min: { value: 0, message: 'Mínimo 0' } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad Disponible *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimum_stock"
                rules={{ min: { value: 0, message: 'Mínimo 0' } }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                {editItem ? 'Guardar Cambios' : 'Agregar al Inventario'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
