import { AlertTriangle, Shield, Users, Briefcase } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { CandidateBackground } from '@/hooks/useCandidateBackground';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';

interface CandidateBackgroundAlertsProps {
  background: CandidateBackground | null;
  loading?: boolean;
  compact?: boolean;
}

const faultLabels: Record<string, string> = {
  leve: 'Leve',
  grave: 'Grave',
  gravisima: 'Gravísima',
};

const statusLabels: Record<string, string> = {
  apertura: 'Apertura',
  investigacion: 'Investigación',
  cerrado: 'Cerrado',
  decision: 'Decisión',
};

export function CandidateBackgroundAlerts({ background, loading, compact }: CandidateBackgroundAlertsProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Verificando antecedentes...
      </div>
    );
  }

  if (!background) return null;

  const hasEmployee = background.was_employee?.found;
  const hasDisciplinary = background.disciplinary_processes?.length > 0;
  const hasCandidacies = background.previous_candidacies?.length > 0;

  if (!hasEmployee && !hasDisciplinary && !hasCandidacies) return null;

  return (
    <div className={`space-y-2 ${compact ? '' : 'mb-4'}`}>
      {/* Disciplinary - Red */}
      {hasDisciplinary && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <Shield className="h-4 w-4 text-destructive" />
          <AlertTitle className="text-destructive font-semibold text-sm">
            Procesos Disciplinarios ({background.disciplinary_processes.length})
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            <div className="space-y-1">
              {background.disciplinary_processes.map((dp) => (
                <div key={dp.id} className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                    {dp.case_number}
                  </Badge>
                  <span className="text-muted-foreground">
                    Falta {faultLabels[dp.fault_type] || dp.fault_type} • {statusLabels[dp.status] || dp.status}
                    {dp.opening_date && ` • ${formatDateOnly(dp.opening_date, 'dd/MM/yyyy')}`}
                  </span>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Employee - Yellow/Warning */}
      {hasEmployee && (
        <Alert className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
          <Briefcase className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-400 font-semibold text-sm">
            Vinculación como Empleado
          </AlertTitle>
          <AlertDescription className="text-xs text-yellow-600 dark:text-yellow-500">
            {background.was_employee.first_name} {background.was_employee.last_name} —{' '}
            <Badge variant="outline" className={`text-xs ${background.was_employee.is_active ? 'border-green-500/50 text-green-600' : 'border-muted text-muted-foreground'}`}>
              {background.was_employee.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
            {background.was_employee.hire_date && (
              <span className="ml-1">
                • Ingreso: {formatDateOnly(background.was_employee.hire_date, 'dd/MM/yyyy')}
              </span>
            )}
            {background.was_employee.termination_date && (
              <span>
                • Retiro: {formatDateOnly(background.was_employee.termination_date, 'dd/MM/yyyy')}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Previous candidacies - Blue */}
      {hasCandidacies && (
        <Alert className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <Users className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-700 dark:text-blue-400 font-semibold text-sm">
            Procesos de Selección Previos ({background.previous_candidacies.length})
          </AlertTitle>
          <AlertDescription className="text-xs text-blue-600 dark:text-blue-500">
            <div className="space-y-1">
              {background.previous_candidacies.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.vacancy_title || 'Vacante'}</span>
                  <Badge variant="outline" className="text-xs border-blue-400/50">
                    {c.status === 'applied' ? 'Aplicó' : c.status === 'selected' ? 'Seleccionado' : c.status === 'not_selected' ? 'No seleccionado' : c.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    {formatDateOnly(c.application_date, 'dd/MM/yyyy')}
                  </span>
                </div>
              ))}
              {background.previous_candidacies.length > 3 && (
                <p className="text-muted-foreground">
                  y {background.previous_candidacies.length - 3} más...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
