import { useState } from 'react';
import { Palmtree } from 'lucide-react';
import { useVacationReport } from '@/hooks/useReports';
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

export function VacationReport() {
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfYear(new Date()));
  const { data: vacations, isLoading } = useVacationReport(startDate, endDate);

  const generateReport = (): ReportData => ({
    title: 'Reporte de Vacaciones',
    subtitle: `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Tipo', key: 'tipo', width: 15 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 12 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 12 },
      { header: 'Días Hábiles', key: 'dias_habiles', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: vacations || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'vacaciones'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'vacaciones'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const totalDays = vacations?.reduce((s, v) => s + v.dias_habiles, 0) || 0;

  return (
    <ReportCard
      title="Vacaciones"
      description="Solicitudes de vacaciones con días y estados"
      icon={<Palmtree className="w-5 h-5" />}
      recordCount={vacations?.length}
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
          <p className="text-xs text-muted-foreground">Total Solicitudes</p>
          <p className="text-sm font-semibold">{vacations?.length || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Días Hábiles</p>
          <p className="text-sm font-semibold">{totalDays}</p>
        </div>
      </div>
    </ReportCard>
  );
}
