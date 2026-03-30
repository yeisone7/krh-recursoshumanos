import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { PreLiquidationRow } from '@/types/payroll';

interface Props {
  rows: PreLiquidationRow[];
  startDate: string;
  endDate: string;
}

export function PreLiquidationExport({ rows, startDate, endDate }: Props) {
  const handleExport = () => {
    const data = rows.map(r => ({
      'Empleado': r.employeeName,
      'Documento': r.documentNumber,
      'Jornada (días)': r.jornada,
      'Dominical Trabajado': r.dominicalTrabajado,
      'Festivo Trabajado': r.festivoTrabajado,
      'Descanso Remunerado': r.descansoRemunerado,
      'HEDO (hrs)': r.hedo,
      'HENO (hrs)': r.heno,
      'HEDF (hrs)': r.hedf,
      'HENF (hrs)': r.henf,
      'RN (hrs)': r.rn,
      'RNF (hrs)': r.rnf,
      'Incapacidad (días)': r.incapacidad,
      'Vacaciones (días)': r.vacaciones,
      'Permisos (días)': r.permiso,
      'Total Días': r.totalDias,
      'Préstamos ($)': r.loanDeduction,
      'Descuentos ($)': r.deductionTotal,
      'Total Deducciones ($)': r.totalDeducciones,
      'Alerta': r.hasWarning ? r.warningMessage : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pre-Liquidación');
    XLSX.writeFile(wb, `pre-liquidacion_${startDate}_${endDate}.xlsx`);
  };

  return (
    <Button onClick={handleExport} variant="outline" disabled={rows.length === 0}>
      <Download className="w-4 h-4 mr-2" />
      Exportar Excel
    </Button>
  );
}
