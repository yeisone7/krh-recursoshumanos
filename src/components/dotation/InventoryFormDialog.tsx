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
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCreateInventoryItem, useUpdateInventoryItem, type DotationInventoryItem } from '@/hooks/useDotationInventory';
import { useDotationItemTypes } from '@/hooks/useSystemConfig';
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
  const { data: dotationItemTypes = [] } = useDotationItemTypes();

  const activeItemTypes = (dotationItemTypes as any[])?.filter((t: any) => t.is_active !== false) || [];

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
        size: editItem.size || '',
        quantity_available: editItem.quantity_available,
        minimum_stock: editItem.minimum_stock,
      });
    } else {
      form.reset({
        operation_center_id: '',
        item_type: '',
        size: '',
        quantity_available: 0,
        minimum_stock: 0,
      });
    }
  }, [editItem, open, form]);

  const selectedItemType = form.watch('item_type');
  const selectedTypeData = activeItemTypes.find((t: any) => t.id === selectedItemType);
  const isFootwear = selectedTypeData?.category?.toLowerCase()?.includes('calzado');

  const handleSubmit = async (values: any) => {
    try {
      const selectedType = activeItemTypes.find((t: any) => t.id === values.item_type);
      const payload = {
        operation_center_id: values.operation_center_id || null,
        item_type: values.item_type,
        item_name: selectedType?.name || values.item_type,
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
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="pr-12">
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {editItem ? 'Editar Artículo' : 'Nuevo Artículo de Inventario'}
          </DialogTitle>
          <DialogDescription>
            {editItem ? 'Modifica los datos del artículo' : 'Agrega un nuevo artículo al inventario de dotación'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 overflow-y-auto pr-1">
            <FormField
              control={form.control}
              name="operation_center_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Centro de Operación</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === '__general__' ? '' : v)} value={field.value || '__general__'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="General (todos los centros)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__general__">General</SelectItem>
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
              rules={{ required: 'Seleccione el tipo de dotación' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Dotación *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={activeItemTypes.map((t: any) => ({
                        value: t.id,
                        label: `${t.name}${t.code ? ` (${t.code})` : ''}`,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Seleccionar tipo de dotación"
                      searchPlaceholder="Buscar tipo..."
                      emptyMessage="No se encontraron tipos de dotación."
                    />
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
                  <Select onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)} value={field.value || '__none__'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin talla" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Sin talla</SelectItem>
                      {(isFootwear ? shoeSizeOptions : sizeOptions).map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <div className="grid grid-cols-1 gap-3 pt-4 border-t sm:flex sm:justify-end">
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
