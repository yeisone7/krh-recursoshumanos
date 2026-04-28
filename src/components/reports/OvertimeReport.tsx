import { useState } from 'react';
import { Clock } from 'lucide-react';
import { useOvertimeReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function OvertimeReport() {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const { data: records, isLoading } = useOvertimeReport(startDate, endDate);

  const generateReport = (): ReportData => ({
    title: 'Reporte de Horas Extra',
    subtitle: `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Horas', key: 'horas', width: 8 },
      { header: 'Recargo %', key: 'recargo', width: 10 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: records || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'horas_extra'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'horas_extra'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const totalHours = records?.reduce((s, r) => s + r.horas, 0) || 0;
  const totalValue = records?.reduce((s, r) => s + r.valor, 0) || 0;

  return (
    <ReportCard
      title="Horas Extra"
      description="Control de horas extra con tipos y valores"
      icon={<Clock className="w-5 h-5" />}
      recordCount={records?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <div className="space-y-2">
          <Label>Fecha Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{startDate ? format(startDate, 'PPP', { locale: es }) : 'Seleccionar'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-auto" align="start"><Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Fecha Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span className="truncate">{endDate ? format(endDate, 'PPP', { locale: es }) : 'Seleccionar'}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] p-0 sm:w-auto" align="start"><Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus /></PopoverContent>
          </Popover>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 sm:gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Horas</p>
          <p className="text-sm font-semibold">{totalHours.toFixed(1)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-sm font-semibold">${totalValue.toLocaleString('es-CO')}</p>
        </div>
      </div>
    </ReportCard>
  );
}
