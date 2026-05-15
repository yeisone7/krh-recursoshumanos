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
import { Badge } from '@/components/ui/badge';
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
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto p-0 bg-background border-border/50 shadow-2xl rounded-[2rem] sm:max-w-lg">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  REPORTES
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Exportar Excel
                </DialogTitle>
                <DialogDescription className="font-medium mt-1">
                  Genera un reporte completo con el historial de incapacidades
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 space-y-6">
          <div className="p-6 rounded-3xl bg-background border border-border/50 space-y-6">
            {/* Preset Ranges */}
            <div className="space-y-3">
            <Label>Rangos rápidos</Label>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
                    'w-full sm:w-auto rounded-xl',
                    startDate.getTime() === range.start.getTime() &&
                    endDate.getTime() === range.end.getTime() &&
                    'bg-primary text-primary-foreground font-bold shadow-md'
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
                    className="w-full justify-start text-left font-normal rounded-xl h-12"
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
                    className="w-full justify-start text-left font-normal rounded-xl h-12"
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

          </div>

          {/* Info */}
          <div className="rounded-2xl bg-background p-4 text-sm text-muted-foreground border border-border/50">
            <p className="font-bold text-foreground mb-2 text-xs uppercase tracking-widest">El reporte incluye:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Hoja de detalle con todas las incapacidades</li>
              <li>Resumen mensual con días perdidos y montos</li>
              <li>Tasa de recuperación por período</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-8 py-6 border-t bg-background /10">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-2xl w-full sm:w-auto font-bold tracking-widest text-xs uppercase">
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exportMutation.isPending} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto">
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
