import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, DollarSign } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { EmployeeLoan } from '@/hooks/useLoans';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

interface InstallmentEvent {
  loanId: string;
  employeeName: string;
  amount: number;
  installmentNumber: number;
  totalInstallments: number;
  loanType: string;
  isPaid: boolean;
  isOverdue: boolean;
}

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal', vivienda: 'Vivienda', educacion: 'Educación',
  calamidad: 'Calamidad', libranza: 'Libranza', anticipo: 'Anticipo', otro: 'Otro',
};

interface Props {
  loans: EmployeeLoan[];
}

export function LoanCollectionCalendar({ loans }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const activeLoans = useMemo(() => loans.filter(l => ['activo', 'aprobado'].includes(l.status)), [loans]);

  // Generate installment events for the current month
  const eventsByDay = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const map: Record<string, InstallmentEvent[]> = {};
    const today = new Date();

    activeLoans.forEach(loan => {
      const startDate = new Date(loan.start_date);
      const employeeName = loan.employees_v2
        ? `${loan.employees_v2.first_name} ${loan.employees_v2.last_name}`
        : 'Empleado';

      // For each installment, compute expected date (monthly from start)
      for (let i = 0; i < loan.installments; i++) {
        const dueDate = addMonths(startDate, i);
        // Normalize to same day of month
        const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), Math.min(startDate.getDate(), endOfMonth(dueDate).getDate()));

        if (dueDateNormalized >= start && dueDateNormalized <= end) {
          const key = format(dueDateNormalized, 'yyyy-MM-dd');
          if (!map[key]) map[key] = [];

          const isPaid = i < loan.paid_installments;
          const isOverdue = !isPaid && dueDateNormalized < today;

          map[key].push({
            loanId: loan.id,
            employeeName,
            amount: Number(loan.installment_amount),
            installmentNumber: i + 1,
            totalInstallments: loan.installments,
            loanType: LOAN_TYPE_LABELS[loan.loan_type] || loan.loan_type,
            isPaid,
            isOverdue,
          });
        }
      }
    });

    return map;
  }, [activeLoans, currentMonth]);

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart); // 0=Sun

  // Monthly totals
  const monthlyTotal = useMemo(() => {
    let expected = 0, collected = 0, overdue = 0;
    Object.values(eventsByDay).forEach(events => {
      events.forEach(e => {
        expected += e.amount;
        if (e.isPaid) collected += e.amount;
        if (e.isOverdue) overdue += e.amount;
      });
    });
    return { expected, collected, overdue };
  }, [eventsByDay]);

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-4">
      {/* Monthly summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Esperado</p>
            <p className="text-lg font-bold text-foreground">{formatCurrency(monthlyTotal.expected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">Cobrado</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(monthlyTotal.collected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-xs text-muted-foreground">En Mora</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(monthlyTotal.overdue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <CardTitle className="text-sm sm:text-base capitalize text-center">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {/* Day headers */}
            {dayNames.map(d => (
              <div key={d} className="bg-muted p-1.5 text-center text-[10px] font-medium text-muted-foreground sm:p-2 sm:text-xs">
                {d}
              </div>
            ))}

            {/* Empty cells for offset */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-card p-1 min-h-[58px] sm:min-h-[80px]" />
            ))}

            {/* Day cells */}
            <TooltipProvider delayDuration={200}>
              {days.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const events = eventsByDay[key] || [];
                const dayTotal = events.reduce((s, e) => s + e.amount, 0);
                const hasOverdue = events.some(e => e.isOverdue);
                const allPaid = events.length > 0 && events.every(e => e.isPaid);

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "bg-card p-1 min-h-[58px] cursor-default transition-colors sm:min-h-[80px]",
                          isToday(day) && "ring-2 ring-primary ring-inset",
                          events.length > 0 && "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                           "text-[11px] font-medium mb-1 sm:text-xs",
                          isToday(day) ? "text-primary font-bold" : "text-foreground"
                        )}>
                          {format(day, 'd')}
                        </div>

                        {events.length > 0 && (
                          <div className="space-y-0.5">
                            {events.length <= 2 ? events.map((e, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "hidden text-[10px] leading-tight px-1 py-0.5 rounded truncate sm:block",
                                  e.isPaid && "bg-primary/10 text-primary",
                                  e.isOverdue && "bg-destructive/10 text-destructive",
                                  !e.isPaid && !e.isOverdue && "bg-muted text-muted-foreground"
                                )}
                              >
                                {e.employeeName.split(' ')[0]}
                              </div>
                            )) : (
                              <div className={cn(
                                 "text-[10px] px-1 py-0.5 rounded text-center font-medium",
                                hasOverdue ? "bg-destructive/10 text-destructive" :
                                allPaid ? "bg-primary/10 text-primary" :
                                "bg-muted text-muted-foreground"
                              )}>
                                {events.length} cuotas
                              </div>
                            )}
                            <div className="truncate text-center text-[8px] font-mono text-muted-foreground sm:text-[9px]">
                              {formatCurrency(dayTotal)}
                            </div>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    {events.length > 0 && (
                      <TooltipContent side="bottom" className="max-w-[280px]">
                        <div className="space-y-1.5">
                          <p className="font-medium text-xs">{format(day, "d 'de' MMMM", { locale: es })}</p>
                          {events.map((e, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 text-xs">
                              <div>
                                <span className="font-medium">{e.employeeName}</span>
                                <span className="text-muted-foreground ml-1">({e.loanType})</span>
                                <span className="text-muted-foreground ml-1">
                                  #{e.installmentNumber}/{e.totalInstallments}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-mono">{formatCurrency(e.amount)}</span>
                                {e.isPaid && <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary text-primary">Pagado</Badge>}
                                {e.isOverdue && <Badge variant="destructive" className="text-[9px] px-1 py-0">Mora</Badge>}
                              </div>
                            </div>
                          ))}
                          <div className="pt-1 border-t text-xs font-medium flex justify-between">
                            <span>Total</span>
                            <span className="font-mono">{formatCurrency(dayTotal)}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
