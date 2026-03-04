import { useState } from 'react';
import { UserX } from 'lucide-react';
import { useLeavesReport } from '@/hooks/useReports';
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

export function LeavesReport() {
  const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfYear(new Date()));
  const { data: leaves, isLoading } = useLeavesReport(startDate, endDate);

  const generateReport = (): ReportData => ({
    title: 'Reporte de Permisos y Licencias',
    subtitle: `Período: ${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Tipo Permiso', key: 'tipo_permiso', width: 18 },
      { header: 'Motivo', key: 'motivo', width: 25 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 12 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 12 },
      { header: 'Días', key: 'dias', width: 8 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: leaves || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'permisos_licencias'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'permisos_licencias'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  return (
    <ReportCard
      title="Permisos y Licencias"
      description="Histórico de permisos y licencias por tipo y estado"
      icon={<UserX className="w-5 h-5" />}
      recordCount={leaves?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha Inicio</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus /></PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Fecha Fin</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP', { locale: es }) : 'Seleccionar'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus /></PopoverContent>
          </Popover>
        </div>
      </div>
    </ReportCard>
  );
}
