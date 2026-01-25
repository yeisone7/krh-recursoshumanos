import { Users } from 'lucide-react';
import { useEmployeeReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function EmployeeReport() {
  const { data: employees, isLoading } = useEmployeeReport();
  
  const generateReport = (): ReportData => ({
    title: 'Reporte de Plantilla de Empleados',
    subtitle: 'Listado completo de empleados activos e inactivos',
    generatedAt: new Date(),
    columns: [
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Nombre Completo', key: 'nombre', width: 25 },
      { header: 'Cargo', key: 'cargo', width: 20 },
      { header: 'Área', key: 'area', width: 15 },
      { header: 'Centro', key: 'centro', width: 15 },
      { header: 'Fecha Ingreso', key: 'fecha_ingreso', width: 12 },
      { header: 'Tipo Contrato', key: 'tipo_contrato', width: 15 },
      { header: 'Salario', key: 'salario', width: 15 },
      { header: 'EPS', key: 'eps', width: 15 },
      { header: 'AFP', key: 'afp', width: 15 },
      { header: 'Estado', key: 'estado', width: 10 },
    ],
    data: employees || [],
  });
  
  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), 'plantilla_empleados');
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), 'plantilla_empleados');
      toast.success('Reporte exportado a PDF');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  return (
    <ReportCard
      title="Plantilla de Empleados"
      description="Listado completo con datos laborales y de seguridad social"
      icon={<Users className="w-5 h-5" />}
      recordCount={employees?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    />
  );
}
