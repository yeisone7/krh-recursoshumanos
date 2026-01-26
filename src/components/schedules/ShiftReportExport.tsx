import { useState } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSunday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileSpreadsheet, Loader2, Download, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useShifts, useShiftAssignments } from '@/hooks/useSchedules';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { getEmployeeFullName } from '@/types/employee';

interface ShiftReportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShiftReportExport({ open, onOpenChange }: ShiftReportExportProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedCenter, setSelectedCenter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  const { data: employees = [] } = useEmployees();
  const { data: shifts = [] } = useShifts();
  const { data: centers = [] } = useOperationCenters();

  const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

  const { data: assignments = [] } = useShiftAssignments({
    startDate,
    endDate,
    centerId: selectedCenter !== 'all' ? selectedCenter : undefined,
  });

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const days = eachDayOfInterval({
        start: startOfMonth(selectedMonth),
        end: endOfMonth(selectedMonth),
      });

      // Filter employees by center if selected
      let filteredEmployees = employees.filter(e => e.is_active);
      if (selectedCenter !== 'all') {
        filteredEmployees = filteredEmployees.filter(e => 
          e.work_info?.operation_center_id === selectedCenter
        );
      }

      // Build assignments map
      const assignmentsMap: Record<string, Record<string, string>> = {};
      assignments.forEach((a: any) => {
        if (!assignmentsMap[a.employee_id]) {
          assignmentsMap[a.employee_id] = {};
        }
        const shift = shifts.find(s => s.id === a.shift_id);
        assignmentsMap[a.employee_id][a.assignment_date] = shift?.code || shift?.name?.slice(0, 3) || '-';
      });

      // Create header row
      const headers = [
        'Empleado',
        'Documento',
        'Centro',
        'Área',
        ...days.map(d => format(d, 'd')),
      ];

      // Create day names row
      const dayNames = [
        '',
        '',
        '',
        '',
        ...days.map(d => format(d, 'EEE', { locale: es }).slice(0, 2).toUpperCase()),
      ];

      // Create data rows
      const rows = filteredEmployees.map(emp => {
        const workInfo = emp.work_info;
        const center = centers.find(c => c.id === workInfo?.operation_center_id);
        
        return [
          getEmployeeFullName(emp),
          emp.document_number,
          center?.name || emp.operation_centers?.name || '-',
          emp.areas?.name || '-',
          ...days.map(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            return assignmentsMap[emp.id]?.[dateStr] || '';
          }),
        ];
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Main sheet with shifts
      const wsData = [dayNames, headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Empleado
        { wch: 12 }, // Documento
        { wch: 15 }, // Centro
        { wch: 15 }, // Área
        ...days.map(() => ({ wch: 4 })), // Days
      ];

      // Merge day names header
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Planilla de Turnos');

      // Summary sheet
      const shiftSummary: Record<string, number> = {};
      assignments.forEach((a: any) => {
        const shift = shifts.find(s => s.id === a.shift_id);
        const shiftName = shift?.name || 'Desconocido';
        shiftSummary[shiftName] = (shiftSummary[shiftName] || 0) + 1;
      });

      const summaryData = [
        ['Resumen de Turnos - ' + format(selectedMonth, 'MMMM yyyy', { locale: es })],
        [],
        ['Turno', 'Total Asignaciones'],
        ...Object.entries(shiftSummary).map(([name, count]) => [name, count]),
        [],
        ['Estadísticas'],
        ['Total empleados', filteredEmployees.length],
        ['Total días del mes', days.length],
        ['Total asignaciones', assignments.length],
        ['Domingos en el mes', days.filter(d => isSunday(d)).length],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

      // Download
      const fileName = `Turnos_${format(selectedMonth, 'yyyy-MM')}_${selectedCenter !== 'all' ? centers.find(c => c.id === selectedCenter)?.name?.replace(/\s+/g, '_') || 'Centro' : 'Todos'}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Reporte exportado correctamente');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Error al exportar', { description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Exportar Planilla de Turnos
          </DialogTitle>
          <DialogDescription>
            Genera un archivo Excel con la planilla de turnos del periodo seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mes</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedMonth, 'MMMM yyyy', { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedMonth}
                  onSelect={(date) => date && setSelectedMonth(date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Centro de Operación</Label>
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione centro" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todos los centros</SelectItem>
                {centers.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <p>El reporte incluirá:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Planilla diaria de turnos por empleado</li>
              <li>Resumen de asignaciones por turno</li>
              <li>Estadísticas del período</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
