import { GraduationCap } from 'lucide-react';
import { useTrainingReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function TrainingReport() {
  const { data: sessions, isLoading } = useTrainingReport();

  const generateReport = (): ReportData => ({
    title: 'Reporte de Capacitaciones',
    subtitle: 'Sesiones de capacitación con estado y asistencia',
    generatedAt: new Date(),
    columns: [
      { header: 'Curso', key: 'curso', width: 25 },
      { header: 'Código', key: 'codigo', width: 12 },
      { header: 'Instructor', key: 'instructor', width: 20 },
      { header: 'Fecha Inicio', key: 'fecha_inicio', width: 12 },
      { header: 'Fecha Fin', key: 'fecha_fin', width: 12 },
      { header: 'Ubicación', key: 'ubicacion', width: 18 },
      { header: 'Cupo Máx.', key: 'cupo_max', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: sessions || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'capacitaciones'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'capacitaciones'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  const statusCounts = sessions?.reduce((acc, s) => {
    acc[s.estado] = (acc[s.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <ReportCard
      title="Capacitaciones"
      description="Sesiones programadas, en curso y completadas"
      icon={<GraduationCap className="w-5 h-5" />}
      recordCount={sessions?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Programadas</p>
          <p className="text-sm font-semibold">{statusCounts['Programado'] || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">En Curso</p>
          <p className="text-sm font-semibold text-blue-600">{statusCounts['En Curso'] || 0}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Completadas</p>
          <p className="text-sm font-semibold text-emerald-600">{statusCounts['Completado'] || 0}</p>
        </div>
      </div>
    </ReportCard>
  );
}
