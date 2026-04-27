import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
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
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock,
  Gauge,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useCandidates } from '@/hooks/useCandidates';
import { useRequisitions } from '@/hooks/useRequisitions';
import { useVacancies } from '@/hooks/useVacancies';
import { cn } from '@/lib/utils';

const chartColors = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--tertiary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent-foreground))',
];

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStatus(value: string | null | undefined) {
  if (!value) return 'Sin estado';
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function bucketDays(days: number) {
  if (days <= 7) return '0-7 días';
  if (days <= 15) return '8-15 días';
  if (days <= 30) return '16-30 días';
  return '+30 días';
}

function groupCount<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = getKey(item) || 'Sin clasificar';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name: formatStatus(name), value }))
    .sort((a, b) => b.value - a.value);
}

function candidateReachedStage(candidate: any, stage: 'aplicado' | 'evaluado' | 'entrevista' | 'oferta' | 'contratado') {
  const status = String(candidate.status || '').toLowerCase();
  const currentStep = String(candidate.current_step || '').toLowerCase();
  const steps = Array.isArray(candidate.selection_steps) ? candidate.selection_steps : [];
  const hasStep = (terms: string[]) => steps.some((step: any) => {
    const type = String(step.step_type || '').toLowerCase();
    const stepStatus = String(step.status || '').toLowerCase();
    const result = String(step.result || '').toLowerCase();
    return terms.some((term) => type.includes(term) || stepStatus.includes(term) || result.includes(term));
  });

  if (stage === 'aplicado') return true;
  if (stage === 'contratado') return status === 'hired';
  if (stage === 'oferta') return ['selected', 'hired'].includes(status) || currentStep.includes('offer') || currentStep.includes('oferta') || hasStep(['offer', 'oferta']);
  if (stage === 'entrevista') return ['selected', 'hired'].includes(status) || currentStep.includes('interview') || currentStep.includes('entrevista') || hasStep(['interview', 'entrevista']);
  return Boolean(candidate.final_score || hasStep(['evaluation', 'evaluacion', 'evaluación', 'test', 'prueba', 'assessment', 'score']) || ['selected', 'hired'].includes(status));
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[280px] sm:h-[320px]">{children}</CardContent>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  detail,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-normal text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
          <div className="rounded-md bg-primary-light p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-success" />}
            {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
            {trend === 'neutral' && <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
            <span>Indicador calculado con datos actuales</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnaliticaSeleccion() {
  const { data: vacancies = [], isLoading: loadingVacancies } = useVacancies();
  const { data: candidates = [], isLoading: loadingCandidates } = useCandidates();
  const { data: requisitions = [], isLoading: loadingRequisitions } = useRequisitions();

  const isLoading = loadingVacancies || loadingCandidates || loadingRequisitions;

  const analytics = useMemo(() => {
    const today = new Date();
    const monthStarts = Array.from({ length: 6 }, (_, index) => startOfMonth(subMonths(today, 5 - index)));
    const monthKey = (date: Date) => format(date, 'yyyy-MM');
    const monthLabel = (date: Date) => format(date, 'MMM yy', { locale: es });

    const trend = monthStarts.map((month) => {
      const key = monthKey(month);
      const reqCount = requisitions.filter((item) => {
        const date = asDate(item.fecha_requisicion || item.created_at);
        return date && monthKey(date) === key;
      }).length;
      const vacancyCount = vacancies.filter((item: any) => {
        const date = asDate(item.open_date || item.created_at);
        return date && monthKey(date) === key;
      }).length;
      const candidateCount = candidates.filter((item: any) => {
        const date = asDate(item.application_date || item.created_at);
        return date && monthKey(date) === key;
      }).length;
      const hiredCount = candidates.filter((item: any) => {
        const date = asDate(item.updated_at || item.application_date);
        return item.status === 'hired' && date && monthKey(date) === key;
      }).length;

      return {
        month: monthLabel(month),
        requisiciones: reqCount,
        vacantes: vacancyCount,
        candidatos: candidateCount,
        contratados: hiredCount,
      };
    });

    const activeVacancies = vacancies.filter((item: any) => ['open', 'in_process'].includes(item.status));
    const closedVacancies = vacancies.filter((item: any) => item.actual_close_date && item.open_date);
    const hiredCandidates = candidates.filter((item: any) => item.status === 'hired');
    const selectedCandidates = candidates.filter((item: any) => item.status === 'selected');
    const rejectedCandidates = candidates.filter((item: any) => ['not_selected', 'withdrawn'].includes(item.status));
    const inProcessCandidates = candidates.filter((item: any) => !['hired', 'not_selected', 'withdrawn'].includes(item.status));

    const totalPositions = vacancies.reduce((sum: number, item: any) => sum + (item.positions_count || 0), 0);
    const requestedPositions = requisitions.reduce((sum, item) => sum + (item.cantidad_vacantes_requeridas || 0), 0);
    const avgCandidatesPerVacancy = vacancies.length ? candidates.length / vacancies.length : 0;
    const hireRate = percent(hiredCandidates.length, candidates.length);
    const selectionRate = percent(selectedCandidates.length + hiredCandidates.length, candidates.length);
    const rejectionRate = percent(rejectedCandidates.length, candidates.length);

    const avgTimeToFill = closedVacancies.length
      ? Math.round(
          closedVacancies.reduce((sum: number, item: any) => {
            const openDate = asDate(item.open_date);
            const closeDate = asDate(item.actual_close_date);
            return openDate && closeDate ? sum + Math.max(0, differenceInCalendarDays(closeDate, openDate)) : sum;
          }, 0) / closedVacancies.length
        )
      : 0;

    const avgOpenDays = activeVacancies.length
      ? Math.round(
          activeVacancies.reduce((sum: number, item: any) => {
            const openDate = asDate(item.open_date || item.created_at);
            return openDate ? sum + Math.max(0, differenceInCalendarDays(today, openDate)) : sum;
          }, 0) / activeVacancies.length
        )
      : 0;

    const statusCandidates = groupCount(candidates as any[], (item) => item.status);
    const statusVacancies = groupCount(vacancies as any[], (item) => item.status);
    const statusRequisitions = groupCount(requisitions, (item) => item.estado_requisicion);
    const sources = groupCount(candidates as any[], (item) => item.source || 'Sin fuente').slice(0, 7);
    const reasons = groupCount(vacancies as any[], (item) => item.vacancy_reason).slice(0, 7);

    const centerPipeline = Object.values(
      vacancies.reduce<Record<string, { name: string; vacantes: number; candidatos: number; contratados: number }>>((acc: any, vacancy: any) => {
        const name = vacancy.operation_centers?.name || 'Sin centro';
        if (!acc[name]) acc[name] = { name, vacantes: 0, candidatos: 0, contratados: 0 };
        acc[name].vacantes += vacancy.positions_count || 1;
        const vacancyCandidates = candidates.filter((candidate: any) => candidate.vacancy_id === vacancy.id);
        acc[name].candidatos += vacancyCandidates.length;
        acc[name].contratados += vacancyCandidates.filter((candidate: any) => candidate.status === 'hired').length;
        return acc;
      }, {})
    ).sort((a, b) => b.candidatos - a.candidatos).slice(0, 8);

    const aging = ['0-7 días', '8-15 días', '16-30 días', '+30 días'].map((name) => ({ name, value: 0 }));
    activeVacancies.forEach((item: any) => {
      const openDate = asDate(item.open_date || item.created_at);
      if (!openDate) return;
      const bucket = bucketDays(Math.max(0, differenceInCalendarDays(today, openDate)));
      const target = aging.find((entry) => entry.name === bucket);
      if (target) target.value += 1;
    });

    const allSteps = candidates.flatMap((candidate: any) => candidate.selection_steps || []);
    const stepsByType = Object.values(
      allSteps.reduce<Record<string, { step: string; total: number; completados: number; rechazados: number; promedio: number; scores: number[] }>>((acc: any, step: any) => {
        const label = formatStatus(step.step_type);
        if (!acc[label]) acc[label] = { step: label, total: 0, completados: 0, rechazados: 0, promedio: 0, scores: [] };
        acc[label].total += 1;
        if (['completed', 'approved', 'aprobado', 'passed'].includes(step.status) || step.completed_date) acc[label].completados += 1;
        if (['rejected', 'failed', 'rechazado', 'no_apto'].includes(step.status) || ['rejected', 'failed', 'no_apto'].includes(step.result)) acc[label].rechazados += 1;
        if (typeof step.score === 'number') acc[label].scores.push(step.score);
        return acc;
      }, {})
    ).map((entry) => ({
      ...entry,
      promedio: entry.scores.length ? Math.round(entry.scores.reduce((sum, score) => sum + score, 0) / entry.scores.length) : 0,
      avance: percent(entry.completados, entry.total),
    })).sort((a, b) => b.total - a.total).slice(0, 8);

    const salaryByArea = Object.values(
      vacancies.reduce<Record<string, { area: string; promedio: number; vacantes: number; values: number[] }>>((acc: any, vacancy: any) => {
        const area = vacancy.department_area || 'Sin área';
        const min = Number(vacancy.salary_range_min || 0);
        const max = Number(vacancy.salary_range_max || 0);
        const value = min && max ? (min + max) / 2 : min || max;
        if (!value) return acc;
        if (!acc[area]) acc[area] = { area, promedio: 0, vacantes: 0, values: [] };
        acc[area].vacantes += vacancy.positions_count || 1;
        acc[area].values.push(value);
        return acc;
      }, {})
    ).map((entry) => ({
      ...entry,
      promedio: Math.round(entry.values.reduce((sum, value) => sum + value, 0) / entry.values.length),
    })).sort((a, b) => b.promedio - a.promedio).slice(0, 8);

    const funnel = [
      { name: 'Requisiciones', value: requisitions.length },
      { name: 'Vacantes', value: vacancies.length },
      { name: 'Candidatos', value: candidates.length },
      { name: 'En proceso', value: inProcessCandidates.length },
      { name: 'Seleccionados', value: selectedCandidates.length + hiredCandidates.length },
      { name: 'Contratados', value: hiredCandidates.length },
    ];

    const recruitmentStages = [
      { key: 'aplicado', name: 'Aplicado' },
      { key: 'evaluado', name: 'Evaluado' },
      { key: 'entrevista', name: 'Entrevista' },
      { key: 'oferta', name: 'Oferta' },
      { key: 'contratado', name: 'Contratado' },
    ] as const;
    const recruitmentFunnel = recruitmentStages.map((stage, index) => {
      const value = candidates.filter((candidate: any) => candidateReachedStage(candidate, stage.key)).length;
      const previous = index === 0 ? value : candidates.filter((candidate: any) => candidateReachedStage(candidate, recruitmentStages[index - 1].key)).length;
      return {
        name: stage.name,
        value,
        totalPercent: percent(value, candidates.length),
        stepPercent: index === 0 ? 100 : percent(value, previous),
      };
    });
    const sourceConversion = Object.values(
      candidates.reduce<Record<string, any>>((acc: any, candidate: any) => {
        const source = formatStatus(candidate.source || 'Sin fuente');
        if (!acc[source]) {
          acc[source] = { source, aplicado: 0, evaluado: 0, entrevista: 0, oferta: 0, contratado: 0 };
        }
        recruitmentStages.forEach((stage) => {
          if (candidateReachedStage(candidate, stage.key)) acc[source][stage.key] += 1;
        });
        return acc;
      }, {})
    )
      .map((entry: any) => ({
        ...entry,
        evaluadoPct: percent(entry.evaluado, entry.aplicado),
        entrevistaPct: percent(entry.entrevista, entry.aplicado),
        ofertaPct: percent(entry.oferta, entry.aplicado),
        contratadoPct: percent(entry.contratado, entry.aplicado),
      }))
      .sort((a: any, b: any) => b.aplicado - a.aplicado)
      .slice(0, 8);

    const radar = [
      { metric: 'Cobertura', value: percent(totalPositions, Math.max(requestedPositions, totalPositions)) },
      { metric: 'Conversión', value: hireRate },
      { metric: 'Selección', value: selectionRate },
      { metric: 'Velocidad', value: avgOpenDays ? Math.max(0, 100 - Math.min(avgOpenDays * 2, 100)) : 100 },
      { metric: 'Pipeline', value: Math.min(100, Math.round(avgCandidatesPerVacancy * 20)) },
    ];

    const insights = [
      {
        title: 'Salud del pipeline',
        value: `${numberFormatter.format(avgCandidatesPerVacancy)} candidatos/vacante`,
        tone: avgCandidatesPerVacancy >= 3 ? 'success' : avgCandidatesPerVacancy >= 1 ? 'warning' : 'destructive',
      },
      {
        title: 'Conversión a contratación',
        value: `${hireRate}%`,
        tone: hireRate >= 20 ? 'success' : hireRate >= 10 ? 'warning' : 'destructive',
      },
      {
        title: 'Vacantes envejecidas',
        value: `${aging.find((item) => item.name === '+30 días')?.value || 0}`,
        tone: (aging.find((item) => item.name === '+30 días')?.value || 0) === 0 ? 'success' : 'warning',
      },
    ];

    return {
      trend,
      funnel,
      recruitmentFunnel,
      sourceConversion,
      radar,
      statusCandidates,
      statusVacancies,
      statusRequisitions,
      sources,
      reasons,
      centerPipeline,
      aging,
      stepsByType,
      salaryByArea,
      insights,
      kpis: {
        requisitions: requisitions.length,
        requestedPositions,
        vacancies: vacancies.length,
        activeVacancies: activeVacancies.length,
        totalPositions,
        candidates: candidates.length,
        hiredCandidates: hiredCandidates.length,
        hireRate,
        selectionRate,
        rejectionRate,
        avgTimeToFill,
        avgOpenDays,
        avgCandidatesPerVacancy,
      },
    };
  }, [vacancies, candidates, requisitions]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-80" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Analítica de Selección</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tendencias, embudo, comportamiento de candidatos y desempeño de requisiciones y vacantes.
            </p>
          </div>
          <Badge variant="outline" className="w-fit bg-primary-light text-primary border-primary/20">
            {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
          </Badge>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Requisiciones" value={analytics.kpis.requisitions} detail={`${analytics.kpis.requestedPositions} cupos solicitados`} icon={Briefcase} trend="neutral" />
        <KpiCard title="Vacantes activas" value={analytics.kpis.activeVacancies} detail={`${analytics.kpis.totalPositions} posiciones publicadas`} icon={Target} trend="up" />
        <KpiCard title="Candidatos" value={analytics.kpis.candidates} detail={`${numberFormatter.format(analytics.kpis.avgCandidatesPerVacancy)} por vacante`} icon={Users} trend="up" />
        <KpiCard title="Contratados" value={analytics.kpis.hiredCandidates} detail={`${analytics.kpis.hireRate}% conversión`} icon={UserCheck} trend={analytics.kpis.hireRate >= 15 ? 'up' : 'down'} />
        <KpiCard title="Tasa selección" value={`${analytics.kpis.selectionRate}%`} detail="Seleccionados + contratados" icon={CheckCircle2} />
        <KpiCard title="Tasa descarte" value={`${analytics.kpis.rejectionRate}%`} detail="No seleccionados o retirados" icon={Gauge} />
        <KpiCard title="Tiempo cierre" value={`${analytics.kpis.avgTimeToFill} días`} detail="Promedio de vacantes cerradas" icon={Clock} />
        <KpiCard title="Edad vacante" value={`${analytics.kpis.avgOpenDays} días`} detail="Promedio de vacantes abiertas" icon={Activity} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {analytics.insights.map((insight) => (
          <Card key={insight.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{insight.title}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{insight.value}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    insight.tone === 'success' && 'bg-success-light text-success border-success/20',
                    insight.tone === 'warning' && 'bg-warning-light text-warning border-warning/20',
                    insight.tone === 'destructive' && 'bg-destructive/10 text-destructive border-destructive/20'
                  )}
                >
                  {insight.tone === 'success' ? 'Saludable' : insight.tone === 'warning' ? 'Atención' : 'Crítico'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Tendencia mensual del proceso" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.trend} margin={{ left: -20, right: 12, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="requisiciones" name="Requisiciones" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="vacantes" name="Vacantes" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
              <Area type="monotone" dataKey="candidatos" name="Candidatos" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.16} />
              <Line type="monotone" dataKey="contratados" name="Contratados" stroke="hsl(var(--success))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Embudo de conversión">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.funnel} layout="vertical" margin={{ left: 18, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={96} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Volumen" radius={[0, 6, 6, 0]}>
                {analytics.funnel.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Embudo de reclutamiento por etapa" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.recruitmentFunnel} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Volumen' ? value : `${value}%`} />
              <Legend />
              <Bar yAxisId="left" dataKey="value" name="Volumen" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="totalPercent" name="% del total" stroke="hsl(var(--success))" strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="stepPercent" name="% etapa anterior" stroke="hsl(var(--warning))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Conversión por fuente de convocatoria" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.sourceConversion} margin={{ left: -20, right: 18, top: 10, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="source" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => String(name).includes('%') ? `${value}%` : value} />
              <Legend />
              <Bar yAxisId="left" dataKey="aplicado" name="Aplicado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="evaluado" name="Evaluado" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="entrevista" name="Entrevista" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="oferta" name="Oferta" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="contratado" name="Contratado" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="contratadoPct" name="% contratado" stroke="hsl(var(--foreground))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Salud integral del proceso">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={analytics.radar} outerRadius="72%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar dataKey="value" name="Índice" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.24} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Candidatos por estado">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.statusCandidates} dataKey="value" nameKey="name" outerRadius={96} label>
                {analytics.statusCandidates.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Vacantes por estado">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.statusVacancies} margin={{ left: -20, right: 12, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Vacantes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Requisiciones por estado">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.statusRequisitions} dataKey="value" nameKey="name" innerRadius={48} outerRadius={96} paddingAngle={3}>
                {analytics.statusRequisitions.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fuentes de candidatos">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.sources} margin={{ left: -20, right: 12, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Candidatos" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Motivos de vacante">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.reasons} margin={{ left: -20, right: 12, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" name="Vacantes" stroke="hsl(var(--tertiary))" fill="hsl(var(--tertiary))" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Pipeline por centro de operación" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.centerPipeline} margin={{ left: -20, right: 12, top: 8, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="vacantes" name="Cupos" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="candidatos" name="Candidatos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="contratados" name="Contratados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Antigüedad de vacantes abiertas">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.aging} dataKey="value" nameKey="name" outerRadius={98} label>
                {analytics.aging.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Rangos salariales promedio por área">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.salaryByArea} layout="vertical" margin={{ left: 28, right: 18, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`} tick={{ fontSize: 12 }} />
              <YAxis dataKey="area" type="category" width={92} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="promedio" name="Promedio" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Conversión detallada por fuente de convocatoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.sourceConversion.length > 0 ? analytics.sourceConversion.map((source: any) => (
              <div key={source.source} className="rounded-md border p-3">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium text-foreground">{source.source}</p>
                  <Badge variant="outline" className="w-fit">{source.contratadoPct}% contratación</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-5">
                  {[
                    ['Aplicado', source.aplicado, 100],
                    ['Evaluado', source.evaluado, source.evaluadoPct],
                    ['Entrevista', source.entrevista, source.entrevistaPct],
                    ['Oferta', source.oferta, source.ofertaPct],
                    ['Contratado', source.contratado, source.contratadoPct],
                  ].map(([label, value, pct]) => (
                    <div key={label as string} className="rounded-md bg-muted/50 p-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{value}</span>
                      </div>
                      <Progress value={Number(pct)} className="mt-2 h-1.5" />
                      <p className="mt-1 text-[11px] text-muted-foreground">{pct}%</p>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Aún no hay candidatos con fuente de convocatoria registrada.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-5 w-5 text-primary" />
            Desempeño por etapa de selección
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            {analytics.stepsByType.length > 0 ? analytics.stepsByType.map((step) => (
              <div key={step.step} className="rounded-md border p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{step.step}</p>
                    <p className="text-xs text-muted-foreground">{step.completados}/{step.total} etapas completadas</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{step.avance}%</Badge>
                </div>
                <Progress value={step.avance} className="h-2" />
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Total: {step.total}</span>
                  <span>Rechazos: {step.rechazados}</span>
                  <span>Score: {step.promedio || 'N/A'}</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">Aún no hay etapas de selección registradas.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
