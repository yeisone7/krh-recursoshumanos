import { useState, useEffect, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Package, User, FileText, CheckSquare, Square, Plus, Trash2, Sparkles, History, AlertTriangle, PenTool } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { SignatureCanvas } from '@/components/training/SignatureCanvas';
import { supabase } from '@/integrations/supabase/client';

import { DOTATION_PERIOD_MONTHS } from '@/types/dotation';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useCreateDotationDelivery, useDotationDeliveries } from '@/hooks/useDotation';
import { useProfesiogramaByEmployee } from '@/hooks/useDotationProfesiograma';
import { useDotationItemTypes, useSystemConfig } from '@/hooks/useSystemConfig';
import { useDotationInventory } from '@/hooks/useDotationInventory';
import type { Database } from '@/integrations/supabase/types';

type DotationItemType = Database['public']['Enums']['dotation_item_type'];

interface DotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DeliveryItem {
  selected: boolean;
  itemTypeEnum: DotationItemType;
  itemName: string;
  quantity: number;
  size?: string;
  fromProfesiograma: boolean;
}

const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const shoeSizeOptions = Array.from({ length: 13 }, (_, i) => (35 + i).toString());

export function DotationFormDialog({ open, onOpenChange, onSuccess }: DotationFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: itemTypeCatalog = [] } = useDotationItemTypes();
  const { data: allDeliveries = [] } = useDotationDeliveries();
  const { data: inventory = [] } = useDotationInventory();
  const { data: systemConfig } = useSystemConfig();
  const createDelivery = useCreateDotationDelivery();

  const inventoryEnabled = systemConfig?.dotation_inventory_enabled?.enabled !== false;
  const blockNoStock = inventoryEnabled && systemConfig?.dotation_block_no_stock?.enabled === true;

  const [employeeId, setEmployeeId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date>(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
  const [deliveredBy, setDeliveredBy] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DeliveryItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const selectedEmployee = employees.find(e => e.id === employeeId);
  const { data: profesiograma, isLoading: loadingProf } = useProfesiogramaByEmployee(employeeId || undefined);

  // When profesiograma loads, populate items
  useEffect(() => {
    if (!employeeId) {
      setItems([]);
      return;
    }
    if (profesiograma && profesiograma.items.length > 0) {
      setItems(profesiograma.items.map((pi: any) => ({
        selected: true,
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
    setDeliveryDate(new Date());
    setExpirationDate(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
    setDeliveredBy('');
    setNotes('');
    setItems([]);
    setSignatureDataUrl(null);
  };

  const addManualItem = () => {
    setItems([...items, {
      selected: true,
      itemTypeEnum: 'otros',
      itemName: '',
      quantity: 1,
      size: undefined,
      fromProfesiograma: false,
    }]);
  };

  const handleCatalogSelect = (idx: number, catalogName: string) => {
    const updated = [...items];
    updated[idx].itemTypeEnum = 'otros' as DotationItemType;
    updated[idx].itemName = catalogName;
    setItems(updated);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof DeliveryItem, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
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
    const invalidItems = selectedItems.filter(i => !i.itemName.trim());
    if (invalidItems.length > 0) {
      toast.error('Todos los artículos deben tener nombre');
      return;
    }

    // Stock validation if blocking is enabled
    if (blockNoStock) {
      const stockIssues: string[] = [];
      for (const item of selectedItems) {
        const matchingInventory = inventory.find((inv: any) =>
          inv.item_name === item.itemName &&
          (!item.size || inv.size === item.size)
        );
        if (!matchingInventory || matchingInventory.quantity_available < item.quantity) {
          const available = matchingInventory?.quantity_available || 0;
          stockIssues.push(`${item.itemName}${item.size ? ` (${item.size})` : ''}: disponible ${available}, solicitado ${item.quantity}`);
        }
      }
      if (stockIssues.length > 0) {
        toast.error('Stock insuficiente', {
          description: stockIssues.join('. '),
          duration: 6000,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      for (const item of selectedItems) {
        await createDelivery.mutateAsync({
          employee_id: employeeId,
          item_type: item.itemTypeEnum,
          item_name: item.itemName,
          quantity: item.quantity,
          size: item.size || null,
          delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
          expiration_date: format(expirationDate, 'yyyy-MM-dd'),
          delivered_by: deliveredBy,
          observations: notes || null,
          signature_url: null,
        });
      }

      const employeeName = selectedEmployee ? getEmployeeFullName(selectedEmployee) : 'el empleado';
      toast.success('Entrega registrada', {
        description: `Se registraron ${selectedItems.length} artículo(s) para ${employeeName}.`,
      });

      onOpenChange(false);
      handleReset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating dotation delivery:', error);
      toast.error('Error al registrar entrega', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFootwear = (type: string) => type === 'calzado_seguridad' || type === 'calzado_dielectrico';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Nueva Entrega de Dotación
          </DialogTitle>
          <DialogDescription>
            Registra una nueva entrega de dotación a un empleado
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="employee" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mb-4 bg-primary/5 border border-primary/10">
            <TabsTrigger value="employee" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4" /> Empleado
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <Package className="w-4 h-4" /> Artículos
              {selectedItems.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs bg-secondary text-secondary-foreground">{selectedItems.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delivery" className="gap-2 data-[state=active]:bg-tertiary data-[state=active]:text-white">
              <FileText className="w-4 h-4" /> Entrega
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-2">
            {/* Employee Tab */}
            <TabsContent value="employee" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Empleado *</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent className="bg-background max-h-[200px]">
                    {employees.filter(e => e.is_active).map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {getEmployeeFullName(emp)} - {emp.document_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Documento:</span>
                    <span className="font-medium">{selectedEmployee.document_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Centro de Operación:</span>
                    <span className="font-medium">
                      {selectedEmployee.operation_centers?.name || 'No asignado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cargo:</span>
                    <span className="font-medium">{selectedEmployee.work_info?.position_name || 'Sin cargo'}</span>
                  </div>
                </div>
              )}

              {employeeId && loadingProf && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Buscando profesiograma...
                </div>
              )}

              {employeeId && !loadingProf && profesiograma && profesiograma.items.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-primary">Profesiograma encontrado</p>
                    <p className="text-muted-foreground">
                      Se cargaron {profesiograma.items.length} artículo(s) sugeridos. Revísalos en la pestaña "Artículos".
                    </p>
                  </div>
                </div>
              )}

              {employeeId && !loadingProf && (!profesiograma || profesiograma.items.length === 0) && (
                <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm text-muted-foreground">
                  No hay profesiograma configurado para este centro + cargo. Puedes agregar artículos manualmente en la pestaña "Artículos".
                </div>
              )}
              {/* Employee delivery history */}
              {employeeId && (() => {
                const empDeliveries = allDeliveries.filter((d: any) => d.employee_id === employeeId);
                if (empDeliveries.length === 0) return null;
                const recent = empDeliveries.slice(0, 5);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <History className="w-4 h-4" />
                      Últimas entregas ({empDeliveries.length} total)
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs py-2">Artículo</TableHead>
                            <TableHead className="text-xs py-2">Fecha</TableHead>
                            <TableHead className="text-xs py-2">Vencimiento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recent.map((d: any) => (
                            <TableRow key={d.id}>
                              <TableCell className="text-xs py-1.5">{d.item_name}</TableCell>
                              <TableCell className="text-xs py-1.5">{format(new Date(d.delivery_date), 'dd/MM/yyyy')}</TableCell>
                              <TableCell className="text-xs py-1.5">{format(new Date(d.expiration_date), 'dd/MM/yyyy')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })()}
            </TabsContent>
            <TabsContent value="items" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <Label>Artículos a entregar</Label>
                <Button type="button" variant="outline" size="sm" onClick={addManualItem} className="gap-1">
                  <Plus className="w-3 h-3" /> Agregar Manual
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {employeeId
                      ? 'No hay artículos sugeridos. Agrega manualmente.'
                      : 'Selecciona un empleado primero.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'border rounded-lg p-3 space-y-2 transition-colors',
                        item.selected ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20 opacity-60'
                      )}
                    >
                       <div className="flex items-center gap-3 flex-wrap">
                         <Checkbox
                           checked={item.selected}
                           onCheckedChange={(v) => updateItem(idx, 'selected', !!v)}
                         />
                         {item.fromProfesiograma ? (
                           <div className="flex-1 flex items-center gap-2 min-w-0">
                             <span className="font-medium text-sm truncate">{item.itemName}</span>
                             <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                               <Sparkles className="w-3 h-3" /> Sugerido
                             </Badge>
                           </div>
                         ) : (
                           <div className="flex-1 min-w-[180px]">
                             <SearchableSelect
                               options={itemTypeCatalog
                                 .filter((c: any) => c.is_active)
                                 .map((c: any) => ({ value: c.name, label: c.name }))}
                               value={item.itemName || undefined}
                               onValueChange={(v) => handleCatalogSelect(idx, v)}
                               placeholder="Seleccionar artículo"
                               searchPlaceholder="Buscar artículo..."
                               emptyMessage="No se encontraron artículos"
                               triggerClassName="h-9"
                             />
                           </div>
                         )}
                         <div className="flex items-center gap-2 shrink-0">
                           <Input
                             type="number"
                             min={1}
                             value={item.quantity}
                             onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                             className="h-9 w-16"
                           />
                           <Select
                             value={item.size || '__none__'}
                             onValueChange={(v) => updateItem(idx, 'size', v === '__none__' ? undefined : v)}
                           >
                             <SelectTrigger className="h-9 w-20">
                               <SelectValue placeholder="Talla" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="__none__">—</SelectItem>
                               {(isFootwear(item.itemTypeEnum) ? shoeSizeOptions : sizeOptions).map(s => (
                                 <SelectItem key={s} value={s}>{s}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeItem(idx)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Delivery Tab */}
            <TabsContent value="delivery" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <Label>Fecha de Entrega *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !deliveryDate && 'text-muted-foreground'
                        )}
                      >
                        {deliveryDate ? format(deliveryDate, 'PPP', { locale: es }) : 'Seleccionar'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background" align="start">
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
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col space-y-2">
                  <Label>Fecha de Vencimiento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !expirationDate && 'text-muted-foreground'
                        )}
                      >
                        {expirationDate ? format(expirationDate, 'PPP', { locale: es }) : 'Seleccionar'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background" align="start">
                      <Calendar
                        mode="single"
                        selected={expirationDate}
                        onSelect={(date) => date && setExpirationDate(date)}
                        disabled={(date) => date <= deliveryDate}
                        locale={es}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Por ley, la dotación vence cada {DOTATION_PERIOD_MONTHS} meses
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Entregado por *</Label>
                <Input
                  placeholder="Nombre de quien entrega"
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  placeholder="Observaciones adicionales sobre la entrega..."
                  className="resize-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm text-muted-foreground flex items-center gap-2">
                <PenTool className="w-4 h-4 shrink-0" />
                La firma del empleado se captura al descargar el Acta de Entrega en PDF.
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t border-primary/10 mt-4">
          <Button variant="outline" onClick={() => { handleReset(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gap-2 bg-gradient-to-r from-primary to-primary/85 hover:from-primary/90 hover:to-primary/75 shadow-md" disabled={isSubmitting}>
            <Package className="w-4 h-4" />
            {isSubmitting ? 'Registrando...' : `Registrar ${selectedItems.length > 0 ? `(${selectedItems.length})` : 'Entrega'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
