import { motion } from 'framer-motion';
import { TrendingUp, Target, Star, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360EvaluationsProps {
  evaluations: { evaluations: any[]; goals: any[] } | undefined;
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  borrador: { label: 'Borrador', color: 'bg-muted text-muted-foreground' },
  en_progreso: { label: 'En Progreso', color: 'bg-warning-light text-warning' },
  pendiente_revision: { label: 'Pendiente Revisión', color: 'bg-primary-light text-primary' },
  completado: { label: 'Completado', color: 'bg-success-light text-success' },
};

const goalStatusConfig: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: 'bg-muted text-muted-foreground' },
  en_progreso: { label: 'En Progreso', color: 'bg-warning-light text-warning' },
  completado: { label: 'Completado', color: 'bg-success-light text-success' },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive' },
};

export function Tab360Evaluations({ evaluations, isLoading }: Tab360EvaluationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
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

  const evals = evaluations?.evaluations || [];
  const goals = evaluations?.goals || [];

  if (evals.length === 0 && goals.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin evaluaciones</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene evaluaciones ni metas registradas.
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
      <Tabs defaultValue="evaluations" className="w-full">
        <TabsList>
          <TabsTrigger value="evaluations" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Evaluaciones ({evals.length})
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Metas ({goals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluations" className="mt-4">
          {evals.length > 0 ? (
            <div className="space-y-3">
              {evals.map((evaluation: any, index: number) => {
                const status = statusConfig[evaluation.status] || statusConfig.borrador;

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
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">
                                {evaluation.evaluation_templates?.name || 'Evaluación de Desempeño'}
                              </h4>
                              <Badge variant="outline" className={status.color}>
                                {status.label}
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
                          </div>

                          {evaluation.final_score !== null && (
                            <div className="text-center">
                              <div className="flex items-center gap-1 text-warning">
                                <Star className="w-5 h-5 fill-warning" />
                                <span className="text-2xl font-bold">{evaluation.final_score?.toFixed(1)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">Calificación Final</p>
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
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          {goals.length > 0 ? (
            <div className="space-y-3">
              {goals.map((goal: any, index: number) => {
                const status = goalStatusConfig[goal.status] || goalStatusConfig.pendiente;
                const progress = goal.progress || 0;

                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h4 className="font-medium">{goal.title}</h4>
                              {goal.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {goal.description}
                                </p>
                              )}
                            </div>
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Progreso</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>

                          {goal.due_date && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>Fecha límite: {format(new Date(goal.due_date), "d MMM yyyy", { locale: es })}</span>
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
                <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No hay metas registradas</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
