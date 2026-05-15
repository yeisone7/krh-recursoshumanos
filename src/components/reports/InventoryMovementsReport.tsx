import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { useInventoryMovements } from '@/hooks/useInventoryMovements';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { dotationItemTypeLabels } from '@/types/dotation';

const movementTypeLabels: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  entrega: 'Entrega',
  devolucion: 'Devolución',
};

export function InventoryMovementsReport() {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const { data: movements, isLoading } = useInventoryMovements();

  const filteredMovements = movements?.filter(m => {
    const date = new Date(m.created_at);
    return isWithinInterval(date, { start: startDate, end: endOfDay(endDate) });
  }) || [];

  const generateReport = (): ReportData => ({
    title: 'Reporte de Movimientos de Inventario',
    subtitle: `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Artículo', key: 'articulo', width: 20 },
      { header: 'Tipo Artículo', key: 'tipo_articulo', width: 15 },
      { header: 'Centro', key: 'centro', width: 15 },
      { header: 'Talla', key: 'talla', width: 8 },
      { header: 'Movimiento', key: 'movimiento', width: 12 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Stock Anterior', key: 'stock_anterior', width: 12 },
      { header: 'Stock Nuevo', key: 'stock_nuevo', width: 12 },
      { header: 'Motivo', key: 'motivo', width: 18 },
    ],
    data: filteredMovements.map(m => ({
      fecha: format(new Date(m.created_at), 'dd/MM/yyyy HH:mm'),
      articulo: m.dotation_inventory?.item_name || '-',
      tipo_articulo: dotationItemTypeLabels[m.dotation_inventory?.item_type as keyof typeof dotationItemTypeLabels] || m.dotation_inventory?.item_type || '-',
      centro: m.dotation_inventory?.operation_centers?.name || 'General',
      talla: m.dotation_inventory?.size || '-',
      movimiento: movementTypeLabels[m.movement_type] || m.movement_type,
      cantidad: m.quantity,
      stock_anterior: m.previous_stock,
      stock_nuevo: m.new_stock,
      motivo: m.reason || '-',
    })),
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'movimientos_inventario'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };

  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'movimientos_inventario'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const entradas = filteredMovements.filter(m => ['entrada', 'devolucion'].includes(m.movement_type)).reduce((s, m) => s + m.quantity, 0);
  const salidas = filteredMovements.filter(m => ['salida', 'entrega'].includes(m.movement_type)).reduce((s, m) => s + Math.abs(m.quantity), 0);

  return (
    <ReportCard
      title="Movimientos de Inventario"
      description="Historial de entradas, salidas y ajustes de stock"
      icon={<ArrowUpDown className="w-5 h-5" />}
      recordCount={filteredMovements.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label>Fecha Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{format(startDate, 'PPP', { locale: es })}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-auto" align="start">
              <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Fecha Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{format(endDate, 'PPP', { locale: es })}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-auto" align="start">
              <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg bg-background p-3 sm:grid-cols-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Movimientos</p>
          <p className="text-sm font-semibold">{filteredMovements.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-sm font-semibold text-success">+{entradas}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Salidas</p>
          <p className="text-sm font-semibold text-destructive">-{salidas}</p>
        </div>
      </div>
    </ReportCard>
  );
}
