import { useState, useEffect } from 'react';
import { Target, Save, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    { key: 'min_female_pct' as const, label: 'Mujeres (%)', icon: '♀' },
    { key: 'min_disability_pct' as const, label: 'Discapacidad (%)', icon: '♿' },
    { key: 'min_ethnic_pct' as const, label: 'Grupo Étnico (%)', icon: '🌍' },
    { key: 'min_first_job_pct' as const, label: 'Primer Empleo (%)', icon: '🎓' },
    { key: 'min_head_household_pct' as const, label: 'Cabeza Familia (%)', icon: '🏠' },
  ];

  return (
    <Card className="rounded-[2.5rem] bg-background/50 backdrop-blur-xl border border-border/40 shadow-lg shadow-black/[0.02] overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Metas de Inclusión</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Objetivos porcentuales para procesos de selección</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</span>
              <Switch checked={goals.enabled} onCheckedChange={(v) => setGoals(g => ({ ...g, enabled: v }))} className="data-[state=checked]:bg-primary" />
            </div>
            <Button 
              onClick={handleSave} 
              disabled={updateConfig.isPending || !goals.enabled}
              className="h-11 px-8 rounded-xl bg-[#004a80] text-white hover:bg-[#003a66] shadow-lg shadow-blue-900/20 font-black uppercase tracking-widest text-[10px]"
            >
              {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              GUARDAR METAS
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {goals.enabled && (
        <CardContent className="p-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {goalFields.map(f => (
              <div key={f.key} className="group relative p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-black/5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{f.icon}</span>
                    <div className="h-6 px-2 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-[8px] font-black text-primary uppercase tracking-widest">MIN %</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{f.label.replace(' (%)', '')}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={goals[f.key]}
                      onChange={(e) => setGoals(g => ({ ...g, [f.key]: parseFloat(e.target.value) || 0 }))}
                      className="h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 font-black text-xs text-slate-900 px-4 transition-all"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl shadow-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-md shrink-0">
                  <Info className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black uppercase tracking-widest text-white">Sistema de Alertas Automáticas</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed max-w-md">
                    Notificar al cerrar vacante si los indicadores de diversidad se encuentran por debajo del umbral de cumplimiento establecido.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-8 px-8 py-4 rounded-[1.75rem] bg-white/5 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-primary uppercase tracking-widest block text-right">Umbral Crítico</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={goals.notify_threshold_pct}
                        onChange={(e) => setGoals(g => ({ ...g, notify_threshold_pct: parseFloat(e.target.value) || 80 }))}
                        className="h-10 w-20 rounded-xl bg-white/10 border-white/10 text-white font-black text-center text-xs focus-visible:ring-primary/50"
                      />
                      <span className="text-xs font-black text-white/50">%</span>
                    </div>
                  </div>
                </div>
                <div className="h-10 w-px bg-white/10" />
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Alertas</span>
                  <Switch
                    checked={goals.notify_on_close}
                    onCheckedChange={(v) => setGoals(g => ({ ...g, notify_on_close: v }))}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
