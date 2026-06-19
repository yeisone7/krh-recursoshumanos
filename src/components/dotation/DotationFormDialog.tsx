import { useState, useEffect, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
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
import { useCreateDotationTransaction } from '@/hooks/useDotationTransactions';
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
  const createTransaction = useCreateDotationTransaction();

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
      // Create transaction header first
      const transaction = await createTransaction.mutateAsync({
        employee_id: employeeId,
        delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
        delivered_by: deliveredBy,
        observations: notes || null,
      });

      // Create delivery items linked to the transaction
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
          transaction_id: transaction.id,
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
      <DialogContent className="flex h-[100dvh] w-screen max-w-2xl flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-lg bg-background ">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Package className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl">
                Nueva Entrega
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Gestión de dotación para el personal
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
          <Tabs defaultValue="employee" className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <TabsList className="grid h-14 w-full grid-cols-3 mb-6 bg-background p-1 rounded-2xl border border-border/50">
              <TabsTrigger 
                value="employee" 
                className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300 font-bold text-xs uppercase tracking-widest"
              >
                <User className="w-4 h-4" /> <span className="hidden sm:inline">Empleado</span>
              </TabsTrigger>
              <TabsTrigger 
                value="items" 
                className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300 font-bold text-xs uppercase tracking-widest"
              >
                <Package className="w-4 h-4" /> <span className="hidden sm:inline">Artículos</span>
                {selectedItems.length > 0 && (
                  <Badge className="h-5 min-w-[20px] px-1 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center border-0">
                    {selectedItems.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="delivery" 
                className="rounded-xl gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all duration-300 font-bold text-xs uppercase tracking-widest"
              >
                <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Entrega</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              {/* Employee Tab */}
              <TabsContent value="employee" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-3">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Empleado Responsable *</Label>
                  <SearchableSelect
                    options={employees
                      .filter((emp) => emp.is_active)
                      .map((emp) => ({
                        value: emp.id,
                        label: `${getEmployeeFullName(emp)} - ${emp.document_number}`,
                      }))}
                    value={employeeId}
                    onValueChange={setEmployeeId}
                    placeholder="Seleccionar colaborador"
                    searchPlaceholder="Buscar por nombre o documento..."
                    emptyMessage="No se encontraron empleados activos."
                    triggerClassName="h-12 rounded-xl bg-background border-border/50 focus:ring-primary/20"
                    className="rounded-2xl border-border/50 bg-background shadow-2xl"
                  />
                </div>

                {selectedEmployee && (
                  <div className="bg-gradient-to-br from-muted/50 to-muted/20 p-5 rounded-2xl border border-border/50 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-foreground">Ficha de Empleado</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Documento</p>
                        <p className="font-semibold text-sm">{selectedEmployee.document_number}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Centro</p>
                        <p className="font-semibold text-sm truncate">{selectedEmployee.operation_centers?.name || 'No asignado'}</p>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargo actual</p>
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
                  <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-green-500/10 text-green-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-green-700">Dotación Sugerida Cargada</p>
                      <p className="text-xs text-green-600/80 leading-relaxed">
                        Se han precargado {profesiograma.items.length} artículos basados en el perfil del cargo.
                      </p>
                    </div>
                  </div>
                )}

                {employeeId && !loadingProf && (!profesiograma || profesiograma.items.length === 0) && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-amber-700">Sin Profesiograma</p>
                      <p className="text-xs text-amber-600/80 leading-relaxed">
                        No hay artículos predefinidos para este cargo. Por favor, agregue los ítems manualmente.
                      </p>
                    </div>
                  </div>
                )}

                {employeeId && (() => {
                  const empDeliveries = allDeliveries.filter((d: any) => d.employee_id === employeeId);
                  if (empDeliveries.length === 0) return null;
                  const recent = empDeliveries.slice(0, 3);
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-1">
                        <History className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Historial Reciente</span>
                      </div>
                      <div className="rounded-2xl border border-border/50 overflow-hidden bg-background">
                        <Table>
                          <TableBody>
                            {recent.map((d: any) => (
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
                    </div>
                  );
                })()}
              </TabsContent>

              <TabsContent value="items" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-1">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Artículos de Dotación</Label>
                    <p className="text-[10px] text-muted-foreground">Seleccione los ítems que entregará</p>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addManualItem} 
                    className="h-9 rounded-xl gap-1.5 font-bold text-xs hover:hover:text-primary transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar Ítem
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-background border-2 border-dashed border-border/50 rounded-[2.5rem] text-center space-y-4">
                    <div className="p-4 rounded-full bg-background shadow-sm">
                      <Package className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-muted-foreground">Lista Vacía</p>
                      <p className="text-xs text-muted-foreground/60 max-w-[200px] mx-auto">
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
                          'group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300',
                          item.selected 
                            ? 'bg-primary/[0.03] border-primary/20 shadow-sm' 
                            : 'bg-background border-border/50 opacity-60 grayscale-[0.5]'
                        )}
                      >
                         <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                           <div className="flex items-center gap-3 shrink-0">
                             <Checkbox
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
                                   .filter((c: any) => c.is_active)
                                   .map((c: any) => ({ value: c.name, label: c.name }))}
                                 value={item.itemName || undefined}
                                 onValueChange={(v) => handleCatalogSelect(idx, v)}
                                 placeholder="Buscar artículo..."
                                 triggerClassName="h-10 rounded-xl bg-background border-border/50"
                               />
                             )}
                           </div>

                            <div className="grid grid-cols-[80px_1fr_40px] items-center gap-3 sm:flex sm:shrink-0">
                             <div className="space-y-1">
                               <Input
                                 type="number"
                                 min={1}
                                 value={item.quantity}
                                 onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                 className="h-10 w-full sm:w-20 rounded-xl bg-background border-border/50 text-center font-bold"
                               />
                             </div>
                             <Select
                               value={item.size || '__none__'}
                               onValueChange={(v) => updateItem(idx, 'size', v === '__none__' ? undefined : v)}
                             >
                                <SelectTrigger className="h-10 w-full sm:w-24 rounded-xl bg-background border-border/50">
                                 <SelectValue placeholder="Talla" />
                               </SelectTrigger>
                               <SelectContent className="bg-background rounded-xl shadow-2xl">
                                 <SelectItem value="__none__" className="rounded-lg">—</SelectItem>
                                 {(isFootwear(item.itemTypeEnum) ? shoeSizeOptions : sizeOptions).map(s => (
                                   <SelectItem key={s} value={s} className="rounded-lg">{s}</SelectItem>
                                 ))}
                               </SelectContent>
                             </Select>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors" 
                              onClick={() => removeItem(idx)}
                             >
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
              <TabsContent value="delivery" className="space-y-6 mt-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de Entrega *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'h-12 w-full pl-4 text-left font-semibold rounded-xl bg-background border-border/50',
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
                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Vencimiento Sugerido</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'h-12 w-full pl-4 text-left font-semibold rounded-xl bg-background border-border/50',
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
                      Periodicidad legal: {DOTATION_PERIOD_MONTHS} meses
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Entregado por *</Label>
                  <Input
                    placeholder="Nombre del responsable de almacén"
                    value={deliveredBy}
                    onChange={(e) => setDeliveredBy(e.target.value)}
                    className="h-12 rounded-xl bg-background border-border/50 focus:ring-primary/20 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Observaciones</Label>
                  <Textarea
                    placeholder="Notas adicionales sobre el estado de la dotación o condiciones de entrega..."
                    className="resize-none rounded-xl bg-background border-border/50 focus:ring-primary/20 min-h-[100px] p-4 font-medium"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-primary">Firma Biométrica</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      La firma digital se capturará automáticamente al generar el acta de entrega oficial.
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer con gradiente sutil */}
        <div className="flex flex-col gap-3 p-6 border-t border-border/50 bg-background /10 sm:flex-row sm:justify-end">
          <Button 
            variant="ghost" 
            onClick={() => { handleReset(); onOpenChange(false); }}
            className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-background transition-colors"
          >
            Descartar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-md shadow-primary/10 hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[1px] transition-all" 
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
                Finalizar Entrega {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
