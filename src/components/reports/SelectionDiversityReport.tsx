import { Users2 } from 'lucide-react';
import { useSelectionDiversityReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function SelectionDiversityReport() {
  const { data: rows, isLoading } = useSelectionDiversityReport();

  const generateReport = (): ReportData => ({
    title: 'Reporte de Diversidad e Inclusión - Selección',
    subtitle: 'Datos demográficos de candidatos en procesos de selección',
    generatedAt: new Date(),
    columns: [
      { header: 'Vacante', key: 'vacante', width: 22 },
      { header: 'Candidato', key: 'candidato', width: 22 },
      { header: 'Documento', key: 'documento', width: 14 },
      { header: 'Estado', key: 'estado', width: 14 },
      { header: 'Sexo Biológico', key: 'sexo_biologico', width: 14 },
      { header: 'Sexo Identificación', key: 'sexo_identificacion', width: 14 },
      { header: 'Estado Civil', key: 'estado_civil', width: 12 },
      { header: 'Grupo Étnico', key: 'grupo_etnico', width: 14 },
      { header: 'Discapacidad', key: 'discapacidad', width: 14 },
      { header: 'Primer Empleo', key: 'primer_empleo', width: 10 },
      { header: 'Cabeza Familia', key: 'cabeza_familia', width: 10 },
      { header: 'Víctima Conflicto', key: 'victima_conflicto', width: 12 },
      { header: 'Desmovilizado', key: 'desmovilizado', width: 10 },
      { header: 'Personas a Cargo', key: 'personas_a_cargo', width: 12 },
    ],
    data: rows || [],
  });

  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), 'diversidad_seleccion');
      toast.success('Reporte exportado a Excel');
    } catch {
      toast.error('Error al exportar el reporte');
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), 'diversidad_seleccion');
      toast.success('Reporte exportado a PDF');
    } catch {
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <ReportCard
      title="Diversidad e Inclusión"
      description="Datos demográficos y estadísticas de inclusión por candidato"
      icon={<Users2 className="w-5 h-5" />}
      recordCount={rows?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    />
  );
}
