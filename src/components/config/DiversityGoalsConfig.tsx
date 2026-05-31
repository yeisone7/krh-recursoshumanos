import { useState, useEffect } from 'react';
import { Accessibility, CircleUserRound, Globe2, GraduationCap, Home, Target, Save, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSystemConfig, useUpdateSystemConfig } from '@/hooks/useSystemConfig';

export interface DiversityGoals {
  enabled: boolean;
  min_female_pct: number;
  min_disability_pct: number;
  min_ethnic_pct: number;
  min_first_job_pct: number;
  min_head_household_pct: number;
  notify_on_close: boolean;
  notify_threshold_pct: number;
}

const DEFAULT_GOALS: DiversityGoals = {
  enabled: false,
  min_female_pct: 40,
  min_disability_pct: 2,
  min_ethnic_pct: 5,
  min_first_job_pct: 10,
  min_head_household_pct: 5,
  notify_on_close: true,
  notify_threshold_pct: 80,
};

export function DiversityGoalsConfig() {
  const { data: systemConfig } = useSystemConfig();
  const updateConfig = useUpdateSystemConfig();
  const [goals, setGoals] = useState<DiversityGoals>(DEFAULT_GOALS);

  useEffect(() => {
    if (systemConfig?.diversity_goals) {
      setGoals({ ...DEFAULT_GOALS, ...systemConfig.diversity_goals });
    }
  }, [systemConfig]);

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync({
        key: 'diversity_goals',
        value: goals,
        description: 'Metas porcentuales de diversidad e inclusión en procesos de selección',
      });
      toast.success('Metas de diversidad guardadas');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const goalFields = [
    { key: 'min_female_pct' as const, label: 'Género Femenino', icon: CircleUserRound, iconClass: 'bg-sky-50 text-sky-600 border-sky-100' },
    { key: 'min_disability_pct' as const, label: 'Inclusión Discapacidad', icon: Accessibility, iconClass: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { key: 'min_ethnic_pct' as const, label: 'Grupos Étnicos', icon: Globe2, iconClass: 'bg-violet-50 text-violet-600 border-violet-100' },
    { key: 'min_first_job_pct' as const, label: 'Primer Empleo Joven', icon: GraduationCap, iconClass: 'bg-amber-50 text-amber-600 border-amber-100' },
    { key: 'min_head_household_pct' as const, label: 'Cabeza de Familia', icon: Home, iconClass: 'bg-rose-50 text-rose-600 border-rose-100' },
  ];

  return (
    <Card className="rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden">
      <CardHeader className="p-8 border-b border-slate-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200">
              <Target className="w-7 h-7 text-primary stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900">Metas de Inclusión</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400">Objetivos estratégicos de diversidad corporativa</CardDescription>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motor de Seguimiento</span>
              <Switch 
                checked={goals.enabled} 
                onCheckedChange={(v) => setGoals(g => ({ ...g, enabled: v }))} 
                className="data-[state=checked]:bg-primary" 
              />
            </div>
            <Button 
              onClick={handleSave} 
              disabled={updateConfig.isPending || !goals.enabled}
              className="h-12 px-10 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] w-full sm:w-auto shadow-xl shadow-slate-200"
            >
              {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3" />}
              SINCRONIZAR METAS
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {goals.enabled && (
        <CardContent className="space-y-12 bg-slate-50/35 p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {goalFields.map(f => (
              <div key={f.key} className="group relative rounded-[2.5rem] border border-slate-200 bg-slate-50 p-8 transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition-all group-hover:scale-105 ${f.iconClass}`}>
                      <f.icon className="h-5 w-5 stroke-[2.25]" />
                    </div>
                    <Badge variant="outline" className="rounded-lg border-primary/30 bg-primary/10 px-2 py-1 text-[8px] font-black uppercase text-primary">OBJETIVO</Badge>
                  </div>
                  <div className="space-y-3">
                    <Label className="inline-flex rounded-lg bg-slate-200/70 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-700">{f.label}</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={goals[f.key]}
                        onChange={(e) => setGoals(g => ({ ...g, [f.key]: parseFloat(e.target.value) || 0 }))}
                        className="h-12 rounded-xl border border-slate-200 bg-white px-6 text-xs font-black text-slate-900 shadow-sm ring-primary/20 transition-all focus-visible:ring-2"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-[2.5rem] border border-sky-100 bg-white shadow-lg shadow-sky-100/60">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300" />
            <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-sky-100/60 blur-2xl" />
            
            <div className="relative grid gap-6 p-6 lg:grid-cols-[1.3fr_0.8fr_0.7fr] lg:items-stretch">
              <div className="flex items-center gap-5 rounded-[2rem] border border-sky-100 bg-sky-50/70 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-white text-primary shadow-sm">
                  <Info className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div className="space-y-2">
                  <Badge className="rounded-lg bg-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                    Alerta temprana
                  </Badge>
                  <p className="max-w-2xl text-[10px] font-black uppercase leading-relaxed tracking-widest text-slate-500">
                    Notificar automáticamente al cierre de vacante si los indicadores de inclusión divergen del umbral estratégico.
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-inner">
                <Label className="mb-3 block text-[9px] font-black uppercase tracking-widest text-slate-500">Umbral de Cumplimiento</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={goals.notify_threshold_pct}
                    onChange={(e) => setGoals(g => ({ ...g, notify_threshold_pct: parseFloat(e.target.value) || 80 }))}
                    className="h-12 w-24 rounded-2xl border-sky-100 bg-white text-center text-sm font-black text-slate-950 shadow-sm focus-visible:ring-primary/30"
                  />
                  <span className="rounded-xl bg-sky-100 px-3 py-2 text-[10px] font-black text-primary">%</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[2rem] border border-emerald-100 bg-emerald-50/80 p-5">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-700">Broadcast</span>
                  <span className="mt-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {goals.notify_on_close ? 'Activo' : 'Pausado'}
                  </span>
                </div>
                <Switch
                  checked={goals.notify_on_close}
                  onCheckedChange={(v) => setGoals(g => ({ ...g, notify_on_close: v }))}
                  className="scale-110 data-[state=checked]:bg-primary"
                />
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
