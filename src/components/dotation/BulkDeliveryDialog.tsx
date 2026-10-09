import { useState } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, Users, Package, Loader2, CheckCircle, Building2
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

import { DOTATION_PERIOD_MONTHS } from '@/types/dotation';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useProfesiogramas } from '@/hooks/useDotationProfesiograma';
import { useCreateDotationDeliveryBatch } from '@/hooks/useDotation';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useDotationInventory } from '@/hooks/useDotationInventory';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { useAuth } from '@/contexts/AuthContext';
import { getDotationSizeSuggestions } from '@/lib/dotationSizes';

interface BulkDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface EmployeeDeliveryRow {
  employeeId: string;
  employeeName: string;
  positionName: string;
  documentNumber: string;
  selected: boolean;
  items: { itemTypeId: string; itemName: string; quantity: number; size: string; requiresSize: boolean; suggestedSizes: string[] }[];
}

export function BulkDeliveryDialog({ open, onOpenChange, onSuccess }: BulkDeliveryDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: profesiogramas = [] } = useProfesiogramas();
  const { data: operationCenters = [] } = useOperationCenters();
  const { data: inventory = [], isLoading: loadingInventory, isError: inventoryError } = useDotationInventory();
  const { data: config, isLoading: loadingConfig, isError: configError } = useSystemConfig();
  const { assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const deductInventory = config?.dotation_inventory_enabled?.enabled !== false && config?.dotation_auto_deduct?.enabled !== false;
  const blockNoStock = deductInventory && config?.dotation_block_no_stock?.enabled === true;
  const [inventorySource, setInventorySource] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const createDeliveryBatch = useCreateDotationDeliveryBatch();

  const [centerId, setCenterId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date>(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
  const [deliveredBy, setDeliveredBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<EmployeeDeliveryRow[]>([]);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  const centerOptions = operationCenters.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const handleGenerate = () => {
    if (!centerId) {
      toast.error('Selecciona un centro de operación');
      return;
    }
    if (!deliveredBy.trim()) {
      toast.error('Indica quién entrega');
      return;
    }

    // Filter active employees in this center
    const centerEmployees = employees.filter(
      (e) => e.is_active && e.operation_centers?.id === centerId
    );

    if (centerEmployees.length === 0) {
      toast.error('No hay empleados activos en este centro');
      return;
    }

    // Build rows by cross-referencing profesiograma
    const generatedRows: EmployeeDeliveryRow[] = centerEmployees.map((emp) => {
      const positionName = emp.work_info?.position_name || '';
      // Find matching profesiograma: same center + position
      const prof = profesiogramas.find(
        (p) =>
          p.operation_center_id === centerId &&
          p.positions?.name === positionName
      );

      const items = prof
        ? prof.items
            .filter((i) => i.is_required)
            .map((i) => ({
              itemTypeId: i.dotation_item_type_id,
              itemName: i.dotation_item_types?.name || 'Artículo',
              quantity: i.quantity,
              size: '',
              requiresSize: i.dotation_item_types?.requires_size === true,
              suggestedSizes: getDotationSizeSuggestions(i.dotation_item_types),
            }))
        : [];

      return {
        employeeId: emp.id,
        employeeName: getEmployeeFullName(emp),
        positionName,
        documentNumber: emp.document_number,
        selected: items.length > 0, // auto-select only those with profesiograma
        items,
      };
    });

    setRows(generatedRows);
    setStep('preview');
  };

  const selectedRows = rows.filter((r) => r.selected && r.items.length > 0);

  const totalDeliveries = selectedRows.reduce((acc, r) => acc + r.items.length, 0);

  const visibleRows = rows.filter(row =>
    (positionFilter === 'all' || row.positionName === positionFilter) &&
    `${row.employeeName} ${row.documentNumber}`.toLocaleLowerCase().includes(employeeSearch.trim().toLocaleLowerCase())
  );
  const eligibleVisible = visibleRows.filter(row => row.items.length > 0);
  const visibleSelected = eligibleVisible.filter(row => row.selected).length;
  const positionOptions = [{ value: 'all', label: 'Todos los cargos' }, ...Array.from(new Set(rows.map(row => row.positionName))).sort().map(name => ({ value: name, label: name || 'Sin cargo' }))];
  const sourceOptions = [
    ...(isAdmin || isSuperAdmin || assignedCenterIds.length === 0 ? [{ value: 'general', label: 'Inventario General' }] : []),
    ...operationCenters.filter(center => center.is_active !== false).map(center => ({ value: center.id, label: center.name })),
  ];
  const sourceInventory = inventory.filter(item => item.operation_center_id === (inventorySource === 'general' ? null : inventorySource));
  const missingSizes = selectedRows.reduce((count, row) => count + row.items.filter(item => item.requiresSize && !item.size.trim()).length, 0);
  const totalUnits = selectedRows.reduce((count, row) => count + row.items.reduce((sum, item) => sum + item.quantity, 0), 0);
  const requested = new Map<string, { name: string; size: string | null; quantity: number; available: number }>();
  for (const row of selectedRows) {
    for (const item of row.items) {
      const size = item.size.trim() || null;
      const key = JSON.stringify([item.itemTypeId, item.itemName, size]);
      const stock = sourceInventory.find(stock => stock.item_type === item.itemTypeId && stock.item_name === item.itemName && stock.size === size);
      requested.set(key, { name: item.itemName, size, quantity: (requested.get(key)?.quantity || 0) + item.quantity, available: stock?.quantity_available || 0 });
    }
  }
  const stockIssues = Array.from(requested.values()).filter(item => item.available < item.quantity);
  const toggleRow = (employeeId: string) => setRows(current => current.map(row => row.employeeId === employeeId ? { ...row, selected: !row.selected } : row));
  const toggleAll = (checked: boolean) => {
    const visibleIds = new Set(eligibleVisible.map(row => row.employeeId));
    setRows(current => current.map(row => visibleIds.has(row.employeeId) ? { ...row, selected: checked } : row));
  };
  const updateSize = (employeeId: string, index: number, size: string) => setRows(current => current.map(row => row.employeeId === employeeId ? {
    ...row, items: row.items.map((item, i) => i === index ? { ...item, size } : item),
  } : row));

  const handleSubmit = async () => {
    if (selectedRows.length === 0) {
      toast.error('No hay empleados seleccionados con artículos');
      return;
    }

    if (loadingConfig || configError) {
      toast.error('No se pudo verificar la configuración de inventario');
      return;
    }
    if (missingSizes > 0) {
      toast.error('Asigna las tallas obligatorias antes de confirmar');
      return;
    }
    if (deductInventory && (!sourceOptions.some(source => source.value === inventorySource) || loadingInventory || inventoryError)) {
      toast.error('Selecciona una bodega de origen y espera a que cargue el inventario');
      return;
    }
    if (blockNoStock && stockIssues.length > 0) {
      toast.error('Stock insuficiente para la selección', { description: stockIssues.map(item => `${item.name} (${item.size || 'sin talla'}): ${item.available} disponibles / ${item.quantity} requeridos`).join('. ') });
      return;
    }
    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;
    const completedIds = new Set<string>();
    const errors: string[] = [];

    try {
      for (const row of selectedRows) {
        try {
          await createDeliveryBatch.mutateAsync({
            employee_id: row.employeeId,
            delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
            expiration_date: format(expirationDate, 'yyyy-MM-dd'),
            delivered_by: deliveredBy,
            observations: 'Entrega masiva por centro',
            items: row.items.map((item) => ({
              dotation_item_type_id: item.itemTypeId,
              item_type: 'otros',
              item_name: item.itemName,
              quantity: item.quantity,
              size: item.size.trim() || null,
              ...(deductInventory ? { source_operation_center_id: inventorySource === 'general' ? null : inventorySource } : {}),
            })),
          });
          successCount += row.items.length;
          completedIds.add(row.employeeId);
        } catch (error: unknown) {
          errors.push(`${row.employeeName}: ${error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'No fue posible registrar la entrega'}`);
          errorCount += row.items.length;
        }
      }

      if (errorCount === 0) {
        toast.success('Entrega masiva completada', {
          description: `Se registraron ${successCount} entregas para ${selectedRows.length} empleados.`,
        });
      } else {
        toast.warning('Entrega parcial', {
          description: `${successCount} exitosas, ${errorCount} con errores. ${errors.join(". ")}`,
        });
      }

      if (errorCount === 0) {
        handleReset();
        onOpenChange(false);
      } else {
        // Remove completed employees so retrying never duplicates their deliveries.
        setRows(current => current.filter(row => !completedIds.has(row.employeeId)));
      }
      if (successCount > 0) onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'No fue posible completar la entrega';
      toast.error('Error en la entrega masiva', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCenterId('');
    setInventorySource('');
    setPositionFilter('all');
    setEmployeeSearch('');
    setDeliveredBy('');
    setDeliveryDate(new Date());
    setExpirationDate(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
    setRows([]);
    setStep('config');
  };

  const withProfCount = rows.filter((r) => r.items.length > 0).length;
  const withoutProfCount = rows.filter((r) => r.items.length === 0).length;

  const renderItems = (row: EmployeeDeliveryRow, layout: 'desktop' | 'mobile') => row.items.length === 0 ? (
    <p className="text-sm text-amber-700">Sin profesiograma configurado</p>
  ) : (
    <div className="space-y-2">
      {row.items.map((item, index) => {
        const sizes = Array.from(new Set([...sourceInventory.filter(stock => stock.item_type === item.itemTypeId).map(stock => stock.size).filter((size): size is string => !!size), ...item.suggestedSizes]));
        const listId = `bulk-size-${layout}-${row.employeeId}-${index}`;
        return <div key={`${item.itemTypeId}-${index}`} className="grid grid-cols-[minmax(0,1fr)_2rem_6rem] items-center gap-2">
          <span className="text-sm leading-snug">{item.itemName}</span>
          <span className="text-center text-xs tabular-nums text-muted-foreground">×{item.quantity}</span>
          <Input aria-label={`Talla de ${item.itemName} para ${row.employeeName}`} value={item.size} onChange={event => updateSize(row.employeeId, index, event.target.value)} disabled={!row.selected || isSubmitting} list={listId} placeholder={item.requiresSize ? 'Talla *' : 'Sin talla'} aria-required={item.requiresSize} className="bulk-size-input" />
          <datalist id={listId}>{sizes.map(size => <option key={size} value={size} />)}</datalist>
        </div>;
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={value => { if (isSubmitting) return; if (!value) handleReset(); onOpenChange(value); }}>
      <DialogContent className="bulk-delivery-dialog flex h-[min(90dvh,860px)] w-[calc(100vw-2rem)] max-w-[67.2rem] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-2rem)] sm:p-0" onEscapeKeyDown={event => { if (isSubmitting) event.preventDefault(); }}>
        <div className="shrink-0 border-b px-5 py-4 pr-12 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
            <div>
              <DialogTitle className="text-xl font-semibold">Entrega Masiva</DialogTitle>
              <DialogDescription>{step === 'config' ? '1. Configura la entrega para el centro de operación.' : '2. Selecciona empleados y asigna las tallas por artículo.'}</DialogDescription>
            </div>
          </div>
        </div>
        {step === 'config' ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Centro de operación *</Label>
                <SearchableSelect options={centerOptions} value={centerId} onValueChange={value => { setCenterId(value); if (!inventorySource) setInventorySource(value); }} placeholder="Seleccionar centro de trabajo" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de entrega *</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{format(deliveryDate, 'dd/MM/yyyy')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={deliveryDate} onSelect={date => date && setDeliveryDate(date)} locale={es} /></PopoverContent></Popover>
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento *</Label>
                <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start"><CalendarIcon className="mr-2 h-4 w-4" />{format(expirationDate, 'dd/MM/yyyy')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expirationDate} onSelect={date => date && setExpirationDate(date)} locale={es} /></PopoverContent></Popover>
              </div>
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="bulk-delivered-by">Responsable de entrega *</Label><Input id="bulk-delivered-by" value={deliveredBy} onChange={event => setDeliveredBy(event.target.value)} placeholder="Nombre de quien autoriza la entrega" /></div>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground sm:col-span-2">Se cargarán los empleados activos y los artículos requeridos por su cargo. En el siguiente paso puedes ajustar la selección y asignar tallas antes de registrar las entregas.</div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:overflow-hidden sm:p-5">
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Badge variant="outline"><Building2 className="mr-1 h-3.5 w-3.5" />{operationCenters.find(center => center.id === centerId)?.name}</Badge>
              <Badge variant="secondary">{rows.length} empleados</Badge>
              <Badge className="bg-primary text-primary-foreground">{selectedRows.length} seleccionados</Badge>
              <Badge variant="outline">{withProfCount} con profesiograma</Badge>
              {withoutProfCount > 0 && <Badge variant="outline" className="text-amber-700">{withoutProfCount} sin profesiograma</Badge>}
              <Badge variant="outline"><Package className="mr-1 h-3.5 w-3.5" />{totalUnits} unidades</Badge>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3">
              <div><Label htmlFor="bulk-employee-search">Buscar empleado</Label><Input id="bulk-employee-search" value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} placeholder="Nombre o documento" disabled={isSubmitting} /></div>
              <div><Label>Filtrar por cargo</Label><SearchableSelect options={positionOptions} value={positionFilter} onValueChange={setPositionFilter} placeholder="Filtrar por cargo" disabled={isSubmitting} /></div>
              {deductInventory && <div className="col-span-2 sm:col-span-1"><Label>Bodega de origen *</Label><SearchableSelect options={sourceOptions} value={inventorySource} onValueChange={setInventorySource} placeholder="Seleccionar bodega de origen" disabled={isSubmitting} /></div>}
            </div>
            <div className="shrink-0 space-y-1 text-xs text-muted-foreground" aria-live="polite">
              <p>{deductInventory ? 'El inventario se descontará de la bodega elegida por artículo y talla. Sin talla corresponde únicamente a existencias sin talla.' : 'El descuento automático de inventario está desactivado en la configuración.'}</p>
              {missingSizes > 0 && <p className="text-amber-700">Faltan {missingSizes} tallas obligatorias en los empleados seleccionados.</p>}
              {deductInventory && stockIssues.length > 0 && !loadingInventory && !inventoryError && <p className="text-amber-700">{stockIssues.length} combinaciones de artículo y talla con stock insuficiente.{blockNoStock ? ' Ajusta la selección o la bodega antes de confirmar.' : ' La configuración permite registrar entregas aunque el stock sea insuficiente.'}</p>}
              {(inventoryError || configError) && <p className="text-destructive">No se pudo consultar el inventario o su configuración. Vuelve a abrir el modal para reintentar.</p>}
              {loadingInventory && deductInventory && <p>Cargando inventario…</p>}
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 text-xs text-muted-foreground">
              <label className="bulk-visible-selection flex items-center gap-2"><Checkbox aria-label="Seleccionar empleados visibles" checked={eligibleVisible.length > 0 && visibleSelected === eligibleVisible.length ? true : visibleSelected > 0 ? 'indeterminate' : false} onCheckedChange={value => toggleAll(value === true)} disabled={isSubmitting || eligibleVisible.length === 0} />Seleccionar visibles</label>
              <span>{visibleRows.length} de {rows.length} empleados</span>
            </div>
            <div className="bulk-delivery-grid min-h-0 shrink-0 rounded-lg border sm:flex-1 sm:shrink sm:overflow-auto">
              <table className="hidden w-full table-fixed sm:table" aria-label="Empleados y tallas para entrega masiva">
                <colgroup><col className="w-[5%]" /><col className="w-[24%]" /><col className="w-[19%]" /><col className="w-[45%]" /><col className="w-[7%]" /></colgroup>
                <thead className="sticky top-0 z-10"><tr><th><span className="sr-only">Selección</span></th><th>Empleado</th><th>Cargo</th><th><div className="flex justify-between gap-2"><span>Dotación requerida</span><span>Talla</span></div></th><th>Uds.</th></tr></thead>
                <tbody>{visibleRows.map(row => <tr key={row.employeeId}>
                  <td><Checkbox aria-label={`Seleccionar a ${row.employeeName}`} checked={row.selected} disabled={isSubmitting || row.items.length === 0} onCheckedChange={() => toggleRow(row.employeeId)} /></td>
                  <td><p className="font-semibold">{row.employeeName}</p><p className="mt-1 text-xs text-muted-foreground">{row.documentNumber}</p></td>
                  <td className="text-muted-foreground">{row.positionName || 'Sin cargo'}</td><td>{renderItems(row, 'desktop')}</td><td className="tabular-nums">{row.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                </tr>)}</tbody>
              </table>
              <div className="divide-y sm:hidden">{visibleRows.map(row => <div key={row.employeeId} className="space-y-3 p-4">
                <div className="flex items-start gap-3"><Checkbox aria-label={`Seleccionar a ${row.employeeName}`} checked={row.selected} disabled={isSubmitting || row.items.length === 0} onCheckedChange={() => toggleRow(row.employeeId)} /><div><p className="text-sm font-semibold">{row.employeeName}</p><p className="text-xs text-muted-foreground">{row.documentNumber} · {row.positionName || 'Sin cargo'}</p></div></div>{renderItems(row, 'mobile')}
              </div>)}</div>
              {visibleRows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No hay empleados que coincidan con los filtros.</p>}
            </div>
          </div>
        )}
        <div className="shrink-0 border-t bg-muted/30 px-5 py-4 sm:px-6">
          {step === 'config' ? <div className="flex justify-end"><Button onClick={handleGenerate} disabled={loadingConfig || configError}><Package className="mr-2 h-4 w-4" />Analizar Personal y Generar Previa</Button></div> : <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={() => setStep('config')} disabled={isSubmitting}>← Configuración</Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"><span className="text-xs text-muted-foreground">{selectedRows.length} empleados · {totalUnits} unidades</span><Button onClick={handleSubmit} disabled={isSubmitting || selectedRows.length === 0 || missingSizes > 0 || loadingConfig || configError || (deductInventory && (!inventorySource || loadingInventory || inventoryError || (blockNoStock && stockIssues.length > 0)))}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}{isSubmitting ? 'Procesando...' : `Confirmar ${totalDeliveries} Entregas`}
            </Button></div>
          </div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
