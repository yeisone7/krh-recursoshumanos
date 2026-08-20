import { useMemo, useState } from 'react';
import { CalendarClock, ChevronRight, History, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSyncCompanyVacationBalances, useVacationBalanceMovements } from '@/hooks/useVacations';
import { formatDateOnly } from '@/lib/dateOnly';
import { buildVacationBalanceSummaries } from '@/lib/vacationBalances';
import type { VacationBalance, VacationBalanceMovementType, VacationBalanceSummary } from '@/types/vacation';

const movementLabels: Record<VacationBalanceMovementType, string> = {
  legacy_accrual: 'Saldo inicial',
  legacy_enjoyment: 'Disfrute anterior',
  legacy_compensation: 'Compensación anterior',
  automatic_accrual: 'Causación automática',
  reservation: 'Reserva de solicitud',
  reservation_release: 'Liberación de reserva',
  enjoyment: 'Vacaciones disfrutadas',
  compensation: 'Compensación en dinero',
  adjustment: 'Ajuste autorizado',
  liquidation: 'Liquidación',
  reversal: 'Reversión',
};

const days = (value: number) => Number(value).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

interface VacationBalancesPanelProps {
  balances: VacationBalance[];
  searchTerm: string;
  isLoading: boolean;
  onAdjust: () => void;
  canAdjust: boolean;
}

export function VacationBalancesPanel({ balances, searchTerm, isLoading, onAdjust, canAdjust }: VacationBalancesPanelProps) {
  const [selected, setSelected] = useState<VacationBalanceSummary | null>(null);
  const syncBalances = useSyncCompanyVacationBalances();
  const summaries = useMemo(() => buildVacationBalanceSummaries(balances).filter((summary) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return `${summary.employee?.first_name ?? ''} ${summary.employee?.last_name ?? ''} ${summary.employee?.document_number ?? ''}`.toLowerCase().includes(term);
  }), [balances, searchTerm]);

  return (
    <>
      <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-background shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20"><WalletCards className="h-5 w-5" /></span>
            <div>
              <h2 className="font-black tracking-tight">Libro corporativo de saldos</h2>
              <p className="text-sm text-muted-foreground">Causación proporcional sobre 360 días, reservas y trazabilidad por empleado.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => syncBalances.mutate()} disabled={syncBalances.isPending}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncBalances.isPending ? 'animate-spin' : ''}`} />Actualizar saldos
            </Button>
            {canAdjust && <Button onClick={onAdjust}><ShieldCheck className="mr-2 h-4 w-4" />Registrar ajuste</Button>}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm font-semibold text-muted-foreground">Calculando saldos a la fecha...</div>
        ) : summaries.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center text-muted-foreground"><CalendarClock className="mb-4 h-12 w-12 opacity-40" /><p className="font-bold">No hay saldos que coincidan</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="bg-slate-50/80 dark:bg-slate-900/40">
                <TableHead>Empleado</TableHead><TableHead className="text-right">Causados</TableHead><TableHead className="text-right">Disfrutados</TableHead><TableHead className="text-right">Compensados</TableHead><TableHead className="text-right">Reservados</TableHead><TableHead className="text-right">Disponibles</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>{summaries.map((summary) => (
                <TableRow key={summary.employee_id} className="cursor-pointer hover:bg-primary/[0.035]" onClick={() => setSelected(summary)}>
                  <TableCell><p className="font-bold">{summary.employee?.first_name} {summary.employee?.last_name}</p><p className="text-xs text-muted-foreground">{summary.employee?.document_number} · {summary.periods.length} período(s)</p></TableCell>
                  <TableCell className="text-right font-semibold">{days(summary.days_accrued + summary.days_adjusted)}</TableCell>
                  <TableCell className="text-right">{days(summary.days_taken)}</TableCell>
                  <TableCell className="text-right">{days(summary.days_compensated)}</TableCell>
                  <TableCell className="text-right"><Badge variant="outline" className={summary.days_reserved > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : ''}>{days(summary.days_reserved)}</Badge></TableCell>
                  <TableCell className="text-right"><span className="inline-flex min-w-16 justify-center rounded-xl bg-emerald-100 px-3 py-1.5 font-black text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{days(summary.days_available)}</span></TableCell>
                  <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </div>

      <VacationBalanceDetail summary={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </>
  );
}

function VacationBalanceDetail({ summary, onOpenChange }: { summary: VacationBalanceSummary | null; onOpenChange: (open: boolean) => void }) {
  const { data: movements = [], isLoading } = useVacationBalanceMovements(summary?.employee_id);
  return (
    <Dialog open={!!summary} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-4xl flex-col overflow-hidden rounded-3xl p-0">
        <DialogHeader className="border-b border-primary/15 bg-gradient-to-r from-primary/12 via-primary/5 to-background px-6 py-6 pr-12">
          <div className="flex items-center gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><History className="h-5 w-5" /></span><div className="text-left"><DialogTitle className="text-2xl font-black">{summary?.employee?.first_name} {summary?.employee?.last_name}</DialogTitle><p className="text-sm text-muted-foreground">Libro de movimientos · {summary?.employee?.document_number}</p></div></div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-primary/15 bg-primary/5"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Causado + ajustes</p><p className="text-2xl font-black text-primary">{days((summary?.days_accrued ?? 0) + (summary?.days_adjusted ?? 0))}</p></CardContent></Card>
            <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Reservado en aprobación</p><p className="text-2xl font-black text-amber-700 dark:text-amber-300">{days(summary?.days_reserved ?? 0)}</p></CardContent></Card>
            <Card className="border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Disponible real</p><p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{days(summary?.days_available ?? 0)}</p></CardContent></Card>
          </div>
          <div className="overflow-hidden rounded-2xl border">
            <Table><TableHeader><TableRow className="bg-slate-50/80 dark:bg-slate-900/40"><TableHead>Fecha</TableHead><TableHead>Movimiento</TableHead><TableHead>Detalle</TableHead><TableHead className="text-right">Días</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
              <TableBody>{isLoading ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Cargando trazabilidad...</TableCell></TableRow> : movements.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Aún no hay movimientos registrados.</TableCell></TableRow> : movements.map((movement) => <TableRow key={movement.id}><TableCell className="whitespace-nowrap">{formatDateOnly(movement.effective_date, 'dd/MM/yyyy')}</TableCell><TableCell><Badge variant="outline">{movementLabels[movement.movement_type]}</Badge></TableCell><TableCell className="max-w-xs text-sm text-muted-foreground">{movement.reason}</TableCell><TableCell className={`text-right font-bold ${Number(movement.days_delta) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(movement.days_delta) > 0 ? '+' : ''}{days(movement.days_delta)}</TableCell><TableCell className="text-right font-semibold">{days(movement.balance_after)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
