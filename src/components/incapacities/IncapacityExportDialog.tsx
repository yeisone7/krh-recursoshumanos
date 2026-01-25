import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { useIncapacityExport, ExportFilters } from '@/hooks/useIncapacityExport';
import { recoveryStatusLabels } from '@/types/incapacity';

interface IncapacityExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IncapacityExportDialog({ open, onOpenChange }: IncapacityExportDialogProps) {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 11)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [origin, setOrigin] = useState<string>('all');
  const [recoveryStatus, setRecoveryStatus] = useState<string>('all');

  const exportMutation = useIncapacityExport();

  const handleExport = () => {
    const filters: ExportFilters = {
      startDate,
      endDate,
      origin: origin as 'comun' | 'laboral' | 'all',
      recoveryStatus,
    };
    
    exportMutation.mutate(filters, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  const presetRanges = [
    { label: 'Último mes', start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) },
    { label: 'Últimos 3 meses', start: startOfMonth(subMonths(new Date(), 3)), end: endOfMonth(new Date()) },
    { label: 'Últimos 6 meses', start: startOfMonth(subMonths(new Date(), 6)), end: endOfMonth(new Date()) },
    { label: 'Último año', start: startOfMonth(subMonths(new Date(), 12)), end: endOfMonth(new Date()) },
    { label: 'Año actual', start: new Date(new Date().getFullYear(), 0, 1), end: endOfMonth(new Date()) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Exportar Reporte de Incapacidades
          </DialogTitle>
          <DialogDescription>
            Genera un archivo Excel con el historial de incapacidades, días perdidos y montos de recobro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preset Ranges */}
          <div className="space-y-2">
            <Label>Rangos rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {presetRanges.map((range) => (
                <Button
                  key={range.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStartDate(range.start);
                    setEndDate(range.end);
                  }}
                  className={cn(
                    startDate.getTime() === range.start.getTime() &&
                    endDate.getTime() === range.end.getTime() &&
                    'bg-primary text-primary-foreground'
                  )}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {format(startDate, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    {format(endDate, 'PPP', { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    locale={es}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filters */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="comun">Enfermedad Común</SelectItem>
                  <SelectItem value="laboral">Accidente Laboral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado Recobro</Label>
              <Select value={recoveryStatus} onValueChange={setRecoveryStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(recoveryStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">El reporte incluye:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Hoja de detalle con todas las incapacidades</li>
              <li>Resumen mensual con días perdidos y montos</li>
              <li>Tasa de recuperación por período</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
