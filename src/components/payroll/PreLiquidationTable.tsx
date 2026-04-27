import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import type { PreLiquidationRow } from '@/types/payroll';

interface Props {
  rows: PreLiquidationRow[];
  displayUnit: 'hours' | 'days';
  dailyHours: number;
}

export function PreLiquidationTable({ rows, displayUnit, dailyHours }: Props) {
  const isMobile = useIsMobile();

  const fmt = (value: number, isOvertimeHours = false) => {
    if (isOvertimeHours) {
      return value.toFixed(1);
    }
    if (displayUnit === 'hours') {
      return (value * dailyHours).toFixed(1);
    }
    return value.toFixed(1);
  };

  const fmtMoney = (value: number) => {
    if (value === 0) return '-';
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No hay datos para mostrar. Seleccione un período y haga clic en "Calcular".
      </div>
    );
  }

  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="space-y-3">
          {rows.map(row => {
            const conceptos = [
              { label: 'Jornada', value: fmt(row.jornada) },
              { label: 'Dom. Trab.', value: fmt(row.dominicalTrabajado) },
              { label: 'Fest. Trab.', value: fmt(row.festivoTrabajado) },
              { label: 'Desc. Rem.', value: fmt(row.descansoRemunerado) },
              { label: 'HEDO', value: row.hedo > 0 ? row.hedo.toFixed(1) : '-' },
              { label: 'HENO', value: row.heno > 0 ? row.heno.toFixed(1) : '-' },
              { label: 'HEDF', value: row.hedf > 0 ? row.hedf.toFixed(1) : '-' },
              { label: 'HENF', value: row.henf > 0 ? row.henf.toFixed(1) : '-' },
              { label: 'RN', value: row.rn > 0 ? row.rn.toFixed(1) : '-' },
              { label: 'RNF', value: row.rnf > 0 ? row.rnf.toFixed(1) : '-' },
              { label: 'Incap.', value: row.incapacidad > 0 ? row.incapacidad : '-' },
              { label: 'Vac.', value: row.vacaciones > 0 ? row.vacaciones : '-' },
              { label: 'Perm.', value: row.permiso > 0 ? row.permiso : '-' },
            ];

            return (
              <div key={row.employeeId} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {row.hasWarning && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
                      <h3 className="truncate text-sm font-semibold text-card-foreground">{row.employeeName}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{row.documentNumber}</p>
                  </div>
                  <Badge variant={row.hasWarning ? 'destructive' : 'secondary'} className="shrink-0">
                    {row.totalDias} días
                  </Badge>
                </div>

                {row.hasWarning && row.warningMessage && (
                  <div className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {row.warningMessage}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {conceptos.map(item => (
                    <div key={item.label} className="rounded-md bg-muted/50 px-2 py-2 text-center">
                      <div className="text-[11px] leading-tight text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Préstamos</span>
                    <span className="font-medium text-foreground">{fmtMoney(row.loanDeduction)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                    <span className="text-muted-foreground">Descuentos</span>
                    <span className="font-medium text-foreground">{fmtMoney(row.deductionTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                    <span className="font-medium text-foreground">Total deducciones</span>
                    <span className="font-semibold text-primary">{fmtMoney(row.totalDeducciones)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="sticky left-0 bg-muted/50 z-10 min-w-[200px]">Empleado</TableHead>
              <TableHead className="text-center min-w-[70px]">Jornada</TableHead>
              <TableHead className="text-center min-w-[70px]">Dom. Trab.</TableHead>
              <TableHead className="text-center min-w-[70px]">Fest. Trab.</TableHead>
              <TableHead className="text-center min-w-[70px]">Desc. Rem.</TableHead>
              <TableHead className="text-center min-w-[60px]">HEDO</TableHead>
              <TableHead className="text-center min-w-[60px]">HENO</TableHead>
              <TableHead className="text-center min-w-[60px]">HEDF</TableHead>
              <TableHead className="text-center min-w-[60px]">HENF</TableHead>
              <TableHead className="text-center min-w-[60px]">RN</TableHead>
              <TableHead className="text-center min-w-[60px]">RNF</TableHead>
              <TableHead className="text-center min-w-[60px]">Incap.</TableHead>
              <TableHead className="text-center min-w-[60px]">Vac.</TableHead>
              <TableHead className="text-center min-w-[60px]">Perm.</TableHead>
              <TableHead className="text-center min-w-[80px]">Total Días</TableHead>
              <TableHead className="text-center min-w-[100px] bg-orange-50 dark:bg-orange-950/20">Préstamos</TableHead>
              <TableHead className="text-center min-w-[100px] bg-orange-50 dark:bg-orange-950/20">Descuentos</TableHead>
              <TableHead className="text-center min-w-[110px] bg-orange-50 dark:bg-orange-950/20">Total Deduc.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.employeeId} className={row.hasWarning ? 'bg-destructive/5' : ''}>
                <TableCell className="sticky left-0 bg-background z-10 font-medium">
                  <div className="flex items-center gap-2">
                    {row.hasWarning && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>{row.warningMessage}</TooltipContent>
                      </Tooltip>
                    )}
                    <div>
                      <div className="text-sm">{row.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{row.documentNumber}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">{fmt(row.jornada)}</TableCell>
                <TableCell className="text-center">{fmt(row.dominicalTrabajado)}</TableCell>
                <TableCell className="text-center">{fmt(row.festivoTrabajado)}</TableCell>
                <TableCell className="text-center">{fmt(row.descansoRemunerado)}</TableCell>
                <TableCell className="text-center">{row.hedo > 0 ? row.hedo.toFixed(1) : '-'}</TableCell>
                <TableCell className="text-center">{row.heno > 0 ? row.heno.toFixed(1) : '-'}</TableCell>
                <TableCell className="text-center">{row.hedf > 0 ? row.hedf.toFixed(1) : '-'}</TableCell>
                <TableCell className="text-center">{row.henf > 0 ? row.henf.toFixed(1) : '-'}</TableCell>
                <TableCell className="text-center">{row.rn > 0 ? row.rn.toFixed(1) : '-'}</TableCell>
                <TableCell className="text-center">{row.rnf > 0 ? row.rnf.toFixed(1) : '-'}</TableCell>
                <TableCell className="text-center">{row.incapacidad > 0 ? row.incapacidad : '-'}</TableCell>
                <TableCell className="text-center">{row.vacaciones > 0 ? row.vacaciones : '-'}</TableCell>
                <TableCell className="text-center">{row.permiso > 0 ? row.permiso : '-'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={row.hasWarning ? 'destructive' : 'secondary'}>
                    {row.totalDias}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {row.loanDeduction > 0 ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-orange-600 dark:text-orange-400 font-medium">{fmtMoney(row.loanDeduction)}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {row.loanDetail.map((l, i) => (
                          <div key={i} className="text-xs">{l.description}: {fmtMoney(l.installmentAmount)}</div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {row.deductionTotal > 0 ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-orange-600 dark:text-orange-400 font-medium">{fmtMoney(row.deductionTotal)}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {row.deductionDetail.map((d, i) => (
                          <div key={i} className="text-xs">{d.description}: {fmtMoney(d.amount)}</div>
                        ))}
                      </TooltipContent>
                    </Tooltip>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-center">
                  {row.totalDeducciones > 0 ? (
                    <Badge variant="outline" className="border-orange-300 text-orange-700 dark:text-orange-400">
                      {fmtMoney(row.totalDeducciones)}
                    </Badge>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
