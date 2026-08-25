import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Accessibility,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Globe2,
  HeartHandshake,
  Home,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  Users,
  UsersRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveDiversityDataset } from '@/hooks/useActiveDiversityAnalytics';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import {
  buildActiveDiversityAnalytics,
  type ActiveDiversityGoals,
  type DiversityMetric,
  type DistributionItem,
} from '@/lib/activeDiversityAnalytics';
import { cn } from '@/lib/utils';

const COLORS = ['#0F766E', '#2563EB', '#F59E0B', '#8B5CF6', '#EC4899', '#0891B2', '#64748B'];
const DEFAULT_GOALS: ActiveDiversityGoals = {
  min_female_pct: 40,
  min_disability_pct: 2,
  min_ethnic_pct: 5,
  min_first_job_pct: 10,
  min_head_household_pct: 5,
};
const integer = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Skeleton className="h-52 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-2xl" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">{title}</h2>
      <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: typeof Users;
  tone: string;
}) {
  return (
    <Card className="group overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg', tone)}>
            <Icon className="h-5 w-5" />
          </div>
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[9px] font-black uppercase tracking-wider text-slate-500">Activo</Badge>
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

function GoalCard({ metric }: { metric: DiversityMetric }) {
  const progress = metric.goal > 0 ? Math.min((metric.percentage / metric.goal) * 100, 100) : 100;
  return (
    <div className={cn(
      'rounded-2xl border p-5',
      metric.meetsGoal ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60',
    )}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-slate-800">{metric.label}</p>
        {metric.meetsGoal
          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          : <AlertTriangle className="h-4 w-4 text-amber-600" />}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-2xl font-black text-slate-950">{decimal.format(metric.percentage)}%</p>
        <p className={cn('text-xs font-black', metric.gap >= 0 ? 'text-emerald-700' : 'text-amber-700')}>
          {metric.gap >= 0 ? '+' : ''}{decimal.format(metric.gap)} pp
        </p>
      </div>
      <Progress value={progress} className="mt-3 h-2 bg-white" />
      <p className="mt-2 text-[10px] font-bold text-slate-500">Meta {decimal.format(metric.goal)}% · {integer.format(metric.value)} personas</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children, className }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('rounded-3xl border-slate-200 bg-white shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-black text-slate-950">{title}</CardTitle>
        <p className="text-xs font-medium text-slate-500">{subtitle}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function DonutChart({ data, centerLabel }: { data: DistributionItem[]; centerLabel: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="relative h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={105} paddingAngle={3} stroke="#fff" strokeWidth={3}>
            {data.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${integer.format(value)} personas`, name]} />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-3xl font-black text-slate-950">{integer.format(total)}</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{centerLabel}</p>
      </div>
    </div>
  );
}

function HorizontalBarChart({ data, color = '#0F766E' }: { data: DistributionItem[]; color?: string }) {
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 26, left: 28, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
          <YAxis type="category" dataKey="name" width={112} tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} />
          <Tooltip formatter={(value: number) => [`${integer.format(value)} personas`, 'Total']} />
          <Bar dataKey="value" fill={color} radius={[0, 8, 8, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AnaliticaDiversidad() {
  const [centerFilter, setCenterFilter] = useState('all');
  const { data: employees = [], isLoading, isFetching, refetch } = useActiveDiversityDataset();
  const { data: systemConfig } = useSystemConfig();
  const configuredGoals = systemConfig?.diversity_goals;
  const goals = useMemo<ActiveDiversityGoals>(() => ({
    ...DEFAULT_GOALS,
    ...(configuredGoals || {}),
  }), [configuredGoals]);

  const centers = useMemo(() => Array.from(new Map(
    employees.filter((employee) => employee.centerId).map((employee) => [employee.centerId!, employee.centerName]),
  ).entries()).sort((a, b) => a[1].localeCompare(b[1], 'es')), [employees]);

  const filteredEmployees = useMemo(() => centerFilter === 'all'
    ? employees
    : employees.filter((employee) => employee.centerId === centerFilter), [centerFilter, employees]);
  const analytics = useMemo(() => buildActiveDiversityAnalytics(filteredEmployees, goals), [filteredEmployees, goals]);
  const overallAnalytics = useMemo(() => buildActiveDiversityAnalytics(employees, goals), [employees, goals]);
  const topCenter = overallAnalytics.centers.filter((center) => center.total >= 5).sort((a, b) => b.inclusionIndex - a.inclusionIndex)[0];
  const biggestGap = [...analytics.metrics].sort((a, b) => a.gap - b.gap)[0];
  const centerComparisonData = overallAnalytics.centers.slice(0, 12).map((center) => ({
    ...center,
    shortName: center.name.length > 22 ? `${center.name.slice(0, 20)}…` : center.name,
  }));
  const radarData = analytics.metrics.map((metric) => ({
    metric: metric.label.replace('Personas con ', '').replace('Pertenencia ', ''),
    actual: metric.percentage,
    meta: metric.goal,
  }));

  if (isLoading) return <AnalyticsSkeleton />;

  return (
    <div className="min-h-full bg-slate-50/70 p-4 md:p-6">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-teal-50 px-6 py-7 text-slate-950 md:px-8">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-teal-300/25 blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-blue-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-sky-200 bg-sky-100 text-[9px] font-black uppercase tracking-[0.2em] text-sky-800 hover:bg-sky-100">Analítica estratégica</Badge>
                <Badge className="border-emerald-200 bg-emerald-100 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700 hover:bg-emerald-100">Datos vigentes</Badge>
              </div>
              <div className="mt-5 flex items-start gap-4">
                <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 shadow-lg shadow-teal-950/40 sm:flex">
                  <HeartHandshake className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-teal-700">Personal activo</p>
                  <h1 className="mt-1 text-3xl font-black tracking-tight !text-slate-950 sm:text-4xl">Diversidad e Inclusión</h1>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600">
                    Representación demográfica, condiciones de inclusión, brechas frente a metas y desempeño comparativo por centro de operación.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger className="h-11 min-w-[250px] border-slate-200 bg-white font-bold text-slate-800 shadow-sm [&>span]:text-slate-800 [&>svg]:text-slate-500">
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="h-11 border-sky-200 bg-white font-black text-sky-700 shadow-sm hover:bg-sky-50 hover:text-sky-800">
                <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} /> Actualizar
              </Button>
            </div>
          </div>

          <div className="relative mt-7 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
            <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Universo analizado</p><p className="mt-1 text-lg font-black text-slate-950">{integer.format(analytics.total)} personas activas</p></div>
            <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cobertura demográfica</p><p className="mt-1 text-lg font-black text-slate-950">{decimal.format(analytics.demographicCoverage)}%</p></div>
            <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Metas alcanzadas</p><p className="mt-1 text-lg font-black text-slate-950">{analytics.goalsMet} de {analytics.metrics.length}</p></div>
          </div>
        </section>

        <section>
          <SectionHeading eyebrow="Indicadores clave" title="Radiografía de representación" description="Cada indicador utiliza como denominador el personal activo del filtro seleccionado." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard title="Personal activo" value={integer.format(analytics.total)} detail={centerFilter === 'all' ? `${centers.length} centros con personal` : 'Centro seleccionado'} icon={Users} tone="bg-sky-600" />
            <KpiCard title="Mujeres" value={`${decimal.format(analytics.metrics[0]?.percentage || 0)}%`} detail={`${integer.format(analytics.female)} personas`} icon={UsersRound} tone="bg-pink-600" />
            <KpiCard title="Discapacidad" value={`${decimal.format(analytics.metrics[1]?.percentage || 0)}%`} detail={`${integer.format(analytics.disability)} personas`} icon={Accessibility} tone="bg-teal-600" />
            <KpiCard title="Pertenencia étnica" value={`${decimal.format(analytics.metrics[2]?.percentage || 0)}%`} detail={`${integer.format(analytics.ethnic)} personas`} icon={Globe2} tone="bg-blue-600" />
            <KpiCard title="Primer empleo" value={`${decimal.format(analytics.metrics[3]?.percentage || 0)}%`} detail={`${integer.format(analytics.firstJob)} personas`} icon={UserRoundCheck} tone="bg-violet-600" />
            <KpiCard title="Cabeza de familia" value={`${decimal.format(analytics.metrics[4]?.percentage || 0)}%`} detail={`${integer.format(analytics.headHousehold)} personas`} icon={Home} tone="bg-amber-500" />
          </div>
        </section>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading eyebrow="Gobierno de datos" title="Metas de diversidad vs. resultado" description="Brecha expresada en puntos porcentuales sobre el personal activo analizado." />
            <Badge variant="outline" className={cn(
              'w-fit px-3 py-1.5 text-[9px] font-black uppercase tracking-widest',
              configuredGoals?.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
            )}>
              {configuredGoals?.enabled ? 'Metas corporativas activas' : 'Referencia predeterminada'}
            </Badge>
          </div>
          <Card className="mt-4 rounded-3xl border-slate-200 bg-white shadow-sm">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
              {analytics.metrics.map((metric) => <GoalCard key={metric.key} metric={metric} />)}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 xl:grid-cols-12">
          <ChartCard title="Sexo biológico" subtitle="Composición completa, incluidos registros sin dato" className="xl:col-span-4">
            <DonutChart data={analytics.genderDistribution} centerLabel="personas" />
          </ChartCard>
          <ChartCard title="Distribución por edad" subtitle="Rangos generacionales del personal activo" className="xl:col-span-4">
            <HorizontalBarChart data={analytics.ageDistribution} color="#2563EB" />
          </ChartCard>
          <ChartCard title="Perfil frente a metas" subtitle="Resultado actual comparado con el objetivo configurado" className="xl:col-span-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="68%">
                  <PolarGrid stroke="#CBD5E1" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#475569', fontWeight: 700 }} />
                  <Radar name="Actual" dataKey="actual" stroke="#0F766E" fill="#14B8A6" fillOpacity={0.35} strokeWidth={2} />
                  <Radar name="Meta" dataKey="meta" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.08} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(value: number) => `${decimal.format(value)}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <ChartCard title="Pertenencia étnica" subtitle="Distribución declarada y calidad de registro">
            <HorizontalBarChart data={analytics.ethnicDistribution.slice(0, 8)} color="#2563EB" />
          </ChartCard>
          <ChartCard title="Condición de discapacidad" subtitle="Tipos declarados y registros sin condición">
            <HorizontalBarChart data={analytics.disabilityDistribution.slice(0, 8)} color="#0F766E" />
          </ChartCard>
        </section>

        <section>
          <SectionHeading eyebrow="Territorio" title="Comparación por centro de operación" description="Representación porcentual calculada con el personal activo de cada centro." />
          <div className="mt-4 grid gap-5 xl:grid-cols-12">
            <ChartCard title="Índice compuesto de representación" subtitle="Promedio simple de cinco indicadores; útil para comparación interna, no como certificación" className="xl:col-span-7">
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={centerComparisonData} margin={{ top: 12, right: 12, left: -10, bottom: 72 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="shortName" angle={-38} textAnchor="end" interval={0} tick={{ fontSize: 9, fill: '#475569', fontWeight: 700 }} />
                    <YAxis unit="%" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip formatter={(value: number) => [`${decimal.format(value)}%`, 'Índice']} labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''} />
                    <Bar dataKey="inclusionIndex" fill="#0F766E" radius={[8, 8, 0, 0]} maxBarSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <Card className="rounded-3xl border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-teal-50 text-slate-950 shadow-lg shadow-slate-200/70 xl:col-span-5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-700">Lectura ejecutiva</p>
                    <h3 className="mt-1 text-xl font-black">Hallazgos del corte actual</h3>
                  </div>
                  <Sparkles className="h-6 w-6 text-amber-500" />
                </div>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Target className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Brecha prioritaria</p><p className="mt-1 text-sm font-bold text-slate-900">{biggestGap?.label || 'Sin datos'}: {biggestGap ? `${decimal.format(biggestGap.gap)} pp frente a la meta` : 'sin población analizada'}.</p></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
                      <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Centro referente</p><p className="mt-1 text-sm font-bold text-slate-900">{topCenter ? `${topCenter.name} registra un índice compuesto de ${decimal.format(topCenter.inclusionIndex)}%.` : 'Se requieren centros con al menos cinco personas.'}</p></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                      <div><p className="text-xs font-black uppercase tracking-wider text-slate-500">Calidad del dato</p><p className="mt-1 text-sm font-bold text-slate-900">{decimal.format(analytics.demographicCoverage)}% de cobertura en sexo, edad y centro de operación.</p></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-5 overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base font-black"><BarChart3 className="h-5 w-5 text-primary" /> Matriz comparativa por centro</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <tr><th className="px-5 py-4">Centro</th><th className="px-4 py-4 text-right">Activos</th><th className="px-4 py-4 text-right">Mujeres</th><th className="px-4 py-4 text-right">Discapacidad</th><th className="px-4 py-4 text-right">Grupo étnico</th><th className="px-4 py-4 text-right">Primer empleo</th><th className="px-4 py-4 text-right">Cabeza familia</th><th className="px-5 py-4 text-right">Índice</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overallAnalytics.centers.map((center) => (
                    <tr key={center.id} className="text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4 font-black text-slate-900">{center.name}</td><td className="px-4 py-4 text-right">{integer.format(center.total)}</td><td className="px-4 py-4 text-right">{decimal.format(center.femalePct)}%</td><td className="px-4 py-4 text-right">{decimal.format(center.disabilityPct)}%</td><td className="px-4 py-4 text-right">{decimal.format(center.ethnicPct)}%</td><td className="px-4 py-4 text-right">{decimal.format(center.firstJobPct)}%</td><td className="px-4 py-4 text-right">{decimal.format(center.headHouseholdPct)}%</td><td className="px-5 py-4 text-right"><Badge className="bg-teal-600 font-black text-white hover:bg-teal-600">{decimal.format(center.inclusionIndex)}%</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <section>
          <SectionHeading eyebrow="Infografía" title="Condiciones especiales de inclusión" description="Número y proporción de personas activas que registran cada condición." />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.specialConditions.map((condition, index) => (
              <Card key={condition.name} className="overflow-hidden rounded-3xl border-slate-200 bg-white shadow-sm">
                <CardContent className="relative p-6">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-full opacity-10" style={{ backgroundColor: COLORS[index] }} />
                  <div className="relative flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-[10px] border-slate-100" style={{ borderTopColor: COLORS[index], borderRightColor: COLORS[index] }}>
                      <span className="text-lg font-black text-slate-950">{decimal.format(condition.percentage)}%</span>
                    </div>
                    <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{condition.name}</p><p className="mt-1 text-3xl font-black text-slate-950">{integer.format(condition.value)}</p><p className="text-xs font-semibold text-slate-500">de {integer.format(analytics.total)} personas</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {analytics.total === 0 && (
          <Card className="rounded-3xl border-amber-200 bg-amber-50">
            <CardContent className="flex items-center gap-3 p-6 text-amber-900"><AlertTriangle className="h-5 w-5" /><p className="text-sm font-bold">No hay personal activo para el centro seleccionado.</p></CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
