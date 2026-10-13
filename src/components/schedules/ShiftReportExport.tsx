import { useState } from 'react';
import { FileSpreadsheet, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { exportShiftCalendar, type ShiftCalendarExportData } from '@/lib/shiftCalendarExport';

interface ShiftReportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShiftCalendarExportData | null;
  loading?: boolean;
  error?: boolean;
}

export function ShiftReportExport({ open, onOpenChange, data, loading, error }: ShiftReportExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async () => {
    if (!data || loading || error || isExporting || !data.rows.length) return;
    setIsExporting(true);
    try {
      await exportShiftCalendar(data);
      toast.success('Calendario exportado correctamente');
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error('Error al exportar', { description: error instanceof Error ? error.message : 'Intenta nuevamente.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!isExporting) onOpenChange(value); }}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Exportar calendario
          </DialogTitle>
          <DialogDescription>
            El Excel incluirá el período y los empleados de los filtros actuales, con los mismos códigos, novedades y colores del calendario, incluidos los grupos contraídos.
          </DialogDescription>
        </DialogHeader>
        {loading ? <p role="status">Cargando datos del calendario…</p> : error ? (
          <p role="alert" className="text-destructive">No se pudo completar la carga del calendario. Reintenta la carga antes de exportar.</p>
        ) : data && (
          <dl className="space-y-2 text-sm">
            <div><dt className="font-semibold">Período</dt><dd>{data.startDate.split('-').reverse().join('/')} – {data.endDate.split('-').reverse().join('/')}</dd></div>
            <div><dt className="font-semibold">Centro</dt><dd>{data.centerLabel}</dd></div>
            <div><dt className="font-semibold">Modalidad</dt><dd>{data.modeLabel}</dd></div>
            <div><dt className="font-semibold">Empleados</dt><dd>{new Set(data.rows.map(row => row.employeeId)).size}</dd></div>
            {!data.rows.length && <p>No hay empleados para exportar con los filtros actuales.</p>}
          </dl>
        )}
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" disabled={isExporting} onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={isExporting || loading || error || !data?.rows.length}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
