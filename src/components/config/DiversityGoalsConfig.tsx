import { useState, useEffect } from 'react';
import { Target, Save, Loader2, Info } from 'lucide-react';
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
    { key: 'min_female_pct' as const, label: 'Género Femenino', icon: '♀' },
    { key: 'min_disability_pct' as const, label: 'Inclusión Discapacidad', icon: '♿' },
    { key: 'min_ethnic_pct' as const, label: 'Grupos Étnicos', icon: '🌍' },
    { key: 'min_first_job_pct' as const, label: 'Primer Empleo Joven', icon: '🎓' },
    { key: 'min_head_household_pct' as const, label: 'Cabeza de Familia', icon: '🏠' },
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm grayscale group-hover:grayscale-0 transition-all">
                      {f.icon}
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

          <div className="relative overflow-hidden rounded-[3rem] border border-[#1e2f63] bg-[#0b1638] p-10 text-white shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none scale-150">
              <Target className="w-48 h-48" />
            </div>
            
            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-2xl">
                  <Info className="w-7 h-7 text-primary stroke-[2.5]" />
                </div>
                <div className="space-y-2 text-center lg:text-left">
                  <h4 className="text-lg font-black uppercase tracking-tighter">Protocolos de Alerta Temprana</h4>
                  <p className="max-w-lg text-[10px] font-black uppercase tracking-widest leading-relaxed text-blue-100/80">
                    Notificar automáticamente al cierre de vacante si los indicadores de inclusión divergen del umbral estratégico.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-8 rounded-[2rem] border border-[#2f4485] bg-[#13224d] p-6">
                <div className="space-y-2">
                  <Label className="block text-center text-[9px] font-black uppercase tracking-widest text-cyan-200 sm:text-right">Umbral de Cumplimiento</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={goals.notify_threshold_pct}
                      onChange={(e) => setGoals(g => ({ ...g, notify_threshold_pct: parseFloat(e.target.value) || 80 }))}
                      className="h-11 w-24 rounded-xl border-white/30 bg-white text-center text-xs font-black text-slate-900 shadow-inner focus-visible:ring-primary/50"
                    />
                    <span className="text-[10px] font-black text-white/70">%</span>
                  </div>
                </div>
                <div className="hidden sm:block h-12 w-px bg-white/10" />
                <div className="flex items-center gap-5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Broadcast</span>
                  <Switch
                    checked={goals.notify_on_close}
                    onCheckedChange={(v) => setGoals(g => ({ ...g, notify_on_close: v }))}
                    className="data-[state=checked]:bg-primary scale-110"
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
