import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { PreLiquidationRow, PayrollDayConcept } from '@/types/payroll';

interface Props {
  rows: PreLiquidationRow[];
  startDate: string;
  endDate: string;
  dailyHours?: number;
}

export function PreLiquidationExport({ rows, startDate, endDate, dailyHours = 8 }: Props) {
  const handleExport = () => {
    const concepts = [...new Map(rows.flatMap(row => Object.values(row.customConcepts || {})).map(c => [c.id, c])).values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
    const hours = (row: PreLiquidationRow, key: PayrollDayConcept) => row.dayConceptHours?.[key] ?? row[key] * dailyHours;
    const data = rows.map(r => ({
      'Empleado': r.employeeName,
      'Documento': String(r.documentNumber ?? '').trim(),
      'Centro de Operación': r.operationCenterName,
      'Día de Descanso Obligatorio': r.restDay,
      'Turno': r.shiftName,
      'Jornada (hrs)': hours(r, 'jornada'),
      'Descanso Obligatorio Trabajado (hrs)': hours(r, 'dominicalTrabajado'),
      'Festivo Trabajado (hrs)': hours(r, 'festivoTrabajado'),
      'Descanso Remunerado (hrs)': hours(r, 'descansoRemunerado'),
      'No trabajado (hrs)': hours(r, 'noTrabajado'),
      'Suspensión (hrs)': hours(r, 'suspension'),
      'HEDO (hrs)': r.hedo,
      'HENO (hrs)': r.heno,
      'HEDF (hrs)': r.hedf,
      'HENF (hrs)': r.henf,
      'RN (hrs)': r.rn,
      'RNF (hrs)': r.rnf,
      'Incapacidad (días)': r.incapacidad,
      'Vacaciones (días)': r.vacaciones,
      'Permisos (días)': r.permiso,
      ...Object.fromEntries(concepts.map(c => [`${c.identifier} · ${c.name} (${c.unit === 'days' ? 'días' : 'hrs'})`, r.customConcepts?.[c.id]?.quantity ?? 0])),
      'Total Días': r.totalDias,
      'Préstamos ($)': r.loanDeduction,
      'Descuentos ($)': r.deductionTotal,
      'Total Deducciones ($)': r.totalDeducciones,
      'Alerta': r.hasWarning ? r.warningMessage : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    // Keep identifiers as text: Excel must not remove leading zeros or round long documents.
    rows.forEach((row, index) => {
      ws[`B${index + 2}`] = { t: 's', v: String(row.documentNumber ?? '').trim(), z: '@' };
    });
    const nameWidth = rows.reduce((width, row) => Math.max(width, row.employeeName.length + 2), 45);
    ws['!cols'] = Object.keys(data[0] || {}).map((_, index) => ({ wch: index === 0 ? nameWidth : index === 1 ? 24 : 22 }));
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
