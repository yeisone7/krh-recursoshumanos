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
    <Card className="border-accent/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-accent-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Metas de Diversidad e Inclusión</CardTitle>
            <CardDescription>Objetivos porcentuales mínimos para procesos de selección</CardDescription>
          </div>
          <Switch checked={goals.enabled} onCheckedChange={(v) => setGoals(g => ({ ...g, enabled: v }))} />
        </div>
      </CardHeader>
      {goals.enabled && (
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goalFields.map(f => (
              <div key={f.key} className="space-y-1.5 p-3 border rounded-lg">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <span>{f.icon}</span> {f.label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={goals[f.key]}
                  onChange={(e) => setGoals(g => ({ ...g, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="h-9"
                />
              </div>
            ))}
          </div>

          <div className="p-3 border rounded-lg space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                Alertar cuando el proceso no cumpla con las metas
              </Label>
              <Switch
                checked={goals.notify_on_close}
                onCheckedChange={(v) => setGoals(g => ({ ...g, notify_on_close: v }))}
              />
            </div>
            {goals.notify_on_close && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Alertar al cerrar vacante si algún indicador está por debajo del umbral
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={goals.notify_threshold_pct}
                    onChange={(e) => setGoals(g => ({ ...g, notify_threshold_pct: parseFloat(e.target.value) || 80 }))}
                    className="h-9 w-24"
                  />
                  <span className="text-xs text-muted-foreground">% de cumplimiento mínimo para no alertar</span>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSave} disabled={updateConfig.isPending} size="sm">
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Guardar Metas
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
