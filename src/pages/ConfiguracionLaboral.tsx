import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayrollConfig, useUpsertPayrollConfig } from '@/hooks/usePayrollConfig';
import { toast } from '@/hooks/use-toast';
import { Settings } from 'lucide-react';

export default function ConfiguracionLaboral() {
  const { data: config, isLoading } = usePayrollConfig();
  const upsert = useUpsertPayrollConfig();

  const [form, setForm] = useState({
    max_weekly_hours: '46',
    daily_hours: '8',
    display_unit: 'hours' as 'hours' | 'days',
    night_start: '21:00',
    night_end: '06:00',
    surcharge_hedo: '25',
    surcharge_heno: '75',
    surcharge_rn: '35',
    surcharge_hedf: '100',
    surcharge_henf: '150',
    surcharge_rnf: '110',
    surcharge_dominical: '75',
  });

  useEffect(() => {
    if (config) {
      setForm({
        max_weekly_hours: String(config.max_weekly_hours ?? ''),
        daily_hours: String(config.daily_hours ?? ''),
        display_unit: config.display_unit as 'hours' | 'days',
        night_start: config.night_start?.substring(0, 5) || '21:00',
        night_end: config.night_end?.substring(0, 5) || '06:00',
        surcharge_hedo: String(config.surcharge_hedo ?? ''),
        surcharge_heno: String(config.surcharge_heno ?? ''),
        surcharge_rn: String(config.surcharge_rn ?? ''),
        surcharge_hedf: String(config.surcharge_hedf ?? ''),
        surcharge_henf: String(config.surcharge_henf ?? ''),
        surcharge_rnf: String(config.surcharge_rnf ?? ''),
        surcharge_dominical: String(config.surcharge_dominical ?? ''),
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        ...form,
        max_weekly_hours: Number(form.max_weekly_hours || 0),
        daily_hours: Number(form.daily_hours || 0),
        surcharge_hedo: Number(form.surcharge_hedo || 0),
        surcharge_heno: Number(form.surcharge_heno || 0),
        surcharge_rn: Number(form.surcharge_rn || 0),
        surcharge_hedf: Number(form.surcharge_hedf || 0),
        surcharge_henf: Number(form.surcharge_henf || 0),
        surcharge_rnf: Number(form.surcharge_rnf || 0),
        surcharge_dominical: Number(form.surcharge_dominical || 0),
      });
      toast({ title: 'Configuración guardada correctamente' });
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configuración Laboral
          </h1>
          <p className="text-muted-foreground">Parámetros de nómina y recargos según legislación colombiana</p>
        </div>
        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Jornada */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jornada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                step="0.5"
                value={form.daily_hours}
                onChange={e => setForm(f => ({ ...f, daily_hours: parseFloat(e.target.value) || 0 }))}
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
          </CardContent>
        </Card>

        {/* Nocturno */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jornada Nocturna</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Recargos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Porcentajes de Recargo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
