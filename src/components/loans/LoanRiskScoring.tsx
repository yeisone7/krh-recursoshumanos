import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, Shield, AlertTriangle, Info } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import type { EmployeeLoan } from '@/hooks/useLoans';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

interface EmployeeRisk {
  employeeId: string;
  employeeName: string;
  documentNumber: string;
  score: number; // 0-100, higher = riskier
  riskLevel: 'bajo' | 'medio' | 'alto' | 'critico';
  factors: string[];
  activeLoans: number;
  totalBalance: number;
  overdueInstallments: number;
  onTimeRate: number; // % of installments paid on time
}

interface Props {
  loans: EmployeeLoan[];
}

function computeRisk(employeeLoans: EmployeeLoan[]): Omit<EmployeeRisk, 'employeeId' | 'employeeName' | 'documentNumber'> {
  const today = new Date();
  const activeLoans = employeeLoans.filter(l => l.status === 'activo');
  const allLoans = employeeLoans;
  const factors: string[] = [];
  let score = 0;

  const totalBalance = activeLoans.reduce((s, l) => s + Number(l.remaining_balance), 0);
  const totalPaid = allLoans.reduce((s, l) => s + l.paid_installments, 0);
  const totalExpected = allLoans.reduce((s, l) => {
    const startDate = new Date(l.start_date);
    const monthsElapsed = Math.max(0, Math.floor(differenceInDays(today, startDate) / 30));
    return s + Math.min(monthsElapsed, l.installments);
  }, 0);

  const overdueInstallments = activeLoans.reduce((s, l) => {
    const startDate = new Date(l.start_date);
    const monthsElapsed = Math.max(0, Math.floor(differenceInDays(today, startDate) / 30));
    const expected = Math.min(monthsElapsed, l.installments);
    return s + Math.max(0, expected - l.paid_installments);
  }, 0);

  const onTimeRate = totalExpected > 0 ? Math.min(100, (totalPaid / totalExpected) * 100) : 100;

  // Factor 1: Overdue installments (0-35 points)
  if (overdueInstallments > 0) {
    const overdueScore = Math.min(35, overdueInstallments * 10);
    score += overdueScore;
    factors.push(`${overdueInstallments} cuota(s) vencida(s)`);
  }

  // Factor 2: Payment consistency (0-25 points)
  if (onTimeRate < 100) {
    const consistencyPenalty = Math.round((100 - onTimeRate) * 0.25);
    score += consistencyPenalty;
    if (onTimeRate < 70) factors.push(`Tasa de pago baja: ${onTimeRate.toFixed(0)}%`);
  }

  // Factor 3: Number of active loans (0-15 points)
  if (activeLoans.length > 1) {
    score += Math.min(15, (activeLoans.length - 1) * 5);
    factors.push(`${activeLoans.length} préstamos activos simultáneos`);
  }

  // Factor 4: High balance ratio (0-15 points)
  const totalOriginal = activeLoans.reduce((s, l) => s + Number(l.total_with_interest), 0);
  const balanceRatio = totalOriginal > 0 ? (totalBalance / totalOriginal) : 0;
  if (balanceRatio > 0.8 && totalExpected > 2) {
    score += 10;
    factors.push('Alto saldo pendiente respecto al original');
  }

  // Factor 5: History of cancelled/rejected loans (0-10 points)
  const cancelled = allLoans.filter(l => l.status === 'cancelado').length;
  if (cancelled > 0) {
    score += Math.min(10, cancelled * 5);
    factors.push(`${cancelled} préstamo(s) cancelado(s)`);
  }

  score = Math.min(100, score);

  const riskLevel: EmployeeRisk['riskLevel'] =
    score >= 70 ? 'critico' :
    score >= 45 ? 'alto' :
    score >= 20 ? 'medio' : 'bajo';

  if (factors.length === 0) factors.push('Sin factores de riesgo identificados');

  return { score, riskLevel, factors, activeLoans: activeLoans.length, totalBalance, overdueInstallments, onTimeRate };
}

const RISK_CONFIG = {
  bajo: { label: 'Bajo', color: 'text-primary', bg: 'bg-primary/10', icon: ShieldCheck, progressColor: 'bg-primary' },
  medio: { label: 'Medio', color: 'text-warning', bg: 'bg-warning/10', icon: Shield, progressColor: 'bg-warning' },
  alto: { label: 'Alto', color: 'text-destructive', bg: 'bg-destructive/10', icon: ShieldAlert, progressColor: 'bg-destructive' },
  critico: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/15', icon: AlertTriangle, progressColor: 'bg-destructive' },
};

export function LoanRiskScoring({ loans }: Props) {
  const riskData = useMemo(() => {
    // Group loans by employee
    const byEmployee: Record<string, EmployeeLoan[]> = {};
    loans.forEach(l => {
      if (!byEmployee[l.employee_id]) byEmployee[l.employee_id] = [];
      byEmployee[l.employee_id].push(l);
    });

    const results: EmployeeRisk[] = Object.entries(byEmployee).map(([employeeId, empLoans]) => {
      const emp = empLoans[0].employees_v2;
      const risk = computeRisk(empLoans);
      return {
        employeeId,
        employeeName: emp ? `${emp.first_name} ${emp.last_name}` : 'Empleado',
        documentNumber: emp?.document_number || '',
        ...risk,
      };
    });

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }, [loans]);

  // Summary
  const summary = useMemo(() => {
    const counts = { bajo: 0, medio: 0, alto: 0, critico: 0 };
    riskData.forEach(r => counts[r.riskLevel]++);
    return counts;
  }, [riskData]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {(Object.entries(summary) as [EmployeeRisk['riskLevel'], number][]).map(([level, count]) => {
          const cfg = RISK_CONFIG[level];
          const Icon = cfg.icon;
          return (
            <Card key={level}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.bg)}>
                    <Icon className={cn("w-4 h-4", cfg.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Riesgo {cfg.label}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Employee risk table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Scoring de Riesgo por Empleado
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    El scoring evalúa: cuotas vencidas, consistencia de pagos, cantidad de préstamos activos,
                    ratio de saldo e historial de cancelaciones. Rango 0-100 (mayor = más riesgo).
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riskData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay empleados con préstamos</div>
          ) : (
            <div className="space-y-3">
              {riskData.map(emp => {
                const cfg = RISK_CONFIG[emp.riskLevel];
                const Icon = cfg.icon;
                return (
                  <div key={emp.employeeId} className="flex flex-col gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors sm:flex-row sm:items-center sm:gap-4">
                    {/* Risk indicator */}
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
                      <Icon className={cn("w-5 h-5", cfg.color)} />
                    </div>

                    {/* Employee info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm truncate">{emp.employeeName}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5", cfg.color)}>
                          {cfg.label} ({emp.score})
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>{emp.activeLoans} préstamo(s)</span>
                        <span>•</span>
                        <span>{formatCurrency(emp.totalBalance)} pendiente</span>
                        {emp.overdueInstallments > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-destructive font-medium">{emp.overdueInstallments} cuota(s) en mora</span>
                          </>
                        )}
                      </div>
                      {/* Factors */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {emp.factors.map((f, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Score bar */}
                    <div className="w-full shrink-0 sm:w-24">
                      <div className="text-xs text-left text-muted-foreground mb-1 sm:text-right">{emp.onTimeRate.toFixed(0)}% al día</div>
                      <Progress value={emp.score} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
