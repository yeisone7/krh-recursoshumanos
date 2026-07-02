import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { usePayrollConfig, useUpsertPayrollConfig } from '@/hooks/usePayrollConfig';
import { useCompanyPolicyUsers, useLaborDisconnectionPolicy, useUpsertLaborDisconnectionPolicy } from '@/hooks/useLaborDisconnectionPolicy';
import { toast } from '@/hooks/use-toast';
import { Settings, Clock, Moon, Percent, Save, Loader2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ConfiguracionLaboral() {
  const { data: config, isLoading } = usePayrollConfig();
  const { data: disconnectionPolicy, isLoading: isPolicyLoading } = useLaborDisconnectionPolicy();
  const { data: policyUsers = [] } = useCompanyPolicyUsers();
  const upsert = useUpsertPayrollConfig();
  const upsertDisconnection = useUpsertLaborDisconnectionPolicy();

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
  const [disconnectionForm, setDisconnectionForm] = useState({
    enabled: false,
    policy_name: 'Politica de desconexion laboral',
    legal_reference: 'Ley 2191 de 2022',
    protected_start_time: '18:00',
    protected_end_time: '07:00',
    applies_weekends: true,
    applies_holidays: true,
    responsible_user_id: 'none',
    last_review_date: '',
    next_review_date: '',
    exception_notes: '',
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

  useEffect(() => {
    if (disconnectionPolicy) {
      setDisconnectionForm({
        enabled: disconnectionPolicy.enabled,
        policy_name: disconnectionPolicy.policy_name || 'Politica de desconexion laboral',
        legal_reference: disconnectionPolicy.legal_reference || 'Ley 2191 de 2022',
        protected_start_time: disconnectionPolicy.protected_start_time?.substring(0, 5) || '18:00',
        protected_end_time: disconnectionPolicy.protected_end_time?.substring(0, 5) || '07:00',
        applies_weekends: disconnectionPolicy.applies_weekends,
        applies_holidays: disconnectionPolicy.applies_holidays,
        responsible_user_id: disconnectionPolicy.responsible_user_id || 'none',
        last_review_date: disconnectionPolicy.last_review_date || '',
        next_review_date: disconnectionPolicy.next_review_date || '',
        exception_notes: disconnectionPolicy.exception_notes || '',
      });
    }
  }, [disconnectionPolicy]);

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
      await upsertDisconnection.mutateAsync({
        enabled: disconnectionForm.enabled,
        policy_name: disconnectionForm.policy_name.trim() || 'Politica de desconexion laboral',
        legal_reference: disconnectionForm.legal_reference.trim() || 'Ley 2191 de 2022',
        protected_start_time: disconnectionForm.protected_start_time || '18:00',
        protected_end_time: disconnectionForm.protected_end_time || '07:00',
        applies_weekends: disconnectionForm.applies_weekends,
        applies_holidays: disconnectionForm.applies_holidays,
        responsible_user_id: disconnectionForm.responsible_user_id === 'none' ? null : disconnectionForm.responsible_user_id,
        last_review_date: disconnectionForm.last_review_date || null,
        next_review_date: disconnectionForm.next_review_date || null,
        exception_notes: disconnectionForm.exception_notes.trim() || null,
      });
      toast({ title: 'Configuracion guardada correctamente' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la configuracion.';
      toast({ title: 'Error al guardar', description: message, variant: 'destructive' });
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

  if (isLoading || isPolicyLoading) {
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
            disabled={upsert.isPending || upsertDisconnection.isPending} 
            size="lg"
            className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 w-full sm:w-auto"
          >
            {upsert.isPending || upsertDisconnection.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
            {upsert.isPending || upsertDisconnection.isPending ? 'Guardando...' : 'Guardar Cambios'}
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
                <Select value={form.display_unit} onValueChange={v => setForm(f => ({ ...f, display_unit: v as 'hours' | 'days' }))}>
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

          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-background border-b border-border/50 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black tracking-tight">Desconexion Laboral</CardTitle>
                  <CardDescription className="text-xs">Politica, horarios protegidos y revision</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Politica activa</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Habilita seguimiento operativo sin bloquear envios.</p>
                </div>
                <Switch
                  checked={disconnectionForm.enabled}
                  onCheckedChange={(checked) => setDisconnectionForm((prev) => ({ ...prev, enabled: checked }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nombre de politica</Label>
                <Input
                  value={disconnectionForm.policy_name}
                  onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, policy_name: event.target.value }))}
                  className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Referencia legal</Label>
                <Input
                  value={disconnectionForm.legal_reference}
                  onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, legal_reference: event.target.value }))}
                  className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Inicio protegido</Label>
                  <Input
                    type="time"
                    value={disconnectionForm.protected_start_time}
                    onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, protected_start_time: event.target.value }))}
                    className="h-12 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fin protegido</Label>
                  <Input
                    type="time"
                    value={disconnectionForm.protected_end_time}
                    onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, protected_end_time: event.target.value }))}
                    className="h-12 rounded-2xl bg-background border-border focus:bg-background font-mono text-lg"
                  />
                </div>
              </div>

              <div className="grid gap-3">
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fines de semana</span>
                    <span className="text-xs text-muted-foreground">Aplicar desconexion sabados y domingos.</span>
                  </span>
                  <Switch
                    checked={disconnectionForm.applies_weekends}
                    onCheckedChange={(checked) => setDisconnectionForm((prev) => ({ ...prev, applies_weekends: checked }))}
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Festivos</span>
                    <span className="text-xs text-muted-foreground">Aplicar desconexion en dias festivos.</span>
                  </span>
                  <Switch
                    checked={disconnectionForm.applies_holidays}
                    onCheckedChange={(checked) => setDisconnectionForm((prev) => ({ ...prev, applies_holidays: checked }))}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Responsable</Label>
                <Select
                  value={disconnectionForm.responsible_user_id}
                  onValueChange={(value) => setDisconnectionForm((prev) => ({ ...prev, responsible_user_id: value }))}
                >
                  <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border">
                    <SelectItem value="none">Sin responsable asignado</SelectItem>
                    {policyUsers.map((policyUser) => (
                      <SelectItem key={policyUser.id} value={policyUser.id}>
                        {policyUser.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ultima revision</Label>
                  <Input
                    type="date"
                    value={disconnectionForm.last_review_date}
                    onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, last_review_date: event.target.value }))}
                    className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proxima revision</Label>
                  <Input
                    type="date"
                    value={disconnectionForm.next_review_date}
                    onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, next_review_date: event.target.value }))}
                    className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Excepciones documentadas</Label>
                <Textarea
                  value={disconnectionForm.exception_notes}
                  onChange={(event) => setDisconnectionForm((prev) => ({ ...prev, exception_notes: event.target.value }))}
                  placeholder="Cargos de direccion, disponibilidad permanente, urgencias, fuerza mayor..."
                  className="min-h-28 rounded-2xl bg-background border-border focus:bg-background"
                />
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
