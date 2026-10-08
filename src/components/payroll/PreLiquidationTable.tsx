import { useEffect, useMemo, useRef, useState } from 'react';
import { Portal as TooltipPortal } from '@radix-ui/react-tooltip';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
  const customColumns = useMemo(() => [...new Map(rows.flatMap(row => Object.values(row.customConcepts || {})).map(c => [c.id, c])).values()].sort((a, b) => a.identifier.localeCompare(b.identifier)), [rows]);
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const firstRow = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(firstRow, firstRow + pageSize);

  useEffect(() => { setPage(1); }, [rows]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [rows, page, pageSize]);

  const pagination = (
    <nav aria-label="Paginación de preliquidación" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Mostrando {firstRow + 1}–{Math.min(firstRow + pageSize, rows.length)} de {rows.length} empleados
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          Filas por página
          <select className="h-9 rounded-md border border-input bg-background px-2" value={pageSize} onChange={event => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}>
            {[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
        <span className="text-sm">Página {currentPage} de {totalPages}</span>
        <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</Button>
      </div>
    </nav>
  );

  const fmt = (value: number, isOvertimeHours = false) => {
    if (isOvertimeHours) {
      return value.toLocaleString('es-CO', { maximumFractionDigits: 4 });
    }
    if (displayUnit === 'hours') {
      return (value * dailyHours).toLocaleString('es-CO', { maximumFractionDigits: 4 });
    }
    return value.toLocaleString('es-CO', { maximumFractionDigits: 4 });
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
          {pageRows.map(row => {
            const conceptos = [
              { label: 'Jornada', value: fmt(row.jornada) },
              { label: 'Desc. obligatorio trabajado', value: fmt(row.dominicalTrabajado) },
              { label: 'Fest. Trab.', value: fmt(row.festivoTrabajado) },
              { label: 'Desc. Rem.', value: fmt(row.descansoRemunerado) },
              { label: 'No trabajado', value: fmt(row.noTrabajado) },
              { label: 'Suspensión', value: fmt(row.suspension) },
              { label: 'HEDO', value: row.hedo > 0 ? fmt(row.hedo, true) : '-' },
              { label: 'HENO', value: row.heno > 0 ? fmt(row.heno, true) : '-' },
              { label: 'HEDF', value: row.hedf > 0 ? fmt(row.hedf, true) : '-' },
              { label: 'HENF', value: row.henf > 0 ? fmt(row.henf, true) : '-' },
              { label: 'RN', value: row.rn > 0 ? fmt(row.rn, true) : '-' },
              { label: 'RNF', value: row.rnf > 0 ? fmt(row.rnf, true) : '-' },
              { label: 'Incap. (días)', value: row.incapacidad > 0 ? row.incapacidad : '-' },
              { label: 'Vac. (días)', value: row.vacaciones > 0 ? row.vacaciones : '-' },
              { label: 'Perm. (días)', value: row.permiso > 0 ? row.permiso : '-' },
              ...customColumns.map(c => ({ label: `${c.identifier} · ${c.name} (${c.unit === 'days' ? 'días' : 'h'})`, value: String(row.customConcepts?.[c.id]?.quantity ?? 0) })),
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
                    <div className="grid gap-1 pt-1 text-xs text-muted-foreground">
                      <span><span className="font-medium text-foreground">Centro:</span> {row.operationCenterName}</span>
                      <span><span className="font-medium text-foreground">Descanso:</span> {row.restDay}</span>
                      <span><span className="font-medium text-foreground">Turno:</span> {row.shiftName}</span>
                    </div>
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
                    <div key={item.label} className="rounded-md bg-background px-2 py-2 text-center">
                      <div className="text-[11px] leading-tight text-muted-foreground">{item.label}</div>
                      <div className="mt-1 text-sm font-medium text-foreground">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-md bg-background /40 px-3 py-2">
                    <span className="text-muted-foreground">Préstamos</span>
                    <span className="font-medium text-foreground">{fmtMoney(row.loanDeduction)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-background /40 px-3 py-2">
                    <span className="text-muted-foreground">Descuentos</span>
                    <span className="font-medium text-foreground">{fmtMoney(row.deductionTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-primary/20 px-3 py-2">
                    <span className="font-medium text-foreground">Total deducciones</span>
                    <span className="font-semibold text-primary">{fmtMoney(row.totalDeducciones)}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {pagination}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-w-0 space-y-3">
        <div ref={scrollRef} role="region" aria-label="Resultados de preliquidación" tabIndex={0} className="max-h-[65dvh] overflow-auto overscroll-contain border rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <table aria-label="Preliquidación por empleado" className="w-full caption-bottom text-sm">
            <TableHeader className="sticky top-0 z-20 bg-background">
              <TableRow className="bg-background">
                <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Empleado</TableHead>
                <TableHead className="min-w-[180px]">Centro de Operación</TableHead>
                <TableHead className="min-w-[130px]">Día de Descanso</TableHead>
                <TableHead className="min-w-[140px]">Turno</TableHead>
                <TableHead className="text-center min-w-[70px]">Jornada</TableHead>
                <TableHead className="text-center min-w-[70px]">Desc. obligatorio trabajado</TableHead>
                <TableHead className="text-center min-w-[70px]">Fest. Trab.</TableHead>
                <TableHead className="text-center min-w-[70px]">Desc. Rem.</TableHead>
                <TableHead className="text-center min-w-[90px]">No trabajado</TableHead>
                <TableHead className="text-center min-w-[80px]">Suspensión</TableHead>
                <TableHead className="text-center min-w-[60px]">HEDO</TableHead>
                <TableHead className="text-center min-w-[60px]">HENO</TableHead>
                <TableHead className="text-center min-w-[60px]">HEDF</TableHead>
                <TableHead className="text-center min-w-[60px]">HENF</TableHead>
                <TableHead className="text-center min-w-[60px]">RN</TableHead>
                <TableHead className="text-center min-w-[60px]">RNF</TableHead>
                <TableHead className="text-center min-w-[60px]">Incap. (días)</TableHead>
                <TableHead className="text-center min-w-[60px]">Vac. (días)</TableHead>
                <TableHead className="text-center min-w-[60px]">Perm. (días)</TableHead>
                {customColumns.map(c => <TableHead key={c.id} className="text-center min-w-[150px]">{c.identifier} · {c.name} ({c.unit === 'days' ? 'días' : 'h'})</TableHead>)}
                <TableHead className="text-center min-w-[80px]">Total Días</TableHead>
                <TableHead className="text-center min-w-[100px] bg-orange-50 dark:bg-orange-950/20">Préstamos</TableHead>
                <TableHead className="text-center min-w-[100px] bg-orange-50 dark:bg-orange-950/20">Descuentos</TableHead>
                <TableHead className="text-center min-w-[110px] bg-orange-50 dark:bg-orange-950/20">Total Deduc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map(row => (
                <TableRow key={row.employeeId} className={row.hasWarning ? 'bg-destructive/5' : ''}>
                  <TableCell className="sticky left-0 bg-background z-10 font-medium">
                    <div className="flex items-center gap-2">
                      {row.hasWarning && (
                        <Tooltip>
                          <TooltipTrigger aria-label={`Ver alerta de ${row.employeeName}`}>
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipContent align="start" collisionPadding={12} className="max-w-[min(24rem,calc(100vw-2rem))] whitespace-normal break-words">
                              {row.warningMessage}
                            </TooltipContent>
                          </TooltipPortal>
                        </Tooltip>
                      )}
                      <div>
                        <div className="text-sm">{row.employeeName}</div>
                        <div className="text-xs text-muted-foreground">{row.documentNumber}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.operationCenterName}</TableCell>
                  <TableCell>{row.restDay}</TableCell>
                  <TableCell>{row.shiftName}</TableCell>
                  <TableCell className="text-center">{fmt(row.jornada)}</TableCell>
                  <TableCell className="text-center">{fmt(row.dominicalTrabajado)}</TableCell>
                  <TableCell className="text-center">{fmt(row.festivoTrabajado)}</TableCell>
                  <TableCell className="text-center">{fmt(row.descansoRemunerado)}</TableCell>
                  <TableCell className="text-center">{fmt(row.noTrabajado)}</TableCell>
                  <TableCell className="text-center">{fmt(row.suspension)}</TableCell>
                  <TableCell className="text-center">{row.hedo > 0 ? fmt(row.hedo, true) : '-'}</TableCell>
                  <TableCell className="text-center">{row.heno > 0 ? fmt(row.heno, true) : '-'}</TableCell>
                  <TableCell className="text-center">{row.hedf > 0 ? fmt(row.hedf, true) : '-'}</TableCell>
                  <TableCell className="text-center">{row.henf > 0 ? fmt(row.henf, true) : '-'}</TableCell>
                  <TableCell className="text-center">{row.rn > 0 ? fmt(row.rn, true) : '-'}</TableCell>
                  <TableCell className="text-center">{row.rnf > 0 ? fmt(row.rnf, true) : '-'}</TableCell>
                  <TableCell className="text-center">{row.incapacidad > 0 ? row.incapacidad : '-'}</TableCell>
                  <TableCell className="text-center">{row.vacaciones > 0 ? row.vacaciones : '-'}</TableCell>
                  <TableCell className="text-center">{row.permiso > 0 ? row.permiso : '-'}</TableCell>
                  {customColumns.map(c => <TableCell key={c.id} className="text-center">{row.customConcepts?.[c.id]?.quantity ?? 0}</TableCell>)}
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
                        <TooltipPortal>
                          <TooltipContent>
                            {row.loanDetail.map((l, i) => (
                              <div key={i} className="text-xs">{l.description}: {fmtMoney(l.installmentAmount)}</div>
                            ))}
                          </TooltipContent>
                        </TooltipPortal>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.deductionTotal > 0 ? (
                      <Tooltip>
                        <TooltipTrigger>
                          <span className="text-orange-600 dark:text-orange-400 font-medium">{fmtMoney(row.deductionTotal)}</span>
                        </TooltipTrigger>
                        <TooltipPortal>
                          <TooltipContent>
                            {row.deductionDetail.map((d, i) => (
                              <div key={i} className="text-xs">{d.description}: {fmtMoney(d.amount)}</div>
                            ))}
                          </TooltipContent>
                        </TooltipPortal>
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
          </table>
        </div>
        {pagination}
      </div>
    </TooltipProvider>
  );
}
