import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayrollConfig, useUpsertPayrollConfig } from '@/hooks/usePayrollConfig';
import { toast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollConfigDialog({ open, onOpenChange }: Props) {
  const { data: config, isLoading } = usePayrollConfig();
  const upsert = useUpsertPayrollConfig();

  const [form, setForm] = useState({
    max_weekly_hours: 46,
    daily_hours: 8,
    display_unit: 'hours' as 'hours' | 'days',
    night_start: '21:00',
    night_end: '06:00',
    surcharge_hedo: 25,
    surcharge_heno: 75,
    surcharge_rn: 35,
    surcharge_hedf: 100,
    surcharge_henf: 150,
    surcharge_rnf: 110,
    surcharge_dominical: 75,
  });

  useEffect(() => {
    if (config) {
      setForm({
        max_weekly_hours: config.max_weekly_hours,
        daily_hours: config.daily_hours,
        display_unit: config.display_unit as 'hours' | 'days',
        night_start: config.night_start?.substring(0, 5) || '21:00',
        night_end: config.night_end?.substring(0, 5) || '06:00',
        surcharge_hedo: config.surcharge_hedo,
        surcharge_heno: config.surcharge_heno,
        surcharge_rn: config.surcharge_rn,
        surcharge_hedf: config.surcharge_hedf,
        surcharge_henf: config.surcharge_henf,
        surcharge_rnf: config.surcharge_rnf,
        surcharge_dominical: config.surcharge_dominical,
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync(form);
      toast({ title: 'Configuración guardada correctamente' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' });
    }
  };

  const surchargeFields = [
    { key: 'surcharge_hedo', label: 'HEDO - Extra Diurna Ordinaria (%)' },
    { key: 'surcharge_heno', label: 'HENO - Extra Nocturna Ordinaria (%)' },
    { key: 'surcharge_rn', label: 'RN - Recargo Nocturno (%)' },
    { key: 'surcharge_hedf', label: 'HEDF - Extra Diurna Dom/Fest (%)' },
    { key: 'surcharge_henf', label: 'HENF - Extra Nocturna Dom/Fest (%)' },
    { key: 'surcharge_rnf', label: 'RNF - Recargo Nocturno Fest (%)' },
    { key: 'surcharge_dominical', label: 'Dominical/Festivo Trabajado (%)' },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
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
                <Select value={form.display_unit} onValueChange={v => setForm(f => ({ ...f, display_unit: v as any }))}>
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

          {/* Recargos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Porcentajes de Recargo</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {surchargeFields.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
