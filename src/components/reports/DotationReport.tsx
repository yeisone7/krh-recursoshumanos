import { useState } from 'react';
import { Package } from 'lucide-react';
import { useDotationReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function DotationReport() {
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfYear(new Date()));
  
  const { data: dotations, isLoading } = useDotationReport(startDate, endDate);
  
  const generateReport = (): ReportData => ({
    title: 'Reporte de Dotación Entregada',
    subtitle: `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Centro', key: 'centro', width: 15 },
      { header: 'Artículo', key: 'articulo', width: 20 },
      { header: 'Tipo', key: 'tipo', width: 15 },
      { header: 'Cantidad', key: 'cantidad', width: 10 },
      { header: 'Talla', key: 'talla', width: 10 },
      { header: 'Fecha Entrega', key: 'fecha_entrega', width: 12 },
      { header: 'Fecha Vencimiento', key: 'fecha_vencimiento', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: dotations || [],
  });
  
  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), 'dotacion_entregada');
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), 'dotacion_entregada');
      toast.success('Reporte exportado a PDF');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  // Calculate summary
  const totalItems = dotations?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
  const vigentes = dotations?.filter(d => d.estado === 'Vigente').length || 0;
  const porVencer = dotations?.filter(d => d.estado === 'Por Vencer').length || 0;
  const vencidos = dotations?.filter(d => d.estado === 'Vencido').length || 0;
  
  return (
    <ReportCard
      title="Dotación Entregada"
      description="Control de entregas y vencimientos de dotación"
      icon={<Package className="w-5 h-5" />}
      recordCount={dotations?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label>Fecha Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Items</p>
          <p className="text-sm font-semibold">{totalItems}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Vigentes</p>
          <p className="text-sm font-semibold text-green-600">{vigentes}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Por Vencer</p>
          <p className="text-sm font-semibold text-amber-600">{porVencer}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Vencidos</p>
          <p className="text-sm font-semibold text-red-600">{vencidos}</p>
        </div>
      </div>
    </ReportCard>
  );
}
