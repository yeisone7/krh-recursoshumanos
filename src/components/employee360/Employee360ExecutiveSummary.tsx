import { AlertTriangle, BriefcaseBusiness, CheckCircle2, FileWarning, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Employee360DataQuality } from '@/hooks/useEmployee360';
import { terminationTypeLabels, type TerminationType } from '@/types/termination';
import { cn } from '@/lib/utils';

interface Employee360ExecutiveSummaryProps {
  employee: any;
  contracts: any[];
  latestTermination: any | null;
  dataQuality: Employee360DataQuality | null;
  isLoading: boolean;
}

function contractTypeLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    indefinido: 'Indefinido',
    fijo: 'Termino fijo',
    obra_labor: 'Obra o labor',
    aprendizaje: 'Aprendizaje',
    servicios: 'Prestacion de servicios',
  };
  return value ? labels[value] || value : 'Sin contrato';
}

function terminationTypeLabel(value?: string | null): string {
  if (!value) return 'Sin retiro registrado';
  return terminationTypeLabels[value as TerminationType] || value;
}

export function Employee360ExecutiveSummary({
  employee,
  contracts,
  latestTermination,
  dataQuality,
  isLoading,
}: Employee360ExecutiveSummaryProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="border-none shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-5 w-28" />
              <Skeleton className="h-7 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activeContract = contracts.find((contract) => !contract.is_terminated);
  const criticalIssues = dataQuality?.issues.filter((issue) => issue.severity === 'critical').length || 0;
  const warningIssues = dataQuality?.issues.filter((issue) => issue.severity === 'warning').length || 0;
  const isRetired = employee?.is_active === false;
  const statusLabel = isRetired ? 'Retirado' : latestTermination && !latestTermination.is_completed ? 'En retiro' : 'Activo';

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <Card className="border-none shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            isRetired ? 'bg-muted text-muted-foreground' : 'bg-success-light text-success'
          )}>
            {isRetired ? <UserX className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado actual</p>
            <p className="truncate text-lg font-bold text-foreground">{statusLabel}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Contrato vigente</p>
            <p className="truncate text-lg font-bold text-foreground">
              {activeContract ? contractTypeLabel(activeContract.contract_type) : 'No registra'}
            </p>
            {activeContract?.contract_number && (
              <p className="truncate text-xs font-mono text-primary">{activeContract.contract_number}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
            <FileWarning className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ultimo retiro</p>
            <p className="truncate text-lg font-bold text-foreground">
              {terminationTypeLabel(latestTermination?.termination_type)}
            </p>
            {latestTermination?.reason && (
              <p className="truncate text-xs text-muted-foreground">{latestTermination.reason}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <div className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            criticalIssues > 0 ? 'bg-destructive/10 text-destructive' : 'bg-success-light text-success'
          )}>
            {criticalIssues > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Riesgos de datos</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline" className={criticalIssues > 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-success-light text-success border-success/20'}>
                {criticalIssues} criticos
              </Badge>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                {warningIssues} alertas
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
