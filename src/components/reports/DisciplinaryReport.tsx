import { Scale } from 'lucide-react';
import { useDisciplinaryReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function DisciplinaryReport() {
  const { data: processes, isLoading } = useDisciplinaryReport();

  const generateReport = (): ReportData => ({
    title: 'Reporte de Procesos Disciplinarios',
    subtitle: 'Listado completo de procesos disciplinarios',
    generatedAt: new Date(),
    columns: [
      { header: 'Caso #', key: 'caso', width: 12 },
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Tipo Falta', key: 'tipo_falta', width: 12 },
      { header: 'Fecha Falta', key: 'fecha_falta', width: 12 },
      { header: 'Fecha Apertura', key: 'fecha_apertura', width: 12 },
      { header: 'Sanción', key: 'sancion', width: 18 },
      { header: 'Días Sanción', key: 'dias_sancion', width: 10 },
      { header: 'Estado', key: 'estado', width: 15 },
    ],
    data: processes || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'disciplinarios'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'disciplinarios'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const faultCounts = processes?.reduce((acc, p) => {
    acc[p.tipo_falta] = (acc[p.tipo_falta] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <ReportCard
      title="Procesos Disciplinarios"
      description="Seguimiento de procesos disciplinarios y sanciones"
      icon={<Scale className="w-5 h-5" />}
      recordCount={processes?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="grid gap-3 rounded-lg bg-background p-3 sm:grid-cols-3 sm:gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Leves</p>
          <p className="text-sm font-semibold">{faultCounts['Leve'] || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Graves</p>
          <p className="text-sm font-semibold text-amber-600">{faultCounts['Grave'] || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Gravísimas</p>
          <p className="text-sm font-semibold text-destructive">{faultCounts['Gravísima'] || 0}</p>
        </div>
      </div>
    </ReportCard>
  );
}
