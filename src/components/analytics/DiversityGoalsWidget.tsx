import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useSelectionDiversityReport } from '@/hooks/useReports';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import type { DiversityGoals } from '@/components/config/DiversityGoalsConfig';

interface GoalMetric {
  label: string;
  icon: string;
  current: number;
  goal: number;
  total: number;
}

export function DiversityGoalsWidget() {
  const { data: rows = [], isLoading: loadingRows } = useSelectionDiversityReport();
  const { data: systemConfig, isLoading: loadingConfig } = useSystemConfig();

  const goals: DiversityGoals | null = useMemo(() => {
    const g = systemConfig?.diversity_goals;
    return g?.enabled ? g : null;
  }, [systemConfig]);

  const metrics: GoalMetric[] = useMemo(() => {
    if (!goals || rows.length === 0) return [];
    const total = rows.length;
    const female = rows.filter(r => r.sexo_biologico === 'Femenino').length;
    const disability = rows.filter(r => r.discapacidad && r.discapacidad !== 'Ninguna').length;
    const ethnic = rows.filter(r => r.grupo_etnico && r.grupo_etnico !== 'No registrado' && r.grupo_etnico !== 'Ninguno').length;
    const firstJob = rows.filter(r => r.primer_empleo === 'Sí').length;
    const headHouse = rows.filter(r => r.cabeza_familia === 'Sí').length;

    return [
      { label: 'Mujeres', icon: '♀', current: female, goal: goals.min_female_pct, total },
      { label: 'Discapacidad', icon: '♿', current: disability, goal: goals.min_disability_pct, total },
      { label: 'Grupo Étnico', icon: '🌍', current: ethnic, goal: goals.min_ethnic_pct, total },
      { label: 'Primer Empleo', icon: '🎓', current: firstJob, goal: goals.min_first_job_pct, total },
      { label: 'Cabeza Familia', icon: '🏠', current: headHouse, goal: goals.min_head_household_pct, total },
    ];
  }, [goals, rows]);

  if (loadingRows || loadingConfig || !goals || metrics.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className="card-elevated p-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-lg text-foreground">
          Metas de Diversidad vs Resultados
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Progreso frente a los objetivos de inclusión configurados ({rows.length} candidatos)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map(m => {
          const currentPct = m.total > 0 ? (m.current / m.total) * 100 : 0;
          const progressVsGoal = m.goal > 0 ? Math.min((currentPct / m.goal) * 100, 100) : 100;
          const met = currentPct >= m.goal;

          return (
            <div
              key={m.label}
              className={`p-4 rounded-xl border transition-colors ${
                met
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <span>{m.icon}</span> {m.label}
                </span>
                {met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currentPct.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Meta: ≥{m.goal}% · {m.current}/{m.total}
              </div>
              <Progress
                value={progressVsGoal}
                className={`h-2 ${met ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500'}`}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
