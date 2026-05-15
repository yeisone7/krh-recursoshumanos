import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Star, Calendar, Award, AlertTriangle, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EVALUATION_STATUS_LABELS, EVALUATION_TYPE_LABELS, DEFAULT_RATING_SCALE } from '@/types/evaluation';
import type { EvaluationStatus, EvaluationType } from '@/types/evaluation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Tab360EvaluationsProps {
  evaluations: { evaluations: any[]; goals: any[] } | undefined;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  pending: 'bg-background text-muted-foreground',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  reviewed: 'bg-primary/10 text-primary',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};

function getScoreColor(score: number) {
  if (score >= 91) return 'text-emerald-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-destructive';
}

function getRatingLabel(score: number): string {
  const rating = DEFAULT_RATING_SCALE.find(r => score >= r.min && score <= r.max);
  return rating?.label || '-';
}

const goalStatusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-background text-muted-foreground' },
  en_progreso: { label: 'En Progreso', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  completado: { label: 'Completado', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive' },
};

export function Tab360Evaluations({ evaluations, isLoading }: Tab360EvaluationsProps) {
  const evals = evaluations?.evaluations || [];

  const scoredEvals = evals.filter((e: any) => e.overall_score != null && e.overall_score > 0);
  const avgScore = scoredEvals.length > 0
    ? Math.round(scoredEvals.reduce((sum: number, e: any) => sum + (e.overall_score || 0), 0) / scoredEvals.length)
    : 0;
  const completedCount = evals.filter((e: any) => ['submitted', 'reviewed', 'approved'].includes(e.status)).length;
  const pendingCount = evals.filter((e: any) => e.status === 'pending' || e.status === 'in_progress').length;

  const scoreHistory = useMemo(() => {
    return scoredEvals
      .slice()
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-8)
      .map((e: any) => ({
        name: e.evaluation_cycles?.name
          ? (e.evaluation_cycles.name.length > 12 ? e.evaluation_cycles.name.substring(0, 12) + '…' : e.evaluation_cycles.name)
          : format(new Date(e.created_at), 'MMM yy', { locale: es }),
        puntaje: e.overall_score || 0,
      }));
  }, [scoredEvals]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (evals.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin evaluaciones de desempeño</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene evaluaciones registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* KPIs Row */}
      {evals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{evals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Promedio</p>
                  <p className={`text-2xl font-bold ${avgScore > 0 ? getScoreColor(avgScore) : ''}`}>
                    {avgScore > 0 ? `${avgScore}/100` : '-'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold">{completedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score History Chart */}
      {scoreHistory.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Evolución de Puntajes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${value}/100`, 'Puntaje']} />
                <Bar dataKey="puntaje" radius={[4, 4, 0, 0]}>
                  {scoreHistory.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.puntaje >= 91 ? '#10b981'
                        : entry.puntaje >= 75 ? '#3b82f6'
                        : entry.puntaje >= 60 ? '#f59e0b'
                        : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Evaluations list */}
      {evals.length > 0 ? (
        <div className="space-y-3">
          {evals.map((evaluation: any, index: number) => {
            const statusLabel = EVALUATION_STATUS_LABELS[evaluation.status as EvaluationStatus] || evaluation.status;
            const statusClass = statusColors[evaluation.status] || statusColors.pending;
            const typeLabel = EVALUATION_TYPE_LABELS[evaluation.evaluation_type as EvaluationType] || evaluation.evaluation_type;
            const score = evaluation.overall_score;
            const ratingLabel = score != null && score > 0 ? getRatingLabel(score) : null;

            return (
              <motion.div
                key={evaluation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">
                            {evaluation.evaluation_cycles?.evaluation_templates?.name || evaluation.evaluation_cycles?.name || 'Evaluación de Desempeño'}
                          </h4>
                          <Badge variant="outline" className={statusClass}>
                            {statusLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {typeLabel}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {evaluation.evaluation_cycles?.name && (
                            <span>Ciclo: {evaluation.evaluation_cycles.name}</span>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {format(new Date(evaluation.created_at), "d MMM yyyy", { locale: es })}
                            </span>
                          </div>
                        </div>

                        {/* Score bar */}
                        {score != null && score > 0 && (
                          <div className="flex items-center gap-3 mt-1">
                            <Progress value={score} className="h-2 flex-1 max-w-[200px]" />
                            <span className={`text-xs font-medium ${getScoreColor(score)}`}>
                              {ratingLabel}
                            </span>
                          </div>
                        )}
                      </div>

                      {score != null && score > 0 && (
                        <div className="text-center shrink-0">
                          <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">/100</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No hay evaluaciones registradas</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}