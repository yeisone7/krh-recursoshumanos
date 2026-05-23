import { useMemo, useState } from 'react';
import type React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarDays,
  FileText,
  HeartPulse,
  LineChart,
  PieChart as PieChartIcon,
  ShieldAlert,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  eachMonthOfInterval,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployees } from '@/hooks/useEmployees';
import { useIncapacities } from '@/hooks/useIncapacities';
import { cn } from '@/lib/utils';
import {
  getCurrentLegalStage,
  getLegalMilestones,
  getTotalChainDays,
  incapacityOriginLabels,
  recoveryStatusLabels,
  type IncapacityWithEmployee,
  type RecoveryStatus,
} from '@/types/incapacity';

const palette = {
  teal: '#10A5BC',
  aqua: '#43C6C6',
  orange: '#FF5A3D',
  amber: '#FFC145',
  navy: '#354052',
  violet: '#A23E97',
  green: '#4CB963',
  sky: '#63B3ED',
  ink: '#111827',
  grid: '#DCE5E7',
};

const chartColors = [palette.teal, palette.orange, palette.amber, palette.navy, palette.aqua, palette.violet, palette.green, palette.sky];

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

type PeriodFilter = '6m' | '12m' | 'ytd' | 'all';

type FlatIncapacity = IncapacityWithEmployee & {
  chainDays: number;
  rootId: string;
  employeeName: string;
  legalStageLabel: string;
  legalResponsible: string;
};

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = parseISO(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(value: number | null | undefined) {
  return currencyFormatter.format(value || 0).replace('COP', '$');
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function getRange(period: PeriodFilter) {
  const today = new Date();
  if (period === 'all') return null;
  if (period === 'ytd') return { start: new Date(today.getFullYear(), 0, 1), end: today, months: today.getMonth() + 1 };
  const months = period === '6m' ? 6 : 12;
  return { start: startOfMonth(subMonths(today, months - 1)), end: today, months };
}

function flattenIncapacities(items: IncapacityWithEmployee[]) {
  return items.flatMap((root) => {
    const chainDays = getTotalChainDays(root);
    const stage = getCurrentLegalStage(root.origin, chainDays);
    const employeeName = root.employee ? `${root.employee.first_name} ${root.employee.last_name}`.trim() : 'Empleado sin nombre';
    const rootFlat: FlatIncapacity = {
      ...root,
      rootId: root.id,
      chainDays,
      employeeName,
      legalStageLabel: stage.label,
      legalResponsible: stage.responsible,
    };

    const extensions = (root.extensions || []).map((extension) => ({
      ...extension,
      employee: root.employee,
      rootId: root.id,
      chainDays,
      employeeName,
      legalStageLabel: stage.label,
      legalResponsible: stage.responsible,
    })) as FlatIncapacity[];

    return [rootFlat, ...extensions];
  });
}

function groupBy<T>(items: T[], keyGetter: (item: T) => string, valueGetter: (item: T) => number = () => 1) {
  return Object.entries(items.reduce<Record<string, number>>((acc, item) => {
    const key = keyGetter(item) || 'Sin clasificar';
    acc[key] = (acc[key] || 0) + valueGetter(item);
    return acc;
  }, {}))
    .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => b.value - a.value);
}

function getRecoveryBase(item: FlatIncapacity) {
  return (item.eps_amount || 0) + (item.arl_amount || 0) + (item.afp_amount || 0);
}

function getRecoveredAmount(item: FlatIncapacity) {
  return item.recovery_status === 'pagado' ? item.recovered_amount || getRecoveryBase(item) : item.recovered_amount || 0;
}

function getMonthLabel(key: string) {
  return format(parseISO(`${key}-01T00:00:00`), 'MMM yy', { locale: es });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-black uppercase tracking-wide text-slate-800">{label}</p>}
      <div className="space-y-1">
        {payload.map((item: any) => (
          <div key={`${item.name}-${item.dataKey}`} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-500">{item.name}:</span>
            <span className="font-bold text-slate-900">
              {typeof item.value === 'number' ? integerFormatter.format(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiTile({
  title,
  value,
  detail,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
}) {
  const trendLabel = trend == null ? null : `${trend >= 0 ? '+' : ''}${numberFormatter.format(trend)}% vs periodo anterior`;
  const TrendIcon = trend == null ? Activity : trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
            <p className="mt-2 text-3xl font-black tracking-normal text-slate-950">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18`, color }}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        {trendLabel && (
          <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <TrendIcon className={cn('h-3.5 w-3.5', trend >= 0 ? 'text-orange-500' : 'text-emerald-600')} />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('overflow-hidden rounded-lg border border-slate-200 bg-[#FBFAF5] shadow-sm', className)}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3>
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="h-[260px] sm:h-[300px]">{children}</div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ color, title, value, detail }: { color: string; title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 h-2 w-16 rounded-full" style={{ backgroundColor: color }} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-black tracking-normal text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{detail}</p>
    </div>
  );
}

export default function AnaliticaIncapacidades() {
  const [period, setPeriod] = useState<PeriodFilter>('12m');
  const [origin, setOrigin] = useState('all');
  const [recoveryStatus, setRecoveryStatus] = useState('all');

  const { data: incapacityRoots = [], isLoading: loadingIncapacities } = useIncapacities();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();

  const analytics = useMemo(() => {
    const range = getRange(period);
    const today = new Date();
    const all = flattenIncapacities(incapacityRoots);
    const activeEmployees = employees.filter((employee) => employee.is_active && employee.status !== 'retired').length;

    const matchesStaticFilters = (item: FlatIncapacity) => (
      (origin === 'all' || item.origin === origin) &&
      (recoveryStatus === 'all' || item.recovery_status === recoveryStatus)
    );

    const matchesPeriod = (item: FlatIncapacity, targetRange: ReturnType<typeof getRange>) => {
      if (!targetRange) return true;
      const start = safeDate(item.start_date);
      if (!start) return false;
      return isWithinInterval(start, { start: targetRange.start, end: targetRange.end });
    };

    const filtered = all.filter((item) => matchesStaticFilters(item) && matchesPeriod(item, range));
    const previousRange = range
      ? { start: subMonths(range.start, range.months), end: subMonths(range.end, range.months), months: range.months }
      : null;
    const previous = previousRange ? all.filter((item) => matchesStaticFilters(item) && matchesPeriod(item, previousRange)) : [];

    const trend = (current: number, prev: number) => {
      if (!prev) return current > 0 ? 100 : 0;
      return Math.round(((current - prev) / prev) * 1000) / 10;
    };

    const totalDays = filtered.reduce((sum, item) => sum + (item.total_days || 0), 0);
    const previousDays = previous.reduce((sum, item) => sum + (item.total_days || 0), 0);
    const expectedRecovery = filtered.reduce((sum, item) => sum + getRecoveryBase(item), 0);
    const recovered = filtered.reduce((sum, item) => sum + getRecoveredAmount(item), 0);
    const pendingRecovery = Math.max(0, expectedRecovery - recovered);
    const affectedEmployees = new Set(filtered.map((item) => item.employee_id)).size;
    const activeItems = filtered.filter((item) => {
      const start = safeDate(item.start_date);
      const end = safeDate(item.end_date);
      return !!start && !!end && !isAfter(start, today) && !isBefore(end, today);
    });

    const longCases = incapacityRoots.filter((root) => {
      const start = safeDate(root.start_date);
      return matchesStaticFilters(flattenIncapacities([root])[0]) && (!range || (start && isWithinInterval(start, { start: range.start, end: range.end }))) && getTotalChainDays(root) > 30;
    });

    const legalRisk = incapacityRoots.filter((root) => {
      if (root.origin !== 'comun') return false;
      const rootFlat = flattenIncapacities([root])[0];
      if (!matchesStaticFilters(rootFlat)) return false;
      const start = safeDate(root.start_date);
      if (range && (!start || !isWithinInterval(start, { start: range.start, end: range.end }))) return false;
      const chainDays = getTotalChainDays(root);
      return getLegalMilestones(root.origin, chainDays).some((milestone) => milestone.isReached || milestone.daysRemaining <= 20);
    });

    const months = range
      ? eachMonthOfInterval({ start: startOfMonth(range.start), end: endOfMonth(range.end) })
      : eachMonthOfInterval({
          start: all.length ? startOfMonth(safeDate(all[all.length - 1].start_date) || subMonths(today, 11)) : subMonths(today, 11),
          end: today,
        });

    const monthly = months.map((month) => {
      const key = format(month, 'yyyy-MM');
      const monthItems = filtered.filter((item) => item.start_date?.startsWith(key));
      return {
        key,
        mes: getMonthLabel(key),
        Incapacidades: monthItems.length,
        Dias: monthItems.reduce((sum, item) => sum + item.total_days, 0),
        Comun: monthItems.filter((item) => item.origin === 'comun').reduce((sum, item) => sum + item.total_days, 0),
        Laboral: monthItems.filter((item) => item.origin === 'laboral').reduce((sum, item) => sum + item.total_days, 0),
        Estimado: Math.round(monthItems.reduce((sum, item) => sum + getRecoveryBase(item), 0)),
        Recuperado: Math.round(monthItems.reduce((sum, item) => sum + getRecoveredAmount(item), 0)),
      };
    });

    const originData = [
      { name: 'Comun', value: filtered.filter((item) => item.origin === 'comun').length },
      { name: 'Laboral', value: filtered.filter((item) => item.origin === 'laboral').length },
    ].filter((item) => item.value > 0);

    const recoveryData = groupBy(filtered, (item) => recoveryStatusLabels[item.recovery_status] || item.recovery_status);
    const legalData = groupBy(filtered, (item) => item.legalResponsible, (item) => item.total_days || 0);
    const diagnosisData = groupBy(filtered, (item) => item.cie10_code ? `${item.cie10_code} - ${item.diagnosis}` : item.diagnosis, (item) => item.total_days || 0).slice(0, 8);
    const employeeData = groupBy(filtered, (item) => item.employeeName, (item) => item.total_days || 0).slice(0, 8);
    const entityData = groupBy(filtered, (item) => item.origin === 'laboral' ? item.arl_name || 'ARL no registrada' : item.eps_name || 'EPS no registrada', (item) => item.total_days || 0).slice(0, 8);

    const scatterData = filtered
      .filter((item) => item.total_days > 0)
      .map((item) => ({
        x: item.total_days,
        y: Math.round((item.total_amount || 0) / 1000),
        z: Math.max(50, Math.min(420, item.chainDays * 8)),
        name: item.employeeName,
      }));

    const weekdayData = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, index) => {
      const isoIndex = index === 6 ? 0 : index + 1;
      const dayItems = filtered.filter((item) => safeDate(item.start_date)?.getDay() === isoIndex);
      return { day, value: dayItems.reduce((sum, item) => sum + item.total_days, 0), count: dayItems.length };
    });

    const recoveryRate = percent(recovered, expectedRecovery);
    const incidenceRate = percent(affectedEmployees, activeEmployees || employees.length);
    const topDiagnosis = diagnosisData[0];
    const topEntity = entityData[0];
    const strongestMonth = monthly.reduce((max, item) => item.Dias > max.Dias ? item : max, monthly[0] || { mes: 'N/A', Dias: 0 });

    return {
      total: filtered.length,
      totalDays,
      active: activeItems.length,
      avgDays: filtered.length ? Math.round((totalDays / filtered.length) * 10) / 10 : 0,
      expectedRecovery,
      recovered,
      pendingRecovery,
      recoveryRate,
      affectedEmployees,
      incidenceRate,
      activeEmployees,
      longCases: longCases.length,
      legalRisk: legalRisk.length,
      monthly,
      originData,
      recoveryData,
      legalData,
      diagnosisData,
      employeeData,
      entityData,
      scatterData,
      weekdayData,
      trends: {
        cases: trend(filtered.length, previous.length),
        days: trend(totalDays, previousDays),
        recovery: trend(recovered, previous.reduce((sum, item) => sum + getRecoveredAmount(item), 0)),
      },
      insights: {
        topDiagnosis,
        topEntity,
        strongestMonth,
      },
    };
  }, [employees, incapacityRoots, origin, period, recoveryStatus]);

  const isLoading = loadingIncapacities || loadingEmployees;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-lg" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-200 bg-[#F7F7F1] p-5 sm:p-6"
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-700">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">Salud laboral</span>
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">Analitica</span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Analitica de Incapacidades</h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600">
                KPIs, tendencias, recobros, concentracion diagnostica y riesgo legal para tomar decisiones sobre ausentismo medico.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4 xl:w-[720px]">
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">Ultimos 6 meses</SelectItem>
                <SelectItem value="12m">Ultimos 12 meses</SelectItem>
                <SelectItem value="ytd">Ano actual</SelectItem>
                <SelectItem value="all">Todo el historico</SelectItem>
              </SelectContent>
            </Select>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los origenes</SelectItem>
                <SelectItem value="comun">{incapacityOriginLabels.comun}</SelectItem>
                <SelectItem value="laboral">Origen laboral</SelectItem>
              </SelectContent>
            </Select>
            <Select value={recoveryStatus} onValueChange={setRecoveryStatus}>
              <SelectTrigger className="h-11 rounded-lg border-slate-200 bg-white text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los recobros</SelectItem>
                {Object.entries(recoveryStatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild className="h-11 rounded-lg bg-cyan-600 text-xs font-black uppercase tracking-widest hover:bg-cyan-700">
              <Link to="/incapacidades">
                Gestionar
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile title="Casos filtrados" value={integerFormatter.format(analytics.total)} detail={`${analytics.active} activos ahora`} icon={FileText} color={palette.teal} trend={analytics.trends.cases} />
        <KpiTile title="Dias de incapacidad" value={integerFormatter.format(analytics.totalDays)} detail={`${numberFormatter.format(analytics.avgDays)} dias promedio`} icon={CalendarDays} color={palette.orange} trend={analytics.trends.days} />
        <KpiTile title="Recobro pendiente" value={money(analytics.pendingRecovery)} detail={`${analytics.recoveryRate}% recuperado`} icon={Banknote} color={palette.amber} trend={analytics.trends.recovery} />
        <KpiTile title="Incidencia laboral" value={`${analytics.incidenceRate}%`} detail={`${analytics.affectedEmployees} de ${analytics.activeEmployees || analytics.affectedEmployees} empleados`} icon={Users} color={palette.navy} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <InsightCard
          color={palette.orange}
          title="Concentracion diagnostica"
          value={analytics.insights.topDiagnosis?.name || 'Sin diagnosticos'}
          detail={`${integerFormatter.format(analytics.insights.topDiagnosis?.value || 0)} dias acumulados en el periodo filtrado.`}
        />
        <InsightCard
          color={palette.teal}
          title="Entidad con mayor carga"
          value={analytics.insights.topEntity?.name || 'Sin entidad'}
          detail={`${integerFormatter.format(analytics.insights.topEntity?.value || 0)} dias asociados a recobro o gestion medica.`}
        />
        <InsightCard
          color={analytics.legalRisk > 0 ? palette.orange : palette.green}
          title="Seguimiento legal"
          value={`${analytics.legalRisk} casos sensibles`}
          detail={`${analytics.longCases} casos superan 30 dias y pueden requerir reintegro, concepto o seguimiento especial.`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Tendencia mensual" subtitle="Casos y dias acumulados" icon={LineChart}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.monthly} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} strokeDasharray="0" vertical />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: palette.navy }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="Dias" fill={palette.aqua} radius={[4, 4, 0, 0]} name="Dias" />
              <Line yAxisId="right" type="monotone" dataKey="Incapacidades" stroke={palette.violet} strokeWidth={2.5} dot={{ r: 4, fill: palette.violet }} name="Casos" />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Origen y severidad" subtitle="Dias por origen medico" icon={Activity}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.monthly} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} vertical />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Area type="monotone" dataKey="Comun" stackId="1" stroke={palette.teal} fill={palette.teal} name="Comun" />
              <Area type="monotone" dataKey="Laboral" stackId="1" stroke={palette.orange} fill={palette.orange} name="Laboral" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Mapa de recobros" subtitle="Estimado vs recuperado" icon={Banknote} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.monthly} margin={{ top: 8, right: 12, left: -8, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} vertical />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} tickFormatter={(value) => `$${Math.round(Number(value) / 1000000)}M`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="Estimado" fill={palette.amber} radius={[4, 4, 0, 0]} name="Estimado" />
              <Bar dataKey="Recuperado" fill={palette.navy} radius={[4, 4, 0, 0]} name="Recuperado" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Eficiencia de recuperacion" subtitle="Porcentaje recuperado" icon={Target}>
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="58%"
              outerRadius="95%"
              data={[{ name: 'Recuperado', value: analytics.recoveryRate, fill: palette.teal }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#E9EEF0' }} />
              <Tooltip content={<CustomTooltip />} />
              <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-950 text-4xl font-black">
                {analytics.recoveryRate}%
              </text>
              <text x="50%" y="61%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-xs font-bold">
                recuperado
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Distribucion por origen" subtitle="Participacion de casos" icon={PieChartIcon}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.originData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={92} paddingAngle={3}>
                {analytics.originData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Estado de recobro" subtitle="Flujo administrativo" icon={BarChart3}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.recoveryData} layout="vertical" margin={{ top: 8, right: 12, left: 18, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: palette.navy, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Casos">
                {analytics.recoveryData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Responsable legal" subtitle="Dias por pagador" icon={ShieldAlert}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.legalData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={98} labelLine={false} label={({ percent: value }) => `${Math.round(value * 100)}%`}>
                {analytics.legalData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel title="Diagnosticos mas costosos" subtitle="Top por dias acumulados" icon={Stethoscope}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.diagnosisData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} vertical />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} interval={0} angle={-18} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} name="Dias">
                {analytics.diagnosisData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Empleados recurrentes" subtitle="Dias acumulados por colaborador" icon={Users}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.employeeData} layout="vertical" margin={{ top: 8, right: 12, left: 30, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 10, fill: palette.navy, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={palette.orange} radius={[0, 6, 6, 0]} name="Dias" />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Dispersion costo/duracion" subtitle="Dias vs valor total en miles" icon={Target} className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
              <CartesianGrid stroke={palette.grid} />
              <XAxis type="number" dataKey="x" name="Dias" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <YAxis type="number" dataKey="y" name="Valor" tick={{ fontSize: 11, fill: palette.navy }} axisLine={{ stroke: palette.ink }} tickLine={false} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter name="Incapacidades" data={analytics.scatterData} fill={palette.teal} />
            </ScatterChart>
          </ResponsiveContainer>
        </ChartPanel>

        <Card className="rounded-lg border border-slate-200 bg-[#FBFAF5] shadow-sm">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-700" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Pulso semanal</h3>
                <p className="text-xs font-medium text-slate-500">Dias iniciados por dia</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {analytics.weekdayData.map((item, index) => {
                const max = Math.max(...analytics.weekdayData.map((day) => day.value), 1);
                const intensity = Math.max(12, Math.round((item.value / max) * 100));
                return (
                  <div key={item.day} className="space-y-2">
                    <div
                      className="flex aspect-square items-center justify-center rounded-lg border border-slate-200 text-xs font-black text-slate-900"
                      style={{ backgroundColor: `${chartColors[index % chartColors.length]}${Math.round(intensity * 2.2).toString(16).padStart(2, '0')}` }}
                    >
                      {integerFormatter.format(item.value)}
                    </div>
                    <p className="text-center text-[10px] font-black uppercase tracking-wide text-slate-500">{item.day}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mes mas exigente</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{analytics.insights.strongestMonth?.mes || 'N/A'}</p>
              <p className="text-xs font-semibold text-slate-600">{integerFormatter.format(analytics.insights.strongestMonth?.Dias || 0)} dias acumulados.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.total === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
          <h3 className="mt-3 text-lg font-black text-slate-950">Sin datos para los filtros seleccionados</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">Ajusta el periodo, origen o estado de recobro para visualizar la analitica.</p>
        </div>
      )}
    </div>
  );
}
