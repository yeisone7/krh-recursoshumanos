import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useIncapacityReport } from '@/hooks/useReports';
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

export function IncapacityReport() {
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfYear(new Date()));
  
  const { data: incapacities, isLoading } = useIncapacityReport(startDate, endDate);
  
  const generateReport = (): ReportData => ({
    title: 'Reporte de Incapacidades con Recuperación',
    subtitle: `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Diagnóstico', key: 'diagnostico', width: 25 },
      { header: 'Origen', key: 'origen', width: 12 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 12 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 12 },
      { header: 'Días', key: 'dias_totales', width: 8 },
      { header: 'Estado Recobro', key: 'estado_recobro', width: 12 },
      { header: 'Monto Total', key: 'monto_total', width: 15 },
      { header: 'Recuperado', key: 'monto_recuperado', width: 15 },
      { header: 'Pendiente', key: 'pendiente', width: 15 },
    ],
    data: incapacities || [],
  });
  
  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), 'incapacidades_recuperacion');
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), 'incapacidades_recuperacion');
      toast.success('Reporte exportado a PDF');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  // Calculate summary
  const totalAmount = incapacities?.reduce((sum, i) => sum + i.monto_total, 0) || 0;
  const recoveredAmount = incapacities?.reduce((sum, i) => sum + i.monto_recuperado, 0) || 0;
  const pendingAmount = totalAmount - recoveredAmount;
  
  return (
    <ReportCard
      title="Incapacidades con Recuperación"
      description="Seguimiento de incapacidades y estado de recobros"
      icon={<HeartPulse className="w-5 h-5" />}
      recordCount={incapacities?.length}
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
      <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold">
            ${totalAmount.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Recuperado</p>
          <p className="text-sm font-semibold text-green-600">
            ${recoveredAmount.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Pendiente</p>
          <p className="text-sm font-semibold text-amber-600">
            ${pendingAmount.toLocaleString('es-CO')}
          </p>
        </div>
      </div>
    </ReportCard>
  );
}
