import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { PayrollConceptEditor } from './PayrollConceptEditor';
import { usePayrollConceptEditor, useSavePayrollSettings } from '@/hooks/usePayrollConcepts';
import { toast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollConfigDialog({ open, onOpenChange }: Props) {
  const { data: config, isLoading } = usePayrollConfig();
  const upsert = useSavePayrollSettings();
  const concepts = usePayrollConceptEditor();

  const [form, setForm] = useState({
    max_weekly_hours: 46,
    daily_hours: 8,
    display_unit: 'hours' as 'hours' | 'days',
    night_start: '21:00',
    night_end: '06:00',

  });

  useEffect(() => {
    if (config) {
      setForm({
        max_weekly_hours: config.max_weekly_hours,
        daily_hours: config.daily_hours,
        display_unit: config.display_unit as 'hours' | 'days',
        night_start: config.night_start?.substring(0, 5) || '21:00',
        night_end: config.night_end?.substring(0, 5) || '06:00',

      });
    }
  }, [config, open]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({ config: form, concepts: concepts.validate(), expectedUpdatedAt: config?.updated_at ?? null });
      concepts.markSaved();
      toast({ title: 'Configuración guardada correctamente' });
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error al guardar', description: err instanceof Error ? err.message : 'No se pudo guardar la configuración.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) concepts.reset(); onOpenChange(next); }}>
      <DialogContent aria-describedby={undefined} className="w-[calc(100vw-1.5rem)] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="w-5 h-5 shrink-0" />
            Configuración de Parámetros Laborales
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Jornada */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Jornada</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Jornada máxima semanal (horas)</Label>
                <Input
                  type="number"
                  value={form.max_weekly_hours}
                  onChange={e => setForm(f => ({ ...f, max_weekly_hours: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Jornada diaria ordinaria (horas)</Label>
                <Input
                  type="number"
                  value={form.daily_hours}
                  onChange={e => setForm(f => ({ ...f, daily_hours: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad de visualización</Label>
                <Select value={form.display_unit} onValueChange={v => setForm(f => ({ ...f, display_unit: v as 'hours' | 'days' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Nocturno */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Jornada Nocturna</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Inicio jornada nocturna</Label>
                <Input
                  type="time"
                  value={form.night_start}
                  onChange={e => setForm(f => ({ ...f, night_start: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fin jornada nocturna</Label>
                <Input
                  type="time"
                  value={form.night_end}
                  onChange={e => setForm(f => ({ ...f, night_end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {concepts.isLoading ? <p>Cargando conceptos...</p> : concepts.isError ? <p role="alert">No se pudieron cargar los conceptos.</p> :
            <PayrollConceptEditor value={concepts.drafts} onChange={concepts.change} errors={concepts.errors} disabled={upsert.isPending} />}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => { concepts.reset(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending || !concepts.isSuccess}>
            {upsert.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
