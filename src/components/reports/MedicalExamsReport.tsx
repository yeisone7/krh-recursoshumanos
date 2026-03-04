import { Stethoscope } from 'lucide-react';
import { useMedicalExamsReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function MedicalExamsReport() {
  const { data: exams, isLoading } = useMedicalExamsReport();

  const generateReport = (): ReportData => ({
    title: 'Reporte de Exámenes Médicos',
    subtitle: 'Exámenes médicos ocupacionales con vencimientos',
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Tipo Examen', key: 'tipo_examen', width: 15 },
      { header: 'Fecha Examen', key: 'fecha_examen', width: 12 },
      { header: 'Proveedor', key: 'proveedor', width: 18 },
      { header: 'Médico', key: 'medico', width: 18 },
      { header: 'Concepto', key: 'concepto', width: 15 },
      { header: 'Resultado', key: 'resultado', width: 12 },
      { header: 'Vencimiento', key: 'vencimiento', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: exams || [],
  });

  const handleExportExcel = () => {
    try { exportToExcel(generateReport(), 'examenes_medicos'); toast.success('Reporte exportado a Excel'); }
    catch { toast.error('Error al exportar'); }
  };
  const handleExportPDF = () => {
    try { exportToPDF(generateReport(), 'examenes_medicos'); toast.success('Reporte exportado a PDF'); }
    catch { toast.error('Error al exportar'); }
  };

  return (
    <ReportCard
      title="Exámenes Médicos"
      description="Exámenes ocupacionales con resultados y vencimientos"
      icon={<Stethoscope className="w-5 h-5" />}
      recordCount={exams?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    />
  );
}
