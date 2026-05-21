import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee360DataQuality as DataQuality } from '@/hooks/useEmployee360';
import { cn } from '@/lib/utils';

interface Employee360DataQualityProps {
  dataQuality: DataQuality | null;
  isLoading: boolean;
}

const severityStyles = {
  critical: {
    icon: AlertTriangle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
    label: 'Critico',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning/20',
    label: 'Atencion',
  },
  info: {
    icon: Info,
    className: 'bg-primary/10 text-primary border-primary/20',
    label: 'Info',
  },
};

export function Employee360DataQuality({ dataQuality, isLoading }: Employee360DataQualityProps) {
  if (isLoading) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <Skeleton className="mb-3 h-5 w-48" />
          <Skeleton className="mb-3 h-2 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!dataQuality) return null;

  const isHealthy = dataQuality.issues.length === 0;

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              isHealthy ? 'bg-success-light text-success' : 'bg-warning/10 text-warning'
            )}>
              {isHealthy ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Calidad del Expediente</h3>
              <p className="text-sm text-muted-foreground">
                {dataQuality.completed} de {dataQuality.total} bloques clave completos
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'w-fit text-xs font-bold',
              isHealthy ? 'bg-success-light text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'
            )}
          >
            {dataQuality.score}% completo
          </Badge>
        </div>

        <Progress value={dataQuality.score} className="h-2" />

        {isHealthy ? (
          <div className="flex items-center gap-2 rounded-lg bg-success-light p-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Expediente sin alertas de completitud.
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {dataQuality.issues.slice(0, 4).map((issue) => {
              const style = severityStyles[issue.severity];
              const Icon = style.icon;
              return (
                <div key={issue.id} className="rounded-lg border bg-background p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{issue.label}</span>
                    <Badge variant="outline" className={cn('ml-auto text-[10px]', style.className)}>
                      {style.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{issue.description}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
