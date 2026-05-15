import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayrollConfig, useUpsertPayrollConfig } from '@/hooks/usePayrollConfig';
import { toast } from '@/hooks/use-toast';
import { Settings, Clock, Moon, Percent, Save, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  const sanitizeNonNegative = (value: string) => {
    if (value === '') return '';
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return '';
    return String(Math.max(0, numericValue));
  };

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
        max_weekly_hours: Math.max(0, Number(form.max_weekly_hours || 0)),
        daily_hours: Math.max(0, Number(form.daily_hours || 0)),
        surcharge_hedo: Math.max(0, Number(form.surcharge_hedo || 0)),
        surcharge_heno: Math.max(0, Number(form.surcharge_heno || 0)),
        surcharge_rn: Math.max(0, Number(form.surcharge_rn || 0)),
        surcharge_hedf: Math.max(0, Number(form.surcharge_hedf || 0)),
        surcharge_henf: Math.max(0, Number(form.surcharge_henf || 0)),
        surcharge_rnf: Math.max(0, Number(form.surcharge_rnf || 0)),
        surcharge_dominical: Math.max(0, Number(form.surcharge_dominical || 0)),
      });
      toast({ title: 'Configuración guardada correctamente' });
    } catch (err: any) {
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' });
    }
  };

  const surchargeFields = [
    { key: 'surcharge_hedo', label: 'HEDO - Extra Diurna Ordinaria (%)', desc: 'Trabajo extra en día ordinario' },
    { key: 'surcharge_heno', label: 'HENO - Extra Nocturna Ordinaria (%)', desc: 'Trabajo extra de noche en día ordinario' },
    { key: 'surcharge_rn', label: 'RN - Recargo Nocturno (%)', desc: 'Trabajo nocturno sin ser extra' },
    { key: 'surcharge_hedf', label: 'HEDF - Extra Diurna Dom/Fest (%)', desc: 'Trabajo extra de día en domingos/festivos' },
    { key: 'surcharge_henf', label: 'HENF - Extra Nocturna Dom/Fest (%)', desc: 'Trabajo extra de noche en domingos/festivos' },
    { key: 'surcharge_rnf', label: 'RNF - Recargo Nocturno Fest (%)', desc: 'Trabajo nocturno en domingos/festivos' },
    { key: 'surcharge_dominical', label: 'Dominical/Festivo Trabajado (%)', desc: 'Día de descanso laborado' },
  ] as const;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
        <p className="text-sm font-black uppercase tracking-widest">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-[2rem] border border-border p-8 sm:p-10 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Settings className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  ADMINISTRACIÓN
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground mb-1">
                Configuración Laboral
              </h1>
              <p className="text-sm font-medium text-muted-foreground max-w-xl">
                Ajusta los parámetros base de la nómina y los porcentajes de recargo de acuerdo con la legislación laboral colombiana vigente.
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={upsert.isPending} 
            size="lg"
            className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 w-full sm:w-auto"
          >
            {upsert.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {upsert.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Columna Izquierda: Jornadas */}
        <div className="space-y-8 lg:col-span-1">
          {/* Card Jornada */}
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-background border-b border-border/50 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">Jornada Laboral</CardTitle>
                  <CardDescription className="text-xs">Límites y unidad de visualización</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jornada máxima semanal (hrs)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    value={form.max_weekly_hours}
                    onChange={e => setForm(f => ({ ...f, max_weekly_hours: sanitizeNonNegative(e.target.value) }))}
                    className="h-12 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">hrs</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Jornada diaria ordinaria (hrs)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.daily_hours}
                    onChange={e => setForm(f => ({ ...f, daily_hours: sanitizeNonNegative(e.target.value) }))}
                    className="h-12 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold">hrs</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unidad de visualización UI</Label>
                <Select value={form.display_unit} onValueChange={v => setForm(f => ({ ...f, display_unit: v as any }))}>
                  <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border ">
                    <SelectItem value="hours">Mostrar en Horas</SelectItem>
                    <SelectItem value="days">Mostrar en Días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Card Nocturna */}
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-background border-b border-border/50 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">Jornada Nocturna</CardTitle>
                  <CardDescription className="text-xs">Horario de aplicación de recargos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hora de Inicio</Label>
                <Input
                  type="time"
                  value={form.night_start}
                  onChange={e => setForm(f => ({ ...f, night_start: e.target.value }))}
                  className="h-12 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hora de Fin</Label>
                <Input
                  type="time"
                  value={form.night_end}
                  onChange={e => setForm(f => ({ ...f, night_end: e.target.value }))}
                  className="h-12 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna Derecha: Recargos */}
        <div className="lg:col-span-2">
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden h-full">
            <CardHeader className="bg-background border-b border-border/50 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">Porcentajes de Recargo</CardTitle>
                  <CardDescription className="text-xs">Valores porcentuales sobre el valor de la hora ordinaria</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                {surchargeFields.map(({ key, label, desc }) => (
                  <div key={key} className="space-y-3 group">
                    <div>
                      <Label className="text-[11px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">
                        {label.split(' - ')[0]}
                      </Label>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{label.split(' - ')[1] || label.split(' - ')[0]}</p>
                    </div>
                    <div className="relative">
                      <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        value={form[key as keyof typeof form]}
                        onChange={e => setForm(f => ({ ...f, [key]: sanitizeNonNegative(e.target.value) }))}
                        className="h-12 pl-11 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground/70">{desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
