import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { KPICard } from '@/components/dashboard/KPICard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
  Area, AreaChart, Legend
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Users, Percent, BarChart3
} from 'lucide-react';
import { format, addMonths, differenceInDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EmployeeLoan } from '@/hooks/useLoans';

const LOAN_TYPE_LABELS: Record<string, string> = {
  personal: 'Personal',
  vivienda: 'Vivienda',
  educacion: 'Educación',
  calamidad: 'Calamidad',
  libranza: 'Libranza',
  anticipo: 'Anticipo',
  otro: 'Otro',
};

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(45, 85%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(270, 55%, 55%)',
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

const formatShortCurrency = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

interface Props {
  loans: EmployeeLoan[];
}

export function LoanPortfolioDashboard({ loans }: Props) {
  const activeLoans = useMemo(() => loans.filter(l => l.status === 'activo'), [loans]);
  const today = new Date();

  // === KPIs ===
  const totalPortfolio = activeLoans.reduce((s, l) => s + Number(l.remaining_balance), 0);
  const totalOriginal = activeLoans.reduce((s, l) => s + Number(l.total_with_interest), 0);
  const totalCollected = activeLoans.reduce((s, l) => s + Number(l.paid_amount), 0);
  const collectionRate = totalOriginal > 0 ? (totalCollected / totalOriginal) * 100 : 0;

  // Delinquency: loans where paid_installments < expected installments based on elapsed time
  const delinquentLoans = useMemo(() => {
    return activeLoans.filter(l => {
      const startDate = new Date(l.start_date);
      const monthsElapsed = Math.max(0, Math.floor(differenceInDays(today, startDate) / 30));
      const expectedInstallments = Math.min(monthsElapsed, l.installments);
      return l.paid_installments < expectedInstallments;
    });
  }, [activeLoans]);

  const delinquentAmount = delinquentLoans.reduce((s, l) => {
    const startDate = new Date(l.start_date);
    const monthsElapsed = Math.max(0, Math.floor(differenceInDays(today, startDate) / 30));
    const expectedInstallments = Math.min(monthsElapsed, l.installments);
    const overdueInstallments = expectedInstallments - l.paid_installments;
    return s + (overdueInstallments * Number(l.installment_amount));
  }, 0);

  const delinquencyRate = activeLoans.length > 0 ? (delinquentLoans.length / activeLoans.length) * 100 : 0;

  // === Distribution by type (Pie) ===
  const distributionByType = useMemo(() => {
    const map: Record<string, number> = {};
    activeLoans.forEach(l => {
      const key = l.loan_type;
      map[key] = (map[key] || 0) + Number(l.remaining_balance);
    });
    return Object.entries(map).map(([type, value]) => ({
      name: LOAN_TYPE_LABELS[type] || type,
      value: Math.round(value),
    }));
  }, [activeLoans]);

  // === Distribution by type count (Bar) ===
  const countByType = useMemo(() => {
    const map: Record<string, { active: number; overdue: number }> = {};
    activeLoans.forEach(l => {
      const key = LOAN_TYPE_LABELS[l.loan_type] || l.loan_type;
      if (!map[key]) map[key] = { active: 0, overdue: 0 };
      map[key].active++;
      const startDate = new Date(l.start_date);
      const monthsElapsed = Math.max(0, Math.floor(differenceInDays(today, startDate) / 30));
      const expected = Math.min(monthsElapsed, l.installments);
      if (l.paid_installments < expected) map[key].overdue++;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v }));
  }, [activeLoans]);

  // === Collection projections (next 6 months) ===
  const projections = useMemo(() => {
    const months: { month: string; projected: number; cumulative: number }[] = [];
    let cumulative = 0;

    for (let i = 0; i < 6; i++) {
      const targetMonth = addMonths(today, i);
      const monthLabel = format(targetMonth, 'MMM yyyy', { locale: es });
      let monthTotal = 0;

      activeLoans.forEach(l => {
        const startDate = new Date(l.start_date);
        const monthsSinceStart = Math.floor(differenceInDays(targetMonth, startDate) / 30);
        if (monthsSinceStart >= 0 && monthsSinceStart < l.installments) {
          // Only count if not yet fully paid by projection time
          const projectedPaid = Math.min(l.paid_installments + i + 1, l.installments);
          if (projectedPaid > l.paid_installments + i) {
            monthTotal += Number(l.installment_amount);
          }
        }
      });

      cumulative += monthTotal;
      months.push({ month: monthLabel, projected: Math.round(monthTotal), cumulative: Math.round(cumulative) });
    }
    return months;
  }, [activeLoans]);

  // === Delinquency breakdown ===
  const delinquencyBreakdown = useMemo(() => {
    const buckets = { '1-30 días': 0, '31-60 días': 0, '61-90 días': 0, '90+ días': 0 };
    delinquentLoans.forEach(l => {
      const startDate = new Date(l.start_date);
      const monthsElapsed = Math.floor(differenceInDays(today, startDate) / 30);
      const expected = Math.min(monthsElapsed, l.installments);
      const overdueDays = (expected - l.paid_installments) * 30;

      if (overdueDays <= 30) buckets['1-30 días'] += Number(l.installment_amount) * (expected - l.paid_installments);
      else if (overdueDays <= 60) buckets['31-60 días'] += Number(l.installment_amount) * (expected - l.paid_installments);
      else if (overdueDays <= 90) buckets['61-90 días'] += Number(l.installment_amount) * (expected - l.paid_installments);
      else buckets['90+ días'] += Number(l.installment_amount) * (expected - l.paid_installments);
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [delinquentLoans]);

  const chartConfig = {
    projected: { label: 'Recaudo Proyectado', color: 'hsl(var(--primary))' },
    cumulative: { label: 'Acumulado', color: 'hsl(210, 70%, 55%)' },
    active: { label: 'Al día', color: 'hsl(150, 60%, 45%)' },
    overdue: { label: 'En mora', color: 'hsl(0, 70%, 55%)' },
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Cartera Total"
          value={formatCurrency(totalPortfolio)}
          subtitle={`${activeLoans.length} préstamos activos`}
          icon={<DollarSign className="w-6 h-6" />}
          variant="primary"
        />
        <KPICard
          title="Tasa de Recaudo"
          value={`${collectionRate.toFixed(1)}%`}
          subtitle={`${formatCurrency(totalCollected)} cobrado`}
          icon={<Percent className="w-6 h-6" />}
          variant="teal"
        />
        <KPICard
          title="Mora"
          value={`${delinquencyRate.toFixed(1)}%`}
          subtitle={`${delinquentLoans.length} préstamos en mora`}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant={delinquencyRate > 20 ? 'destructive' : delinquencyRate > 10 ? 'warning' : 'info'}
        />
        <KPICard
          title="Monto en Mora"
          value={formatCurrency(delinquentAmount)}
          subtitle="Cuotas vencidas no cobradas"
          icon={<Clock className="w-6 h-6" />}
          variant="rose"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution by type - Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {distributionByType.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <PieChart>
                  <Pie
                    data={distributionByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {distributionByType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No hay préstamos activos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Count by type with delinquency - Bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Préstamos por Tipo y Morosidad</CardTitle>
          </CardHeader>
          <CardContent>
            {countByType.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={countByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="active" name="Al día" fill="hsl(150, 60%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="En mora" fill="hsl(0, 70%, 55%)" radius={[4, 4, 0, 0]} />
                  <Legend />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No hay datos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Projections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Proyección de Recaudo (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {projections.some(p => p.projected > 0) ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={projections}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    name="Recaudo mensual"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    name="Acumulado"
                    stroke="hsl(210, 70%, 55%)"
                    fill="hsl(210, 70%, 55% / 0.1)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Legend />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Sin proyecciones disponibles
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delinquency breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Morosidad por Antigüedad</CardTitle>
          </CardHeader>
          <CardContent>
            {delinquencyBreakdown.some(d => d.value > 0) ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={delinquencyBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tickFormatter={formatShortCurrency} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                  <Bar dataKey="value" name="Monto vencido" radius={[0, 4, 4, 0]}>
                    {delinquencyBreakdown.map((_, i) => (
                      <Cell key={i} fill={
                        i === 0 ? 'hsl(45, 85%, 55%)' :
                        i === 1 ? 'hsl(25, 80%, 55%)' :
                        i === 2 ? 'hsl(10, 75%, 50%)' :
                        'hsl(0, 70%, 45%)'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                  <span>Sin morosidad — ¡Excelente!</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top delinquent loans table */}
      {delinquentLoans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Préstamos en Mora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 font-medium">Empleado</th>
                    <th className="text-left py-2 font-medium">Tipo</th>
                    <th className="text-right py-2 font-medium">Saldo</th>
                    <th className="text-center py-2 font-medium">Cuotas Pagadas</th>
                    <th className="text-center py-2 font-medium">Cuotas Vencidas</th>
                    <th className="text-right py-2 font-medium">Monto Vencido</th>
                  </tr>
                </thead>
                <tbody>
                  {delinquentLoans.slice(0, 10).map(l => {
                    const startDate = new Date(l.start_date);
                    const monthsElapsed = Math.floor(differenceInDays(today, startDate) / 30);
                    const expected = Math.min(monthsElapsed, l.installments);
                    const overdue = expected - l.paid_installments;
                    return (
                      <tr key={l.id} className="border-b border-border/50">
                        <td className="py-2">
                          {l.employees_v2?.first_name} {l.employees_v2?.last_name}
                        </td>
                        <td className="py-2">{LOAN_TYPE_LABELS[l.loan_type] || l.loan_type}</td>
                        <td className="py-2 text-right font-mono">{formatCurrency(Number(l.remaining_balance))}</td>
                        <td className="py-2 text-center">{l.paid_installments}/{l.installments}</td>
                        <td className="py-2 text-center font-medium text-destructive">{overdue}</td>
                        <td className="py-2 text-right font-mono text-destructive">
                          {formatCurrency(overdue * Number(l.installment_amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
