import { useState, useEffect } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { CalendarIcon, Package, CheckSquare, Plus, Trash2, Sparkles, History, AlertTriangle, PenTool, Loader2 } from 'lucide-react';

import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

import './DotationFormDialog.css';

import { DOTATION_PERIOD_MONTHS } from '@/types/dotation';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useCreateDotationDeliveryBatch, useDotationDeliveries } from '@/hooks/useDotation';
import { useProfesiogramaByEmployee } from '@/hooks/useDotationProfesiograma';
import { useDotationItemTypes, useSystemConfig } from '@/hooks/useSystemConfig';
import { useDotationInventory } from '@/hooks/useDotationInventory';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';
import { getDotationSizeSuggestions, getInventorySizeSuggestions } from '@/lib/dotationSizes';

type DotationItemType = Database['public']['Enums']['dotation_item_type'];

interface DotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DeliveryItem {
  selected: boolean;
  itemTypeId: string;
  itemTypeEnum: DotationItemType;
  itemName: string;
  quantity: number;
  size?: string;
  fromProfesiograma: boolean;
}

export function DotationFormDialog({ open, onOpenChange, onSuccess }: DotationFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: itemTypeCatalog = [] } = useDotationItemTypes();
  const { data: allDeliveries = [] } = useDotationDeliveries();
  const { data: inventory = [], isLoading: loadingInventory, isError: inventoryError } = useDotationInventory();
  const { data: centers = [] } = useOperationCenters();
  const { assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const { data: systemConfig } = useSystemConfig();
  const createDeliveryBatch = useCreateDotationDeliveryBatch();

  const inventoryEnabled = systemConfig?.dotation_inventory_enabled?.enabled !== false;
  const deductInventory = inventoryEnabled && systemConfig?.dotation_auto_deduct?.enabled !== false;
  const blockNoStock = deductInventory && systemConfig?.dotation_block_no_stock?.enabled === true;
  const canUseGeneral = isAdmin || isSuperAdmin || assignedCenterIds.length === 0;

  const [employeeId, setEmployeeId] = useState('');
  const [inventorySource, setInventorySource] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date>(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
  const [deliveredBy, setDeliveredBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const sourceOptions = [
    ...(canUseGeneral ? [{ value: 'general', label: 'Inventario General' }] : []),
    ...centers.filter(center => center.is_active).map(center => ({ value: center.id, label: center.name })),
  ];
  const sourceLabel = sourceOptions.find(source => source.value === inventorySource)?.label;
  const sourceInventory = inventory.filter(row => (
    row.operation_center_id === (inventorySource === 'general' ? null : inventorySource)
  ));
  const { data: profesiograma, isLoading: loadingProf } = useProfesiogramaByEmployee(employeeId || undefined);

  // When profesiograma loads, populate items
  useEffect(() => {
    if (!employeeId) {
      setItems([]);
      return;
    }
    if (profesiograma && profesiograma.items.length > 0) {
      setItems(profesiograma.items.map((pi) => ({
        selected: true,
        itemTypeId: pi.dotation_item_type_id,
        itemTypeEnum: 'otros' as DotationItemType, // will use catalog name
        itemName: pi.dotation_item_types?.name || 'Artículo',
        quantity: pi.quantity,
        size: undefined,
        fromProfesiograma: true,
      })));
    } else if (!loadingProf) {
      // No profesiograma found — start empty
      setItems([]);
    }
  }, [profesiograma, employeeId, loadingProf]);

  const handleReset = () => {
    setEmployeeId('');
    setInventorySource('');
    setDeliveryDate(new Date());
    setExpirationDate(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
    setDeliveredBy('');
    setNotes('');
    setItems([]);
  };

  const addManualItem = () => {
    setItems([...items, {
      selected: true,
      itemTypeId: '',
      itemTypeEnum: 'otros',
      itemName: '',
      quantity: 1,
      size: undefined,
      fromProfesiograma: false,
    }]);
  };

  const handleCatalogSelect = (idx: number, itemTypeId: string) => {
    const updated = [...items];
    const catalogItem = itemTypeCatalog.find((item) => item.id === itemTypeId);
    updated[idx].itemTypeId = itemTypeId;
    updated[idx].itemTypeEnum = 'otros' as DotationItemType;
    updated[idx].itemName = catalogItem?.name || '';
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = <K extends keyof DeliveryItem>(idx: number, field: K, value: DeliveryItem[K]) => {
    setItems(current => current.map((item, index) => index === idx ? { ...item, [field]: value } : item));
  };

  const selectedItems = items.filter(i => i.selected);

  const handleSubmit = async () => {
    if (!employeeId) {
      toast.error('Selecciona un empleado');
      return;
    }
    if (!deliveredBy.trim()) {
      toast.error('Indica quién entrega');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Selecciona al menos un artículo');
      return;
    }
    const invalidItems = selectedItems.filter(i => !i.itemTypeId || !i.itemName.trim());
    if (invalidItems.length > 0) {
      toast.error('Todos los artículos deben tener nombre');
      return;
    }

    if (deductInventory && (!inventorySource || !sourceLabel)) {
      toast.error('Selecciona el centro o bodega de origen');
      return;
    }
    if (deductInventory && (loadingInventory || inventoryError)) {
      toast.error(loadingInventory ? 'Espera a que cargue el inventario' : 'No se pudo consultar el inventario');
      return;
    }

    // Validate the selected source only; accumulate duplicate article lines.
    if (blockNoStock) {
      const stockIssues: string[] = [];
      const requested = new Map<string, number>();
      for (const item of selectedItems) {
        const size = item.size?.trim() || null;
        const key = JSON.stringify([item.itemTypeId, item.itemName.trim(), size]);
        const quantity = (requested.get(key) || 0) + item.quantity;
        requested.set(key, quantity);
        const matchingInventory = sourceInventory.find((inv) =>
          inv.item_type === item.itemTypeId
          && inv.item_name === item.itemName.trim()
          && inv.size === size
        );
        if (!matchingInventory || matchingInventory.quantity_available < quantity) {
          const available = matchingInventory?.quantity_available || 0;
          stockIssues.push(`${item.itemName}${size ? ` (${size})` : ''}: disponible ${available}, solicitado ${quantity}`);
        }
      }
      if (stockIssues.length > 0) {
        toast.error('Stock insuficiente', {
          description: `${sourceLabel}: ${stockIssues.join('. ')}`,
          duration: 6000,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createDeliveryBatch.mutateAsync({
        employee_id: employeeId,
        delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
        expiration_date: format(expirationDate, 'yyyy-MM-dd'),
        delivered_by: deliveredBy,
        observations: notes || null,
        items: selectedItems.map((item) => ({
          dotation_item_type_id: item.itemTypeId,
          item_type: item.itemTypeEnum,
          item_name: item.itemName,
          quantity: item.quantity,
          size: item.size?.trim() || null,
          ...(deductInventory ? {
            source_operation_center_id: inventorySource === 'general' ? null : inventorySource,
          } : {}),
        })),
      });

      const employeeName = selectedEmployee ? getEmployeeFullName(selectedEmployee) : 'el empleado';
      toast.success('Entrega registrada', {
        description: `Se registraron ${selectedItems.length} artículo(s) para ${employeeName}.`,
      });

      onOpenChange(false);
      handleReset();
      onSuccess?.();
    } catch (error: unknown) {
      console.error('Error creating dotation delivery:', error);
      toast.error('Error al registrar entrega', {
        description: error instanceof Error ? error.message : 'Por favor intenta de nuevo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="dotation-form-dialog flex w-[calc(100vw-1rem)] flex-col gap-0 sm:max-w-[58.8rem] bg-background">
        <div className="flex shrink-0 items-center gap-3 border-b px-5 py-4 pr-12 sm:px-6 sm:pr-12">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-xl font-semibold tracking-tight">Nueva entrega de dotación</DialogTitle>
            <DialogDescription className="mt-1 text-sm">Asigna los artículos y registra la entrega al empleado.</DialogDescription>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <section aria-labelledby="delivery-recipient-heading" className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">01</span>
              <h3 id="delivery-recipient-heading" className="text-sm font-semibold">Empleado y origen</h3>
              <span className="ml-auto text-xs text-muted-foreground">* Obligatorio</span>
            </div>
            <div className={cn("grid gap-4", deductInventory && "sm:grid-cols-2")}>
              <div className="space-y-2">
                <Label>Empleado que recibe *</Label>
                <SearchableSelect
                  options={employees.filter(emp => emp.is_active).map(emp => ({
                    value: emp.id,
                    label: `${getEmployeeFullName(emp)} - ${emp.document_number}`,
                  }))}
                  value={employeeId}
                  onValueChange={setEmployeeId}
                  placeholder="Seleccionar colaborador"
                  searchPlaceholder="Buscar por nombre o documento..."
                  emptyMessage="No se encontraron empleados activos."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Busca por nombre o número de documento.</p>
              </div>
          {deductInventory && (
            <div className="space-y-2">
              <Label>Centro o bodega de origen *</Label>
              <SearchableSelect
                options={sourceOptions}
                value={inventorySource}
                onValueChange={setInventorySource}
                placeholder="Seleccionar centro o bodega"
                searchPlaceholder="Buscar centro o bodega..."
                disabled={isSubmitting}
                triggerClassName="h-10 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Las existencias se descontarán únicamente de este origen.
              </p>
              {loadingInventory && <p className="text-xs text-muted-foreground">Cargando inventario...</p>}
              {inventoryError && <p className="text-xs text-destructive">No se pudo consultar el inventario. Vuelve a abrir la entrega para reintentar.</p>}
            </div>
          )}
            </div>
                {selectedEmployee && (
                  <div className="bg-muted/40 px-4 py-3 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Documento</p>
                        <p className="font-semibold text-sm">{selectedEmployee.document_number}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Centro</p>
                        <p className="font-semibold text-sm break-words">{selectedEmployee.operation_centers?.name || 'No asignado'}</p>
                      </div>
                      <div className="space-y-1 col-span-2 sm:col-span-1">
                        <p className="text-xs font-medium text-muted-foreground">Cargo actual</p>
                        <p className="font-semibold text-sm">{selectedEmployee.work_info?.position_name || 'Sin cargo'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {employeeId && loadingProf && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-border animate-pulse">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-primary">Analizando profesiograma...</span>
                  </div>
                )}

                {employeeId && !loadingProf && profesiograma && profesiograma.items.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-3">
                    <div className="text-primary">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-primary">Dotación sugerida cargada</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Se han precargado {profesiograma.items.length} artículos basados en el perfil del cargo.
                      </p>
                    </div>
                  </div>
                )}

                {employeeId && !loadingProf && (!profesiograma || profesiograma.items.length === 0) && (
                  <div className="bg-muted/40 rounded-lg p-3 flex items-start gap-3">
                    <div className="text-muted-foreground">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-foreground">Sin profesiograma</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Agrega los artículos que recibirá este empleado en la siguiente sección.
                      </p>
                    </div>
                  </div>
                )}

                {employeeId && (() => {
                  const empDeliveries = allDeliveries.filter((d) => d.employee_id === employeeId);
                  if (empDeliveries.length === 0) return null;
                  const recent = empDeliveries.slice(0, 3);
                  return (
                    <details className="space-y-3">
                      <summary className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                        <History className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Historial reciente</span>
                      </summary>
                      <div className="rounded-2xl border border-border/50 overflow-hidden bg-background">
                        <Table>
                          <TableBody>
                            {recent.map((d) => (
                              <TableRow key={d.id} className="hover:bg-background transition-colors">
                                <TableCell className="py-3 px-4 font-medium text-xs">{d.item_name}</TableCell>
                                <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                                  {formatDateOnly(d.delivery_date, 'dd/MM/yy')}
                                </TableCell>
                                <TableCell className="py-3 px-4 text-right">
                                  <Badge variant="outline" className="text-[10px] rounded-full border-border/50">
                                    {formatDateOnly(d.expiration_date, 'dd/MM/yy')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  );
                })()}
          </section>

              <section aria-labelledby="delivery-items-heading" className="mt-5 space-y-3 border-t pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">02</span>
                    <h3 id="delivery-items-heading" className="text-sm font-semibold">Artículos a entregar</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addManualItem}
                    disabled={isSubmitting || !employeeId}
                    className="h-9 shrink-0 rounded-lg gap-1.5 text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/20 px-4 py-5">
                    <div className="text-muted-foreground">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium text-sm text-foreground">Aún no hay artículos</p>
                      <p className="text-xs text-muted-foreground">
                        {employeeId ? 'Añada artículos manualmente para continuar' : 'Seleccione un empleado primero'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'group relative rounded-lg border p-3 transition-colors',
                          item.selected
                            ? 'bg-background border-border'
                            : 'bg-background border-border/50 opacity-60 grayscale-[0.5]'
                        )}
                      >
                         <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                           <div className="flex items-center gap-3 shrink-0">
                             <Checkbox
                               aria-label={`Incluir ${item.itemName || 'artículo'}`}
                               checked={item.selected}
                               onCheckedChange={(v) => updateItem(idx, 'selected', !!v)}
                               className="h-5 w-5 rounded-md border-border/50 data-[state=active]:bg-primary data-[state=active]:border-primary"
                             />
                           </div>

                           <div className="flex-1 min-w-0">
                             {item.fromProfesiograma ? (
                               <div className="flex items-center gap-2">
                                 <p className="font-bold text-sm truncate text-foreground">{item.itemName}</p>
                                 <Badge variant="outline" className="text-[9px] uppercase tracking-tighter text-primary border-primary/20 rounded-full h-4">
                                   Sugerido
                                 </Badge>
                               </div>
                             ) : (
                               <SearchableSelect
                                  options={itemTypeCatalog
                                    .filter((c) => c.is_active)
                                    .map((c) => ({ value: c.id, label: c.name }))}
                                  value={item.itemTypeId || undefined}
                                 onValueChange={(v) => handleCatalogSelect(idx, v)}
                                 placeholder="Buscar artículo..."
                                 triggerClassName="h-10 rounded-xl bg-background border-border/50"
                               />
                             )}
                           </div>

                            <div className="grid grid-cols-[80px_1fr_40px] items-center gap-3 sm:flex sm:shrink-0">
                             <div className="space-y-1">
                               <span className="text-xs text-muted-foreground">Cantidad</span>
                               <Input
                                 type="number"
                                 aria-label={`Cantidad de ${item.itemName || 'artículo'}`}
                                 min={1}
                                 value={item.quantity}
                                 onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                 className="h-10 w-full sm:w-20 rounded-xl bg-background border-border/50 text-center font-bold"
                               />
                             </div>
                             <div className="space-y-1">
                               <span className="text-xs text-muted-foreground">Talla</span>
                               <Input
                                 value={item.size || ''}
                                 onChange={(event) => updateItem(idx, 'size', event.target.value || undefined)}
                                 list={`delivery-size-suggestions-${idx}`}
                                 aria-label={`Talla de ${item.itemName || 'artículo'}`}
                                 placeholder="Talla"
                                 className="h-10 w-full sm:w-24 rounded-xl bg-background border-border/50 font-semibold"
                               />
                                <datalist id={`delivery-size-suggestions-${idx}`}>
                                  {(() => {
                                    const inventorySizes = getInventorySizeSuggestions(
                                      inventorySource && deductInventory ? sourceInventory : inventory,
                                      item.itemTypeId,
                                    );
                                    const suggestions = inventorySizes.length > 0
                                      ? inventorySizes
                                      : getDotationSizeSuggestions(
                                        itemTypeCatalog.find((catalogItem) => catalogItem.id === item.itemTypeId),
                                      );

                                    return suggestions.map((size) => <option key={size} value={size} />);
                                  })()}
                                </datalist>
                             </div>
                             <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Eliminar ${item.itemName || 'artículo'}`}
                              className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                              onClick={() => removeItem(idx)}
                             >
                               <Trash2 className="w-4 h-4" />
                             </Button>
                           </div>
                         </div>
                         {deductInventory && inventorySource && item.itemTypeId && !loadingInventory && !inventoryError && (
                           <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                             Disponible en {sourceLabel}: {sourceInventory.find(row => (
                               row.item_type === item.itemTypeId
                               && row.item_name === item.itemName.trim()
                               && row.size === (item.size?.trim() || null)
                             ))?.quantity_available ?? 0}
                           </p>
                         )}
                      </div>
                    ))}
                  </div>
                )}
          </section>

          <section aria-labelledby="delivery-details-heading" className="mt-5 space-y-4 border-t pt-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">03</span>
              <h3 id="delivery-details-heading" className="text-sm font-semibold">Datos de la entrega</h3>
            </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Fecha de entrega *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'h-10 w-full px-3 text-left font-normal rounded-lg bg-background border-border/50',
                            !deliveryDate && 'text-muted-foreground'
                          )}
                        >
                          {deliveryDate ? format(deliveryDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                          <CalendarIcon className="ml-auto h-4 w-4 text-primary opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border-border/50 rounded-2xl shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={deliveryDate}
                          onSelect={(date) => {
                            if (date) {
                              setDeliveryDate(date);
                              setExpirationDate(addMonths(date, DOTATION_PERIOD_MONTHS));
                            }
                          }}
                          locale={es}
                          initialFocus
                          className="rounded-2xl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Vencimiento sugerido</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'h-10 w-full px-3 text-left font-normal rounded-lg bg-background border-border/50',
                            !expirationDate && 'text-muted-foreground'
                          )}
                        >
                          {expirationDate ? format(expirationDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                          <CalendarIcon className="ml-auto h-4 w-4 text-primary opacity-70" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background border-border/50 rounded-2xl shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={expirationDate}
                          onSelect={(date) => date && setExpirationDate(date)}
                          disabled={(date) => date <= deliveryDate}
                          locale={es}
                          initialFocus
                          className="rounded-2xl"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1.5 ml-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      Vigencia sugerida: {DOTATION_PERIOD_MONTHS} meses
                    </p>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="dotation-delivered-by" className="text-sm font-medium text-foreground">Entregado por *</Label>
                  <Input
                    id="dotation-delivered-by"
                    placeholder="Nombre del responsable de almacén"
                    value={deliveredBy}
                    onChange={(e) => setDeliveredBy(e.target.value)}
                    className="h-10 rounded-lg bg-background border-border/50 focus:ring-primary/20 font-medium"
                  />
                </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dotation-notes" className="text-sm font-medium text-foreground">Observaciones <span className="font-normal text-muted-foreground">(opcional)</span></Label>
                  <Textarea
                    id="dotation-notes"
                    placeholder="Notas adicionales sobre el estado de la dotación o condiciones de entrega..."
                    className="resize-none rounded-xl bg-background border-border/50 focus:ring-primary/20 min-h-[76px] p-3 font-medium"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="rounded-lg bg-muted/40 px-3 py-2.5 flex items-center gap-3">
                  <div className="text-muted-foreground">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">Acta de entrega</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Después de registrar la entrega podrás generar el acta y solicitar la firma.
                    </p>
                  </div>
                </div>
          </section>
        </div>

        <div className="shrink-0 border-t bg-muted/30 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              <span className="font-semibold text-foreground tabular-nums">{selectedItems.length}</span> {selectedItems.length === 1 ? 'artículo' : 'artículos'}
              <span className="mx-2" aria-hidden="true">·</span>
              <span className="font-semibold text-foreground tabular-nums">{selectedItems.reduce((total, item) => total + item.quantity, 0)}</span> unidades
            </p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="ghost"
            onClick={() => { handleReset(); onOpenChange(false); }}
            disabled={isSubmitting}
            className="h-10 flex-1 rounded-lg px-4 text-sm font-medium sm:flex-none"
          >
            Descartar
          </Button>
          <Button
            onClick={handleSubmit}
            className="h-10 flex-1 rounded-lg px-5 gap-2 text-sm font-semibold sm:flex-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                Finalizar Entrega
              </>
            )}
          </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
