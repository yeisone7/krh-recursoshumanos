import { useState } from 'react';
import { Landmark } from 'lucide-react';
import { useCesantiasReport } from '@/hooks/useReports';
import { exportToExcel, exportToPDF, ReportData } from '@/lib/reportExporter';
import { ReportCard } from './ReportCard';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';

export function CesantiasReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  
  const { data: cesantias, isLoading } = useCesantiasReport(year);
  
  const generateReport = (): ReportData => ({
    title: 'Reporte de Cumplimiento de Cesantías',
    subtitle: `Año: ${year}`,
    generatedAt: new Date(),
    columns: [
      { header: 'Empleado', key: 'empleado', width: 25 },
      { header: 'Documento', key: 'documento', width: 15 },
      { header: 'Año', key: 'año', width: 8 },
      { header: 'Fondo', key: 'fondo', width: 20 },
      { header: 'Monto Cesantías', key: 'monto_cesantias', width: 15 },
      { header: 'Fecha Límite', key: 'fecha_limite', width: 12 },
      { header: 'Fecha Depósito', key: 'fecha_deposito', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Intereses Pagados', key: 'intereses_pagados', width: 12 },
      { header: 'Monto Intereses', key: 'monto_intereses', width: 15 },
    ],
    data: cesantias || [],
  });
  
  const handleExportExcel = () => {
    try {
      exportToExcel(generateReport(), `cesantias_${year}`);
      toast.success('Reporte exportado a Excel');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  const handleExportPDF = () => {
    try {
      exportToPDF(generateReport(), `cesantias_${year}`);
      toast.success('Reporte exportado a PDF');
    } catch (error) {
      toast.error('Error al exportar el reporte');
    }
  };
  
  // Calculate summary
  const totalCesantias = cesantias?.reduce((sum, c) => sum + c.monto_cesantias, 0) || 0;
  const deposited = cesantias?.filter(c => c.estado === 'Depositado').length || 0;
  const pending = cesantias?.filter(c => c.estado !== 'Depositado').length || 0;
  const interestsPaid = cesantias?.filter(c => c.intereses_pagados === 'Sí').length || 0;
  
  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString(),
  }));
  
  return (
    <ReportCard
      title="Cumplimiento de Cesantías"
      description="Estado de depósitos y pago de intereses por año"
      icon={<Landmark className="w-5 h-5" />}
      recordCount={cesantias?.length}
      isLoading={isLoading}
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    >
      <div className="space-y-2">
        <Label>Año</Label>
        <SearchableSelect
          options={yearOptions}
          value={year.toString()}
          onValueChange={(v) => setYear(parseInt(v))}
          placeholder="Seleccionar año"
          searchPlaceholder="Buscar año..."
        />
      </div>
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold">
            ${totalCesantias.toLocaleString('es-CO')}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Depositados</p>
          <p className="text-sm font-semibold text-green-600">{deposited}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="text-sm font-semibold text-amber-600">{pending}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Intereses Pagados</p>
          <p className="text-sm font-semibold text-blue-600">{interestsPaid}</p>
        </div>
      </div>
    </ReportCard>
  );
}
