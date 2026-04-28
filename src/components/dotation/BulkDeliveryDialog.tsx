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
      <DialogContent className="flex h-[100dvh] w-screen max-w-3xl flex-col overflow-hidden rounded-none border-0 p-4 sm:h-auto sm:max-h-[90vh] sm:w-full sm:rounded-lg sm:border sm:p-6">
        <DialogHeader className="pr-12">
          <DialogTitle className="font-display text-lg flex items-center gap-2 sm:text-xl">
            <Users className="w-5 h-5 text-primary" />
            Entrega Masiva por Centro
          </DialogTitle>
          <DialogDescription>
            Registra entregas de dotación a todos los empleados de un centro según su profesiograma
          </DialogDescription>
        </DialogHeader>

        {step === 'config' ? (
          <div className="space-y-5 overflow-y-auto py-2 pr-1">
            <div className="space-y-2">
              <Label>Centro de Operación *</Label>
              <SearchableSelect
                options={centerOptions}
                value={centerId}
                onValueChange={setCenterId}
                placeholder="Seleccionar centro"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha de Entrega *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !deliveryDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deliveryDate ? format(deliveryDate, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={deliveryDate} onSelect={(d) => d && setDeliveryDate(d)} locale={es} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Fecha de Vencimiento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !expirationDate && 'text-muted-foreground')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? format(expirationDate, 'dd/MM/yyyy') : 'Seleccionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={expirationDate} onSelect={(d) => d && setExpirationDate(d)} locale={es} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Entregado por *</Label>
              <Input value={deliveredBy} onChange={(e) => setDeliveredBy(e.target.value)} placeholder="Nombre de quien entrega" />
            </div>

            <Button onClick={handleGenerate} className="w-full gap-2">
              <Package className="w-4 h-4" />
              Generar Vista Previa
            </Button>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Building2 className="w-3 h-3" />
                {operationCenters.find((c: any) => c.id === centerId)?.name}
              </Badge>
              <Badge variant="outline" className="gap-1 bg-primary/5 text-primary border-primary/20">
                <Users className="w-3 h-3" />
                {rows.length} empleados
              </Badge>
              <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3" />
                {withProfCount} con profesiograma
              </Badge>
              {withoutProfCount > 0 && (
                <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle className="w-3 h-3" />
                  {withoutProfCount} sin profesiograma
                </Badge>
              )}
              <Badge className="gap-1 bg-secondary text-secondary-foreground">
                <Package className="w-3 h-3" />
                {totalDeliveries} entregas a registrar
              </Badge>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border overscroll-x-contain">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={withProfCount > 0 && selectedRows.length === withProfCount}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Artículos</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row.employeeId} className={cn(!row.selected && 'opacity-50')}>
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          disabled={row.items.length === 0}
                          onCheckedChange={() => toggleRow(idx)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{row.employeeName}</p>
                          <p className="text-xs text-muted-foreground">{row.documentNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.positionName || '—'}</TableCell>
                      <TableCell>
                        {row.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.items.map((item, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {item.itemName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin profesiograma</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium">
                        {row.items.reduce((a, b) => a + b.quantity, 0) || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 gap-2 pt-2 border-t sm:flex sm:items-center sm:justify-between">
              <Button variant="outline" onClick={() => setStep('config')}>
                ← Volver
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedRows.length === 0}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
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
      </DialogContent>
    </Dialog>
  );
}
