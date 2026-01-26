import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useContractsExpiringSoonReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DAY_RANGES = [7, 15, 30, 60] as const;
type DayRange = typeof DAY_RANGES[number];

export function ContractsExpiringSoonReport() {
  const [selectedRange, setSelectedRange] = useState<DayRange>(30);
  const { data: contracts, isLoading } = useContractsExpiringSoonReport(selectedRange);
  
  const generateReport = (): ReportData => ({
    title: `Contratos por Vencer - Próximos ${selectedRange} días`,
    subtitle: `Listado de contratos que vencen en los próximos ${selectedRange} días`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Centro', key: 'centro', width: 18 },
      { header: 'Tipo Contrato', key: 'tipo_contrato', width: 15 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 12 },
      { header: 'Fecha Vencimiento', key: 'fecha_vencimiento', width: 14 },
      { header: 'Días Restantes', key: 'dias_restantes', width: 12 },
      { header: 'Prórroga #', key: 'prorroga_actual', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: contracts || [],
  });
  
  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), `contratos_por_vencer_${selectedRange}d`);
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), `contratos_por_vencer_${selectedRange}d`);
      toast.success('Reporte exportado a PDF');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  return (
    <ReportCard
      title="Contratos por Vencer"
      description="Contratos a término fijo próximos a vencer"
      icon={<CalendarClock className="w-5 h-5" />}
      recordCount={contracts?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
      headerExtra={
        <div className="flex gap-1.5">
          {DAY_RANGES.map((days) => (
            <Button
              key={days}
              variant={selectedRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRange(days)}
              className={cn(
                'h-7 px-2.5 text-xs font-medium transition-all',
                selectedRange === days 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'hover:bg-muted'
              )}
            >
              {days}d
            </Button>
          ))}
        </div>
      }
    />
  );
}
