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
      <DialogContent className="flex h-[100dvh] w-screen max-w-lg flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-2xl bg-background/95 backdrop-blur-xl">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Package className="w-7 h-7 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl truncate">
                {editItem ? 'Editar Artículo' : 'Nuevo Ingreso'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium truncate">
                {editItem ? 'Actualiza los niveles de stock y parámetros' : 'Registra un nuevo producto en el inventario'}
              </DialogDescription>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* Sección: Clasificación */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-4 w-1 rounded-full bg-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Clasificación de Inventario</h3>
                </div>

                <FormField
                  control={form.control}
                  name="operation_center_id"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Centro de Operación</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === '__general__' ? '' : v)} value={field.value || '__general__'}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background/50 font-bold text-sm shadow-sm transition-all focus:ring-primary/20">
                            <SelectValue placeholder="General (todos los centros)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="__general__" className="rounded-lg font-bold text-xs italic">General (Global)</SelectItem>
                          {centers.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="rounded-lg font-bold text-xs">{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-[10px] font-bold uppercase" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="item_type"
                  rules={{ required: 'Seleccione el tipo de dotación' }}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo de Dotación *</FormLabel>
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
                          triggerClassName="h-12 rounded-xl border-border/50 bg-background/50 font-bold text-sm"
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold uppercase" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Sección: Detalles y Stock */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-4 w-1 rounded-full bg-primary" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Especificaciones y Niveles</h3>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Talla</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)} value={field.value || '__none__'}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl border-border/50 bg-background/50 font-bold text-sm">
                              <SelectValue placeholder="Sin talla" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="__none__" className="rounded-lg font-bold text-xs">Sin talla</SelectItem>
                            {(isFootwear ? shoeSizeOptions : sizeOptions).map((s) => (
                              <SelectItem key={s} value={s} className="rounded-lg font-bold text-xs">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] font-bold uppercase" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="quantity_available"
                    rules={{ min: { value: 0, message: 'Mínimo 0' } }}
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cantidad Inicial *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-12 rounded-xl border-border/50 bg-background/50 font-black text-sm text-primary focus-visible:ring-primary/20"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold uppercase" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="minimum_stock"
                  rules={{ min: { value: 0, message: 'Mínimo 0' } }}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Punto de Reorden (Stock Mínimo)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          className="h-12 rounded-xl border-border/50 bg-background/50 font-black text-sm focus-visible:ring-primary/20"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription className="text-[9px] font-bold uppercase tracking-tight ml-1 text-muted-foreground/70">
                        Se activará una alerta cuando el inventario baje de este valor
                      </FormDescription>
                      <FormMessage className="text-[10px] font-bold uppercase" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 p-6 border-t border-border/50 bg-muted/10 sm:flex-row sm:items-center sm:justify-end">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                size="lg"
                disabled={createItem.isPending || updateItem.isPending}
                className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-lg shadow-primary/20 hover:shadow-xl hover:translate-y-[-1px] transition-all"
              >
                {createItem.isPending || updateItem.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    {editItem ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editItem ? 'Guardar Cambios' : 'Confirmar Ingreso'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
