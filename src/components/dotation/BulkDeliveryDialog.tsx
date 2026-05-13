import { useState, useMemo } from 'react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarIcon, Users, Package, Loader2, CheckCircle, AlertTriangle, Building2
} from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { DOTATION_PERIOD_MONTHS } from '@/types/dotation';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useProfesiogramas } from '@/hooks/useDotationProfesiograma';
import { useCreateDotationDelivery } from '@/hooks/useDotation';
import { useOperationCenters } from '@/hooks/useCompanies';

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
  items: { itemName: string; quantity: number }[];
}

export function BulkDeliveryDialog({ open, onOpenChange, onSuccess }: BulkDeliveryDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: profesiogramas = [] } = useProfesiogramas();
  const { data: operationCenters = [] } = useOperationCenters();
  const createDelivery = useCreateDotationDelivery();

  const [centerId, setCenterId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<Date>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date>(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
  const [deliveredBy, setDeliveredBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState<EmployeeDeliveryRow[]>([]);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  const centerOptions = operationCenters.map((c: any) => ({
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
              itemName: i.dotation_item_types?.name || 'Artículo',
              quantity: i.quantity,
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

  const toggleRow = (idx: number) => {
    const updated = [...rows];
    updated[idx].selected = !updated[idx].selected;
    setRows(updated);
  };

  const toggleAll = (checked: boolean) => {
    setRows(rows.map((r) => ({ ...r, selected: r.items.length > 0 ? checked : false })));
  };

  const handleSubmit = async () => {
    if (selectedRows.length === 0) {
      toast.error('No hay empleados seleccionados con artículos');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const row of selectedRows) {
        for (const item of row.items) {
          try {
            await createDelivery.mutateAsync({
              employee_id: row.employeeId,
              item_type: 'otros',
              item_name: item.itemName,
              quantity: item.quantity,
              size: null,
              delivery_date: format(deliveryDate, 'yyyy-MM-dd'),
              expiration_date: format(expirationDate, 'yyyy-MM-dd'),
              delivered_by: deliveredBy,
              observations: 'Entrega masiva por centro',
              signature_url: null,
            });
            successCount++;
          } catch {
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        toast.success('Entrega masiva completada', {
          description: `Se registraron ${successCount} entregas para ${selectedRows.length} empleados.`,
        });
      } else {
        toast.warning('Entrega parcial', {
          description: `${successCount} exitosas, ${errorCount} con errores.`,
        });
      }

      handleReset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error('Error en la entrega masiva', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCenterId('');
    setDeliveredBy('');
    setDeliveryDate(new Date());
    setExpirationDate(addMonths(new Date(), DOTATION_PERIOD_MONTHS));
    setRows([]);
    setStep('config');
  };

  const withProfCount = rows.filter((r) => r.items.length > 0).length;
  const withoutProfCount = rows.filter((r) => r.items.length === 0).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="flex h-[100dvh] w-screen max-w-4xl flex-col overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-[2rem] sm:border sm:shadow-lg bg-background/95 backdrop-blur-xl">
        {/* Header con gradiente */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Users className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="font-black text-2xl tracking-tighter sm:text-3xl">
                Entrega Masiva
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Sincronización de dotación por centro operativo
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-6">
          {step === 'config' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Centro de Operación *</Label>
                <SearchableSelect
                  options={centerOptions}
                  value={centerId}
                  onValueChange={setCenterId}
                  placeholder="Seleccionar centro de trabajo"
                  triggerClassName="h-12 rounded-xl bg-muted/50 border-border/50"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de Entrega *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('h-12 w-full justify-start text-left font-semibold rounded-xl bg-muted/50 border-border/50', !deliveryDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {deliveryDate ? format(deliveryDate, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border-border/50 rounded-2xl shadow-2xl">
                      <Calendar mode="single" selected={deliveryDate} onSelect={(d) => d && setDeliveryDate(d)} locale={es} className="rounded-2xl" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Fecha de Vencimiento *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('h-12 w-full justify-start text-left font-semibold rounded-xl bg-muted/50 border-border/50', !expirationDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {expirationDate ? format(expirationDate, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background border-border/50 rounded-2xl shadow-2xl">
                      <Calendar mode="single" selected={expirationDate} onSelect={(d) => d && setExpirationDate(d)} locale={es} className="rounded-2xl" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Responsable de Entrega *</Label>
                <Input 
                  value={deliveredBy} 
                  onChange={(e) => setDeliveredBy(e.target.value)} 
                  placeholder="Nombre de quien autoriza la entrega" 
                  className="h-12 rounded-xl bg-muted/50 border-border/50 focus:ring-primary/20 font-medium"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-primary">Importante</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Esta acción generará automáticamente las entregas para todos los empleados activos del centro seleccionado que tengan un profesiograma configurado.
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                className="h-14 w-full gap-2 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-md shadow-primary/10 hover:shadow-lg hover:translate-y-[-1px] transition-all"
              >
                <Package className="w-5 h-5" />
                Analizar Personal y Generar Previa
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 px-1">
                <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-muted/30 border-border/50 font-bold text-[10px] uppercase tracking-widest">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  {operationCenters.find((c: any) => c.id === centerId)?.name}
                </Badge>
                <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-primary/5 text-primary border-primary/20 font-bold text-[10px] uppercase tracking-widest">
                  <Users className="w-3.5 h-3.5" />
                  {rows.length} Empleados
                </Badge>
                <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-green-500/5 text-green-600 border-green-500/20 font-bold text-[10px] uppercase tracking-widest">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {withProfCount} Listos
                </Badge>
                {withoutProfCount > 0 && (
                  <Badge variant="outline" className="h-8 rounded-xl px-3 gap-2 bg-amber-500/5 text-amber-600 border-amber-500/20 font-bold text-[10px] uppercase tracking-widest">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {withoutProfCount} Pendientes
                  </Badge>
                )}
                <Badge className="h-8 rounded-xl px-3 gap-2 bg-secondary text-secondary-foreground font-bold text-[10px] uppercase tracking-widest shadow-sm">
                  <Package className="w-3.5 h-3.5" />
                  {totalDeliveries} Ítems Totales
                </Badge>
              </div>

              {/* Table */}
              <div className="hidden flex-1 min-h-0 overflow-auto rounded-[1.5rem] border border-border/50 bg-background/40 overscroll-x-contain sm:block custom-scrollbar">
                <Table className="min-w-[760px]">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead className="w-14 py-4 px-6">
                        <Checkbox
                          checked={withProfCount > 0 && selectedRows.length === withProfCount}
                          onCheckedChange={(v) => toggleAll(!!v)}
                          className="h-5 w-5 rounded-md"
                        />
                      </TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Empleado</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Cargo</TableHead>
                      <TableHead className="font-black text-[10px] uppercase tracking-widest py-4">Dotación Requerida</TableHead>
                      <TableHead className="text-center font-black text-[10px] uppercase tracking-widest py-4">Cant.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, idx) => (
                      <TableRow key={row.employeeId} className={cn('hover:bg-primary/[0.02] border-border/40 transition-colors', !row.selected && 'opacity-40 grayscale')}>
                        <TableCell className="py-4 px-6">
                          <Checkbox
                            checked={row.selected}
                            disabled={row.items.length === 0}
                            onCheckedChange={() => toggleRow(idx)}
                            className="h-5 w-5 rounded-md"
                          />
                        </TableCell>
                        <TableCell className="py-4">
                          <div>
                            <p className="font-bold text-sm text-foreground">{row.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{row.documentNumber}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-medium text-xs text-muted-foreground">{row.positionName || '—'}</TableCell>
                        <TableCell className="py-4">
                          {row.items.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {row.items.map((item, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] h-5 rounded-full border-border/50 bg-background font-semibold">
                                  {item.itemName}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600/70 font-bold uppercase tracking-widest italic">Falta Profesiograma</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-muted font-black text-xs">
                            {row.items.reduce((a, b) => a + b.quantity, 0) || 0}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile version */}
              <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-border/50 sm:hidden bg-background/40">
                <div className="divide-y divide-border/50">
                  {rows.map((row, idx) => (
                    <div key={row.employeeId} className={cn('space-y-4 p-5 transition-all', !row.selected && 'opacity-40 grayscale')}>
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={row.selected}
                          disabled={row.items.length === 0}
                          onCheckedChange={() => toggleRow(idx)}
                          className="mt-1 h-5 w-5 rounded-md"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-foreground leading-none">{row.employeeName}</p>
                          <p className="mt-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{row.documentNumber}</p>
                          <p className="mt-2 text-xs font-semibold text-primary">{row.positionName || '—'}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 h-7 w-7 p-0 flex items-center justify-center rounded-lg font-black text-xs bg-muted">
                          {row.items.reduce((a, b) => a + b.quantity, 0) || 0}
                        </Badge>
                      </div>
                      {row.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-9">
                          {row.items.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-[9px] h-5 rounded-full border-border/50 bg-background font-semibold">
                              {item.itemName}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-1 gap-3 pt-4 border-t border-border/50 sm:flex sm:items-center sm:justify-between">
                <Button 
                  variant="ghost" 
                  onClick={() => setStep('config')}
                  className="h-12 px-6 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-muted/50"
                >
                  ← Configuración
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedRows.length === 0}
                  className="h-12 px-8 rounded-2xl gap-2 bg-primary text-primary-foreground font-black uppercase tracking-widest text-xs shadow-md shadow-primary/10 hover:shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirmar {totalDeliveries} Entregas
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
