import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeInformationCompletionReport } from '@/hooks/useReports';
import { exportToExcel, type ReportData } from '@/lib/reportExporter';
import { exportEmployeeInformationCompletionPdf } from '@/lib/employeeInformationCompletionPdf';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function EmployeeInformationCompletionReport() {
  const { data: report, isLoading } = useEmployeeInformationCompletionReport();
  const { companies, currentCompanyId } = useAuth();
  const companyName = companies.find((company) => company.id === currentCompanyId)?.name;

  const generateExcelReport = (): ReportData => ({
    title: 'Diligenciamiento de información de empleados',
    subtitle: 'Detalle de los bloques de información completados por empleado activo',
    generatedAt: new Date(),
    columns: [
      { header: 'Documento', key: 'documento', width: 16 },
      { header: 'Empleado', key: 'empleado', width: 28 },
      { header: 'Centro de operación', key: 'centro', width: 22 },
      { header: 'Diligenciamiento', key: 'porcentaje', width: 16 },
      { header: 'Bloques completados', key: 'completados', width: 18 },
      { header: 'Información pendiente', key: 'pendientes', width: 45 },
    ],
    data: (report?.employees || []).map((employee) => ({
      documento: employee.documentNumber,
      empleado: employee.fullName,
      centro: employee.centerName,
      porcentaje: `${employee.percentage}%`,
      completados: `${employee.completedSections}/${employee.totalSections}`,
      pendientes: employee.pendingSections.join(', ') || 'Perfil completo',
    })),
  });

  const handleExportExcel = () => {
    try {
      exportToExcel(generateExcelReport(), 'diligenciamiento_informacion_empleados');
      toast.success('Informe exportado a Excel');
    } catch {
      toast.error('No fue posible exportar el informe');
    }
  };

  const handleExportPdf = () => {
    if (!report?.totalEmployees) {
      toast.error('No hay empleados activos para incluir en el informe');
      return;
    }

    try {
      exportEmployeeInformationCompletionPdf(report, companyName);
      toast.success('Informe de diligenciamiento exportado a PDF');
    } catch {
      toast.error('No fue posible generar el PDF');
    }
  };

  return (
    <ReportCard
      title="Diligenciamiento de información"
      description="Estado general de los perfiles activos, con porcentaje global y por centro de operación"
      icon={<ClipboardList className="w-5 h-5" />}
      recordCount={report?.totalEmployees}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPdf}
      headerExtra={
        report?.totalEmployees ? (
          <div className="mb-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
            {report.overallPercentage}% general
          </div>
        ) : undefined
      }
    />
  );
}
