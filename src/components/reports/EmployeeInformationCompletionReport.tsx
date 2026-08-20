import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeInformationCompletionReport } from '@/hooks/useReports';
import { exportToExcel, type ReportData } from '@/lib/reportExporter';
import { exportEmployeeInformationCompletionPdf } from '@/lib/employeeInformationCompletionPdf';
import { ReportCard } from './ReportCard';
import { toast } from 'sonner';

export function EmployeeInformationCompletionReport() {
  const { data: report, isLoading, isError, error } = useEmployeeInformationCompletionReport();
  const { companies, currentCompanyId } = useAuth();
  const companyName = companies.find((company) => company.id === currentCompanyId)?.name;

  const generateExcelReport = (): ReportData => ({
    title: 'Diligenciamiento de información por centro de operación',
    subtitle: 'Indicadores agregados de calidad de datos de empleados activos',
    generatedAt: new Date(),
    columns: [
      { header: 'Centro de operación', key: 'centro', width: 22 },
      { header: 'Empleados analizados', key: 'empleados', width: 20 },
      { header: 'Ficha completa', key: 'ficha_completa', width: 18 },
      { header: 'Seguridad social completa', key: 'seguridad_social', width: 25 },
      { header: 'Datos bancarios', key: 'datos_bancarios', width: 20 },
      { header: 'Perfiles al 100%', key: 'perfiles_completos', width: 19 },
    ],
    data: (report?.centers || []).map((center) => ({
      centro: center.centerName,
      empleados: center.totalEmployees,
      ficha_completa: `${center.percentage}%`,
      seguridad_social: `${center.socialSecurityPercentage}% (${center.socialSecurityCompletedEmployees})`,
      datos_bancarios: `${center.bankPercentage}% (${center.bankCompletedEmployees})`,
      perfiles_completos: center.fullyCompletedEmployees,
    })),
  });

  const handleExportExcel = () => {
    if (isError) {
      toast.error(error instanceof Error ? error.message : 'No fue posible cargar la información del informe');
      return;
    }

    try {
      exportToExcel(generateExcelReport(), 'diligenciamiento_por_centro');
      toast.success('Informe exportado a Excel');
    } catch {
      toast.error('No fue posible exportar el informe');
    }
  };

  const handleExportPdf = () => {
    if (isError) {
      toast.error(error instanceof Error ? error.message : 'No fue posible cargar la información del informe');
      return;
    }

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
      title="Diligenciamiento por centro"
      description="Indicadores agregados de calidad de datos por centro de operación"
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
    >
      {isError ? (
        <p className="text-sm font-medium text-destructive">
          No se pudo cargar el informe. Intenta nuevamente o verifica los permisos de consulta de empleados.
        </p>
      ) : report?.unavailableSections.length ? (
        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
          El informe se generará sin estos bloques no disponibles: {report.unavailableSections.join(', ')}.
        </p>
      ) : undefined}
    </ReportCard>
  );
}
