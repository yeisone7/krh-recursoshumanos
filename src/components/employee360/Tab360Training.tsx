import { motion } from 'framer-motion';
import { GraduationCap, Calendar, Award, FileCheck, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360TrainingProps {
  training: { sessions: any[]; courses: any[]; completions?: any[] } | undefined;
  isLoading: boolean;
}

export function Tab360Training({ training, isLoading }: Tab360TrainingProps) {
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

  const completions = training?.completions || [];

  if (completions.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Sin capacitaciones</h3>
          <p className="text-muted-foreground">
            Este empleado no tiene capacitaciones registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completions.length}</p>
                <p className="text-sm text-muted-foreground">Capacitaciones Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                <Award className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completions.filter((c: any) => c.quiz_score != null && c.quiz_score >= 80).length}</p>
                <p className="text-sm text-muted-foreground">Aprobadas con ≥80%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completions list */}
      <div className="space-y-3">
        {completions.map((completion: any, index: number) => (
          <motion.div
            key={completion.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-success" />
                      <h4 className="font-medium">{completion.course?.name || 'Capacitación'}</h4>
                      <Badge variant="outline" className="bg-success-light text-success">Completada</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(completion.completed_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
                      </div>
                      {completion.course?.category && (
                        <Badge variant="secondary" className="text-xs">{completion.course.category}</Badge>
                      )}
                      {completion.token?.center?.name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{completion.token.center.name}</span>
                        </div>
                      )}
                    </div>
                    {completion.course?.legal_framework && (
                      <p className="text-xs text-muted-foreground">📋 Marco legal: {completion.course.legal_framework}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {completion.quiz_score != null && (
                      <Badge variant="outline" className={cn(
                        completion.quiz_score >= 80 ? 'bg-success-light text-success' :
                        completion.quiz_score >= 60 ? 'bg-warning-light text-warning' :
                        'bg-destructive/10 text-destructive'
                      )}>
                        Quiz: {completion.quiz_score}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
