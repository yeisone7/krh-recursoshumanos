import { ClipboardCheck } from 'lucide-react';
import { useSelectionProcessReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function SelectionProcessReport() {
  const { data: rows, isLoading } = useSelectionProcessReport();

  const generateReport = (): ReportData => ({
    title: 'Reporte de Proceso de Selección',
    subtitle: 'Resumen del estado de cada etapa por candidato',
    generatedAt: new Date(),
    columns: [
      { header: 'Vacante', key: 'vacante', width: 20 },
      { header: 'Candidato', key: 'candidato', width: 22 },
      { header: 'Documento', key: 'documento', width: 14 },
      { header: 'Estado Candidato', key: 'estado_candidato', width: 14 },
      { header: 'Personas a Cargo', key: 'personas_a_cargo', width: 12 },
      { header: 'Prefiltro', key: 'prefiltro', width: 12 },
      { header: 'Entrev. Selección', key: 'entrevista_seleccion', width: 14 },
      { header: 'Entrev. Jefe', key: 'entrevista_jefe', width: 12 },
      { header: 'Antecedentes', key: 'validacion_antecedentes', width: 12 },
      { header: 'Psicotécnicas', key: 'pruebas_psicotecnicas', width: 12 },
      { header: 'Conocimiento', key: 'pruebas_conocimiento', width: 12 },
      { header: 'Académica', key: 'validacion_academica', width: 12 },
      { header: 'Referencias', key: 'validacion_referencias', width: 12 },
      { header: 'Exám. Médicos', key: 'examenes_medicos', width: 12 },
      { header: 'Etapas Aprobadas', key: 'etapas_aprobadas', width: 14 },
    ],
    data: rows || [],
  });

  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), 'proceso_seleccion');
      toast.success('Reporte exportado a Excel');
    } catch {
      toast.error('Error al exportar el reporte');
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), 'proceso_seleccion');
      toast.success('Reporte exportado a PDF');
    } catch {
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <ReportCard
      title="Proceso de Selección"
      description="Resumen de etapas de selección por candidato"
      icon={<ClipboardCheck className="w-5 h-5" />}
      recordCount={rows?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    />
  );
}
