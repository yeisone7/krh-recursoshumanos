import { motion } from 'framer-motion';
import { GraduationCap, Calendar, Award, Clock, User, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Tab360TrainingProps {
  training: { sessions: any[]; courses: any[] } | undefined;
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  programado: { label: 'Programado', color: 'bg-primary-light text-primary' },
  en_progreso: { label: 'En Progreso', color: 'bg-warning-light text-warning' },
  completado: { label: 'Completado', color: 'bg-success-light text-success' },
  cancelado: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
};

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

  const sessions = training?.sessions || [];

  if (sessions.length === 0) {
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

  const completedCount = sessions.filter((s: any) => s.status === 'completado').length;
  const upcomingCount = sessions.filter((s: any) => 
    ['programado', 'en_progreso'].includes(s.status) && new Date(s.start_date) >= new Date()
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sessions.length}</p>
                <p className="text-sm text-muted-foreground">Total Capacitaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
                <Calendar className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Próximas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {sessions.map((session: any, index: number) => {
          const status = statusConfig[session.status] || statusConfig.programado;

          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <h4 className="font-medium">
                          {session.training_courses?.name || 'Capacitación'}
                        </h4>
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(session.start_date), "d MMM yyyy", { locale: es })}
                            {session.end_date && session.end_date !== session.start_date && (
                              <> - {format(new Date(session.end_date), "d MMM yyyy", { locale: es })}</>
                            )}
                          </span>
                        </div>
                        {session.start_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{session.start_time} - {session.end_time}</span>
                          </div>
                        )}
                        {session.instructor_name && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{session.instructor_name}</span>
                          </div>
                        )}
                      </div>

                      {session.location && (
                        <p className="text-sm text-muted-foreground">📍 {session.location}</p>
                      )}
                    </div>

                    {session.training_courses?.certificate_validity_months && (
                      <div className="text-right">
                        <Badge variant="outline" className="bg-success-light text-success">
                          <Award className="w-3 h-3 mr-1" />
                          Certificado válido {session.training_courses.certificate_validity_months} meses
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
