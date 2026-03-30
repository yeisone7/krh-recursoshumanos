import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PreLiquidationRow } from '@/types/payroll';

interface Props {
  rows: PreLiquidationRow[];
  displayUnit: 'hours' | 'days';
  dailyHours: number;
}

export function PreLiquidationTable({ rows, displayUnit, dailyHours }: Props) {
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
