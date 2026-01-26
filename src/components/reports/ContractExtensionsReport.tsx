import { FileText } from 'lucide-react';
import { useContractExtensionsReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function ContractExtensionsReport() {
  const { data: extensions, isLoading } = useContractExtensionsReport();
  
  const generateReport = (): ReportData => ({
    title: 'Historial de Prórrogas de Contratos',
    subtitle: 'Cumplimiento Art. 46 CST - Ley Laboral Colombiana',
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Tipo Contrato', key: 'tipo_contrato', width: 15 },
      { header: 'Inicio Contrato', key: 'inicio_contrato', width: 12 },
      { header: '# Prórroga', key: 'numero_prorroga', width: 10 },
      { header: 'Tipo Prórroga', key: 'tipo_prorroga', width: 12 },
      { header: 'Inicio Prórroga', key: 'inicio_prorroga', width: 12 },
      { header: 'Fin Prórroga', key: 'fin_prorroga', width: 12 },
      { header: 'Días', key: 'dias', width: 8 },
      { header: 'Tiempo Acumulado', key: 'tiempo_acumulado', width: 15 },
      { header: 'Límite 4 Años', key: 'limite_4_años', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
    ],
    data: extensions || [],
  });
  
  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), 'historial_prorrogas');
      toast.success('Reporte de prórrogas exportado a Excel');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), 'historial_prorrogas');
      toast.success('Reporte de prórrogas exportado a PDF');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  return (
    <ReportCard
      title="Historial de Prórrogas"
      description="Extensiones de contratos con cumplimiento Art. 46 CST y límite de 4 años"
      icon={<FileText className="w-5 h-5" />}
      recordCount={extensions?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    />
  );
}
