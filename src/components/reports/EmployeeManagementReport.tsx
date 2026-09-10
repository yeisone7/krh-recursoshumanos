import { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGeneralEmployeeReport } from '@/hooks/useGeneralEmployeeReport';
import {
  analyzeEmployeeManagementReport,
  exportEmployeeManagementReportToExcel,
} from '@/lib/employeeManagementReport';
import { exportToPDF, type ReportData } from '@/lib/reportExporter';
import type { GeneralEmployeeReportRow } from '@/lib/generalEmployeeReport';
import { ReportCard } from './ReportCard';

export function EmployeeManagementReport() {
  const { companies, currentCompanyId } = useAuth();
  const { data: cachedRows = [], isFetching, refetch } = useGeneralEmployeeReport(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const companyName = companies.find((company) => company.id === currentCompanyId)?.name;

  const loadRows = async (): Promise<GeneralEmployeeReportRow[]> => {
    if (!currentCompanyId || !companyName) throw new Error('Selecciona una empresa para generar el informe.');
    const result = await refetch();
    if (result.error) throw result.error;
    return result.data || [];
  };

  const handleExcel = async () => {
    setIsGenerating(true);
    try {
      const rows = await loadRows();
      if (!rows.length) {
        toast.info('La empresa seleccionada no tiene empleados para incluir en el informe.');
        return;
      }
      exportEmployeeManagementReportToExcel(rows, companyName!);
      toast.success('Informe integral exportado a Excel.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible generar el archivo Excel.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePdf = async () => {
    setIsGenerating(true);
    try {
      const rows = await loadRows();
      if (!rows.length) {
        toast.info('La empresa seleccionada no tiene empleados para incluir en el informe.');
        return;
      }
      const analysis = analyzeEmployeeManagementReport(rows);
      const report: ReportData = {
        title: 'Gestión de información de empleados',
        subtitle: `Diagnóstico de diligenciamiento y soportes | Empresa seleccionada: ${companyName}`,
        organization: companyName,
        generatedAt: new Date(),
        institutional: true,
        sheetName: 'Empleados',
        columns: [
          { key: 'documento', header: 'Documento', width: 16 },
          { key: 'nombre', header: 'Empleado', width: 28 },
          { key: 'estado', header: 'Estado', width: 13 },
          { key: 'centro', header: 'Centro', width: 22 },
          { key: 'diligenciamiento_obligatorio', header: 'Dilig. obligatorio (%)', width: 18 },
          { key: 'obligatorios_faltantes', header: 'Faltantes', width: 12 },
          { key: 'documentos_vigentes', header: 'Documentos', width: 13 },
          { key: 'prioridad', header: 'Prioridad', width: 13 },
        ],
        data: analysis.employees,
        integerKeys: ['obligatorios_faltantes', 'documentos_vigentes'],
        textKeys: ['documento'],
        statusKey: 'prioridad',
        summary: [
          { label: 'Empleados', value: analysis.kpis.totalEmployees, format: 'number' },
          { label: 'Activos', value: analysis.kpis.activeEmployees, format: 'number' },
          { label: 'Sin documentos', value: analysis.kpis.employeesWithoutDocuments, format: 'number', tone: 'warning' },
          { label: 'Diligenciamiento', value: `${analysis.kpis.averageRequiredCompletion}%`, tone: analysis.kpis.averageRequiredCompletion >= 90 ? 'positive' : 'warning' },
        ],
      };
      exportToPDF(report, 'gestion_informacion_empleados');
      toast.success('Resumen de gestión exportado a PDF.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible generar el archivo PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ReportCard
      title="Gestión de información de empleados"
      description="Analiza diligenciamiento, faltantes, documentos, contratos y uso de módulos para la empresa seleccionada."
      icon={<FileCheck2 className="h-7 w-7" />}
      recordCount={cachedRows.length || undefined}
      isLoading={isFetching || isGenerating}
      onExportExcel={handleExcel}
      onExportPDF={handlePdf}
      headerExtra={<Badge variant="secondary">Empresa seleccionada</Badge>}
    >
      <p className="text-sm text-muted-foreground">
        Excel incluye resumen ejecutivo y hojas de empleados, faltantes, documentos, campos, cobertura por módulo y metodología.
      </p>
    </ReportCard>
  );
}
