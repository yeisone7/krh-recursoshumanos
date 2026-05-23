import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, subMonths, subWeeks, startOfMonth, startOfWeek, differenceInCalendarDays } from 'date-fns';
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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  BookOpen,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  Gauge,
  Info,
  PauseCircle,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserX,
  Users,
  X,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const spanishLabels: Record<string, string> = {
  applied: 'Aplicado',
  evaluated: 'Evaluado',
  interview: 'Entrevista',
  offer: 'Oferta',
  hired: 'Contratado',
  selected: 'Seleccionado',
  not_selected: 'No seleccionado',
  withdrawn: 'Retirado',
  rejected: 'Rechazado',
  open: 'Abierta',
  in_process: 'En proceso',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  approved: 'Aprobada',
  pending: 'Pendiente',
  completed: 'Completada',
  new_position: 'Cargo nuevo',
  replacement: 'Reemplazo',
  temporary: 'Temporal',
  full_time: 'Tiempo completo',
  part_time: 'Medio tiempo',
  day: 'Diurna',
  night: 'Nocturna',
  mixed: 'Mixta',
  rotating: 'Rotativa',
  linkedin: 'LinkedIn',
  referral: 'Referido',
  referrals: 'Referidos',
  website: 'Sitio web',
  job_board: 'Portal de empleo',
  source: 'Fuente',
  paused: 'Pausada',
  no_aprobo_emo: 'No aprobó EMO',
  no_aprobo_eds: 'No aprobó EDS',
  no_aprobo_pruebas: 'No aprobó pruebas',
  otra_oferta: 'Otra oferta laboral',
  motivos_personales: 'Motivos personales',
  salario: 'Salario',
  otro: 'Otro motivo',
};

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatStatus(value: string | null | undefined) {
  if (!value) return 'Sin estado';
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (spanishLabels[normalized]) return spanishLabels[normalized];
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function bucketDays(days: number) {
  if (days <= 7) return '0-7 días';
  if (days <= 15) return '8-15 días';
  if (days <= 30) return '16-30 días';
  return '+30 días';
}

function isWithinRange(date: Date | null, startDate: string, endDate: string) {
  if (!date) return !startDate && !endDate;
  if (startDate && date < new Date(`${startDate}T00:00:00`)) return false;
  if (endDate && date > new Date(`${endDate}T23:59:59`)) return false;
  return true;
}

function getCandidateCenterId(candidate: any) {
  return candidate.vacancies?.operation_center_id || candidate.vacancies?.operation_centers?.id || null;
}

function getCandidateLastActivityDate(candidate: any) {
  const stepDates = (candidate.selection_steps || [])
    .flatMap((step: any) => [step.completed_date, step.updated_at, step.created_at, step.scheduled_date])
    .map(asDate)
    .filter(Boolean) as Date[];
  const baseDates = [candidate.updated_at, candidate.application_date, candidate.created_at].map(asDate).filter(Boolean) as Date[];
  const dates = [...stepDates, ...baseDates];
  if (!dates.length) return null;
  return dates.sort((a, b) => b.getTime() - a.getTime())[0];
}

function periodKey(date: Date, period: 'week' | 'month') {
  const normalized = period === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfMonth(date);
  return format(normalized, 'yyyy-MM-dd');
}

function periodLabel(date: Date, period: 'week' | 'month') {
  return period === 'week'
    ? format(date, "'Sem' d MMM", { locale: es })
    : format(date, 'MMM yy', { locale: es });
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

export interface MetricInfoData {
  calc: string;
  ejemplo: string;
  note: string;
}

function MetricInfo({ info }: { info: MetricInfoData }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/50 transition-colors hover:text-primary hover:bg-primary/10 focus:outline-none"
          aria-label="Ver cómo se calcula"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 p-0 text-sm shadow-lg">
        <div className="space-y-0 divide-y">
          <div className="p-3 space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">¿Cómo se calcula?</p>
            <p className="text-xs text-foreground/85 leading-relaxed">{info.calc}</p>
          </div>
          <div className="p-3 space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ejemplo</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{info.ejemplo}</p>
          </div>
          <div className="p-3 space-y-0.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Interpretación</p>
            <p className="text-xs text-primary/80 leading-relaxed italic">{info.note}</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ChartCard({ title, children, className, info }: { title: string; children: React.ReactNode; className?: string; info?: MetricInfoData }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {info && <MetricInfo info={info} />}
        </div>
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
  info,
}: {
  title: string;
  value: string | number;
  detail: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  info?: MetricInfoData;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-muted-foreground">{title}</p>
              {info && <MetricInfo info={info} />}
            </div>
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

const infographicPalette = {
  teal: '#10A5BC',
  green: '#78B80F',
  orange: '#FF9900',
  coral: '#F35B4F',
  navy: '#263147',
  slate: '#7A8797',
  aqua: '#45D1C5',
};

function InfographicPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  );
}

function CircularProcessInfographic({ analytics }: { analytics: any }) {
  const stages = [
    { label: 'Planear', value: analytics.kpis.activeRequisitions, color: infographicPalette.teal, icon: Briefcase },
    { label: 'Publicar', value: analytics.kpis.activeVacancies, color: infographicPalette.green, icon: Target },
    { label: 'Atraer', value: analytics.kpis.candidates, color: infographicPalette.navy, icon: Users },
    { label: 'Evaluar', value: analytics.kpis.inProcessCandidates, color: infographicPalette.orange, icon: Gauge },
    { label: 'Vincular', value: analytics.kpis.hiredCandidates, color: infographicPalette.coral, icon: UserCheck },
  ];
  const total = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <InfographicPanel className="bg-[#F7FBFB]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ciclo de talento</p>
          <h3 className="text-xl font-black text-slate-950">Proceso de seleccion</h3>
        </div>
        <Sparkles className="h-5 w-5 text-slate-500" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[250px_1fr] lg:items-center">
        <div className="relative mx-auto h-64 w-64">
          <div className="absolute inset-8 rounded-full border-[18px] border-slate-100 bg-white shadow-inner" />
          <div className="absolute inset-[74px] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
            <p className="text-3xl font-black text-slate-950">{analytics.kpis.advanceRate}%</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">avance</p>
          </div>
          {stages.map((stage, index) => {
            const angle = (index / stages.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 96 + 128;
            const y = Math.sin(angle) * 96 + 128;
            const Icon = stage.icon;
            return (
              <div
                key={stage.label}
                className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-white shadow-sm"
                style={{ left: x, top: y, backgroundColor: stage.color }}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1 text-xs font-black">{stage.value}</span>
              </div>
            );
          })}
        </div>
        <div className="space-y-3">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div key={stage.label} className="grid grid-cols-[42px_1fr_52px] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ backgroundColor: stage.color }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-900">{stage.label}</p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${clampPercent((stage.value / total) * 100)}%`, backgroundColor: stage.color }} />
                  </div>
                </div>
                <span className="text-right text-lg font-black text-slate-950">{stage.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </InfographicPanel>
  );
}

function FunnelStepsInfographic({ analytics }: { analytics: any }) {
  const maxValue = Math.max(...analytics.recruitmentFunnel.map((item: any) => item.value), 1);

  return (
    <InfographicPanel>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ruta del candidato</p>
          <h3 className="text-lg font-black text-slate-950">Embudo visual</h3>
        </div>
        <TrendingUp className="h-5 w-5 text-slate-500" />
      </div>
      <div className="space-y-3">
        {analytics.recruitmentFunnel.map((item: any, index: number) => {
          const color = Object.values(infographicPalette)[index % Object.values(infographicPalette).length];
          return (
            <div key={item.name} className="grid grid-cols-[42px_1fr_64px] items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: color }}>
                {index + 1}
              </span>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-800">{item.name}</span>
                  <span className="text-[11px] font-bold text-slate-500">{item.stepPercent}% etapa</span>
                </div>
                <div className="mt-1.5 h-5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(5, (item.value / maxValue) * 100)}%`, backgroundColor: color }} />
                </div>
              </div>
              <span className="text-right text-lg font-black text-slate-950">{item.value}</span>
            </div>
          );
        })}
      </div>
    </InfographicPanel>
  );
}

function SourceInfographic({ analytics }: { analytics: any }) {
  const sources = analytics.sourceConversion.slice(0, 5);
  const maxApplied = Math.max(...sources.map((item: any) => item.aplicado), 1);

  return (
    <InfographicPanel className="bg-[#FBFAF5]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atraccion</p>
          <h3 className="text-lg font-black text-slate-950">Fuentes y conversion</h3>
        </div>
        <Users className="h-5 w-5 text-slate-500" />
      </div>
      <div className="space-y-3">
        {sources.length > 0 ? sources.map((source: any, index: number) => {
          const color = [infographicPalette.teal, infographicPalette.orange, infographicPalette.green, infographicPalette.coral, infographicPalette.navy][index % 5];
          return (
            <div key={source.source} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="truncate text-xs font-black uppercase tracking-wide text-slate-900">{source.source}</p>
                <span className="rounded-full px-2.5 py-1 text-[10px] font-black text-white" style={{ backgroundColor: color }}>
                  {source.contratadoPct}%
                </span>
              </div>
              <div className="grid grid-cols-[1fr_74px] items-center gap-3">
                <div className="h-4 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(6, (source.aplicado / maxApplied) * 100)}%`, backgroundColor: color }} />
                </div>
                <span className="text-right text-xs font-black text-slate-700">{source.aplicado} aplic.</span>
              </div>
            </div>
          );
        }) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">
            Sin fuentes registradas
          </div>
        )}
      </div>
    </InfographicPanel>
  );
}

function PeopleStatusInfographic({ analytics }: { analytics: any }) {
  const total = Math.max(analytics.kpis.candidates, 1);
  const selected = analytics.kpis.hiredCandidates + analytics.kpis.inProcessCandidates;
  const discarded = analytics.kpis.discardedCandidates;
  const withdrawn = analytics.kpis.withdrawnCandidates;
  const blocks = Array.from({ length: 50 }, (_, index) => {
    const position = Math.ceil(((index + 1) / 50) * total);
    if (position <= analytics.kpis.hiredCandidates) return infographicPalette.green;
    if (position <= selected) return infographicPalette.teal;
    if (position <= selected + discarded) return infographicPalette.coral;
    if (position <= selected + discarded + withdrawn) return infographicPalette.orange;
    return '#D8DEE8';
  });

  return (
    <InfographicPanel>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mapa poblacional</p>
          <h3 className="text-lg font-black text-slate-950">Estado de candidatos</h3>
        </div>
        <UserCheck className="h-5 w-5 text-slate-500" />
      </div>
      <div className="grid grid-cols-10 gap-2">
        {blocks.map((color, index) => (
          <span key={index} className="h-7 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {[
          { label: 'Contratados', value: analytics.kpis.hiredCandidates, color: infographicPalette.green },
          { label: 'En proceso', value: analytics.kpis.inProcessCandidates, color: infographicPalette.teal },
          { label: 'Descartados', value: analytics.kpis.discardedCandidates, color: infographicPalette.coral },
          { label: 'Desistidos', value: analytics.kpis.withdrawnCandidates, color: infographicPalette.orange },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="text-slate-950">{item.value} / {percent(item.value, total)}%</span>
          </div>
        ))}
      </div>
    </InfographicPanel>
  );
}

function KpiRibbon({ analytics }: { analytics: any }) {
  const items = [
    { label: 'Requisiciones', value: analytics.kpis.requisitions, color: infographicPalette.teal },
    { label: 'Vacantes', value: analytics.kpis.vacancies, color: infographicPalette.green },
    { label: 'Candidatos', value: analytics.kpis.candidates, color: infographicPalette.orange },
    { label: 'Seleccion', value: `${analytics.kpis.selectionRate}%`, color: infographicPalette.coral },
    { label: 'Cobertura', value: `${analytics.kpis.avgTimeToFill}d`, color: infographicPalette.navy },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map((item, index) => (
        <div key={item.label} className="relative min-h-[96px] overflow-hidden rounded-lg p-4 text-white shadow-sm" style={{ backgroundColor: item.color }}>
          <span className="absolute -right-8 top-1/2 h-20 w-20 -translate-y-1/2 rotate-45 bg-white/20" />
          <p className="text-3xl font-black leading-none">{String(index + 1).padStart(2, '0')}</p>
          <p className="mt-3 text-[10px] font-black uppercase tracking-widest opacity-80">{item.label}</p>
          <p className="text-xl font-black">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function SelectionInfographicsTab({ analytics }: { analytics: any }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F7F7FD] p-3 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <CircularProcessInfographic analytics={analytics} />
        <FunnelStepsInfographic analytics={analytics} />
      </div>

      <KpiRibbon analytics={analytics} />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SourceInfographic analytics={analytics} />
        <PeopleStatusInfographic analytics={analytics} />
      </div>

      <InfographicPanel className="bg-[#F7FBFB]">
        <div className="grid gap-5 xl:grid-cols-[230px_1fr] xl:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lectura ejecutiva</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Prioridades del proceso</h3>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Vista compacta para revisar atraccion, avance, cobertura y puntos de perdida del embudo.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pipeline</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{numberFormatter.format(analytics.kpis.avgCandidatesPerVacancy)}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">candidatos por vacante</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pico aperturas</p>
              <p className="mt-2 text-lg font-black text-slate-950">{analytics.peakWeeklyOpenings.period || 'N/A'}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{analytics.peakWeeklyOpenings.aperturas || 0} aperturas</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mayor demora</p>
              <p className="mt-2 text-lg font-black text-slate-950">{analytics.peakMonthlyCoverage.period || 'N/A'}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{analytics.peakMonthlyCoverage.cobertura || 0} dias</p>
            </div>
          </div>
        </div>
      </InfographicPanel>
    </div>
  );
}

export default function AnaliticaSeleccion() {
  const { data: vacancies = [], isLoading: loadingVacancies } = useVacancies();
  const { data: candidates = [], isLoading: loadingCandidates } = useCandidates();
  const { data: requisitions = [], isLoading: loadingRequisitions } = useRequisitions();
  const [centerFilter, setCenterFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showMetricsDict, setShowMetricsDict] = useState(false);

  const isLoading = loadingVacancies || loadingCandidates || loadingRequisitions;

  const centerOptions = useMemo(() => {
    const centers = new Map<string, string>();
    vacancies.forEach((item: any) => {
      if (item.operation_center_id && item.operation_centers?.name) centers.set(item.operation_center_id, item.operation_centers.name);
    });
    requisitions.forEach((item: any) => {
      if (item.operation_center_id && item.operation_centers?.name) centers.set(item.operation_center_id, item.operation_centers.name);
    });
    return Array.from(centers.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [vacancies, requisitions]);

  const filteredRequisitions = useMemo(() => requisitions.filter((item: any) => {
    const matchesCenter = centerFilter === 'all' || item.operation_center_id === centerFilter;
    const matchesDate = isWithinRange(asDate(item.fecha_requisicion || item.created_at), startDate, endDate);
    return matchesCenter && matchesDate;
  }), [requisitions, centerFilter, startDate, endDate]);

  const filteredVacancies = useMemo(() => vacancies.filter((item: any) => {
    const matchesCenter = centerFilter === 'all' || item.operation_center_id === centerFilter;
    const matchesDate = isWithinRange(asDate(item.open_date || item.created_at), startDate, endDate);
    return matchesCenter && matchesDate;
  }), [vacancies, centerFilter, startDate, endDate]);

  const filteredCandidates = useMemo(() => candidates.filter((item: any) => {
    const matchesCenter = centerFilter === 'all' || getCandidateCenterId(item) === centerFilter;
    const matchesDate = isWithinRange(asDate(item.application_date || item.created_at), startDate, endDate);
    return matchesCenter && matchesDate;
  }), [candidates, centerFilter, startDate, endDate]);

  const analytics = useMemo(() => {
    const vacancies = filteredVacancies;
    const candidates = filteredCandidates;
    const requisitions = filteredRequisitions;
    const today = new Date();
    const monthStarts = Array.from({ length: 6 }, (_, index) => startOfMonth(subMonths(today, 5 - index)));
    const monthKey = (date: Date) => format(date, 'yyyy-MM');
    const monthLabel = (date: Date) => format(date, 'MMM yy', { locale: es });
    const buildCoverageTrend = (period: 'week' | 'month') => {
      const periods = Array.from({ length: period === 'week' ? 12 : 6 }, (_, index) =>
        period === 'week'
          ? startOfWeek(subWeeks(today, 11 - index), { weekStartsOn: 1 })
          : startOfMonth(subMonths(today, 5 - index))
      );

      return periods.map((periodStart) => {
        const key = periodKey(periodStart, period);
        const opened = vacancies.filter((item: any) => {
          const date = asDate(item.open_date || item.created_at);
          return date && periodKey(date, period) === key;
        }).length;
        const closedItems = vacancies.filter((item: any) => {
          const date = asDate(item.actual_close_date);
          return date && periodKey(date, period) === key;
        });
        const avgCoverage = closedItems.length
          ? Math.round(closedItems.reduce((sum: number, item: any) => {
              const openDate = asDate(item.open_date);
              const closeDate = asDate(item.actual_close_date);
              return openDate && closeDate ? sum + Math.max(0, differenceInCalendarDays(closeDate, openDate)) : sum;
            }, 0) / closedItems.length)
          : 0;

        return {
          period: periodLabel(periodStart, period),
          aperturas: opened,
          cierres: closedItems.length,
          cobertura: avgCoverage,
        };
      });
    };

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
    const weeklyCoverageTrend = buildCoverageTrend('week');
    const monthlyCoverageTrend = buildCoverageTrend('month');
    const peakWeeklyOpenings = weeklyCoverageTrend.reduce((peak, item) => item.aperturas > peak.aperturas ? item : peak, weeklyCoverageTrend[0] || { period: '', aperturas: 0, cierres: 0, cobertura: 0 });
    const peakMonthlyCoverage = monthlyCoverageTrend.reduce((peak, item) => item.cobertura > peak.cobertura ? item : peak, monthlyCoverageTrend[0] || { period: '', aperturas: 0, cierres: 0, cobertura: 0 });

    const activeRequisitions = requisitions.filter((item: any) => !['rechazada', 'cancelada', 'cerrada', 'finalizada'].includes(String(item.estado_requisicion || '').toLowerCase()));
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

    const demandByPosition = Object.values(
      vacancies.reduce<Record<string, { cargo: string; demanda: number; vacantes: number; candidatos: number; contratados: number; cobertura: number }>>((acc: any, vacancy: any) => {
        const cargo = formatStatus(vacancy.position_title || vacancy.personnel_requisitions?.cargo_solicitado || 'Sin cargo');
        if (!acc[cargo]) acc[cargo] = { cargo, demanda: 0, vacantes: 0, candidatos: 0, contratados: 0, cobertura: 0 };
        const vacancyCandidates = candidates.filter((candidate: any) => candidate.vacancy_id === vacancy.id);
        const positions = vacancy.positions_count || 1;
        acc[cargo].demanda += positions;
        acc[cargo].vacantes += 1;
        acc[cargo].candidatos += vacancyCandidates.length;
        acc[cargo].contratados += vacancyCandidates.filter((candidate: any) => candidate.status === 'hired').length;
        acc[cargo].cobertura = percent(acc[cargo].contratados, acc[cargo].demanda);
        return acc;
      }, {})
    ).sort((a, b) => b.demanda - a.demanda).slice(0, 10);

    const coverageByPosition = [...demandByPosition]
      .sort((a, b) => b.cobertura - a.cobertura || b.demanda - a.demanda)
      .slice(0, 8);

    const demandByShift = Object.values(
      vacancies.reduce<Record<string, { jornada: string; demanda: number; candidatos: number; contratados: number; cobertura: number }>>((acc: any, vacancy: any) => {
        const jornada = formatStatus(vacancy.shift_type || 'Sin jornada');
        if (!acc[jornada]) acc[jornada] = { jornada, demanda: 0, candidatos: 0, contratados: 0, cobertura: 0 };
        const vacancyCandidates = candidates.filter((candidate: any) => candidate.vacancy_id === vacancy.id);
        acc[jornada].demanda += vacancy.positions_count || 1;
        acc[jornada].candidatos += vacancyCandidates.length;
        acc[jornada].contratados += vacancyCandidates.filter((candidate: any) => candidate.status === 'hired').length;
        acc[jornada].cobertura = percent(acc[jornada].contratados, acc[jornada].demanda);
        return acc;
      }, {})
    ).sort((a, b) => b.demanda - a.demanda).slice(0, 8);

    const stagnationAlerts = inProcessCandidates
      .map((candidate: any) => {
        const lastActivity = getCandidateLastActivityDate(candidate);
        const stagnantDays = lastActivity ? Math.max(0, differenceInCalendarDays(today, lastActivity)) : 0;
        return {
          id: candidate.id,
          name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.document_number || 'Candidato sin nombre',
          vacancy: candidate.vacancies?.position_title || 'Vacante sin cargo',
          source: formatStatus(candidate.source || 'Sin fuente'),
          status: formatStatus(candidate.status),
          stagnantDays,
        };
      })
      .filter((candidate) => candidate.stagnantDays >= 7)
      .sort((a, b) => b.stagnantDays - a.stagnantDays)
      .slice(0, 8);

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
    const advanceRate = candidates.length
      ? Math.round(candidates.reduce((sum: number, candidate: any) => {
          const reachedIndex = recruitmentStages.reduce((max, stage, index) => candidateReachedStage(candidate, stage.key) ? index : max, 0);
          return sum + (reachedIndex / (recruitmentStages.length - 1)) * 100;
        }, 0) / candidates.length)
      : 0;
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

    const discardedCandidates = candidates.filter((c: any) => c.status === 'not_selected');
    const withdrawnCandidates = candidates.filter((c: any) => c.status === 'withdrawn');
    const pausedVacancies = vacancies.filter((v: any) => v.status === 'paused');
    const cancelledVacancies = vacancies.filter((v: any) => v.status === 'cancelled');
    const discardRate = percent(discardedCandidates.length, candidates.length);
    const withdrawalRate = percent(withdrawnCandidates.length, candidates.length);

    const rejectionReasonsData = groupCount(discardedCandidates as any[], (c) => (c as any).rejection_reason || 'sin_registro');
    const withdrawalReasonsData = groupCount(withdrawnCandidates as any[], (c) => (c as any).withdrawal_reason || 'sin_registro');

    const positionsCoverage = vacancies
      .map((v: any) => {
        const vacCandidates = candidates.filter((c: any) => c.vacancy_id === v.id);
        const covered = vacCandidates.filter((c: any) => ['selected', 'hired'].includes(c.status)).length;
        const total = v.positions_count || 1;
        return { cargo: v.position_title || 'Sin cargo', posiciones: total, cubiertos: covered, cobertura: percent(covered, total) };
      })
      .sort((a: any, b: any) => b.posiciones - a.posiciones)
      .slice(0, 10);

    const cancelledVacanciesData = cancelledVacancies.map((v: any) => ({
      cargo: v.position_title || 'Sin cargo',
      reason: v.cancellation_reason || 'Sin justificación',
      cancelledBy: v.cancelled_by || '—',
      cancelledAt: v.cancelled_at ? v.cancelled_at.slice(0, 10) : '—',
    }));

    return {
      trend,
      weeklyCoverageTrend,
      monthlyCoverageTrend,
      peakWeeklyOpenings,
      peakMonthlyCoverage,
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
      demandByPosition,
      coverageByPosition,
      demandByShift,
      stagnationAlerts,
      insights,
      rejectionReasonsData,
      withdrawalReasonsData,
      positionsCoverage,
      cancelledVacanciesData,
      kpis: {
        requisitions: requisitions.length,
        activeRequisitions: activeRequisitions.length,
        requestedPositions,
        vacancies: vacancies.length,
        activeVacancies: activeVacancies.length,
        totalPositions,
        candidates: candidates.length,
        inProcessCandidates: inProcessCandidates.length,
        hiredCandidates: hiredCandidates.length,
        discardedCandidates: discardedCandidates.length,
        withdrawnCandidates: withdrawnCandidates.length,
        pausedVacancies: pausedVacancies.length,
        cancelledVacancies: cancelledVacancies.length,
        advanceRate,
        hireRate,
        selectionRate,
        rejectionRate,
        discardRate,
        withdrawalRate,
        avgTimeToFill,
        avgOpenDays,
        avgCandidatesPerVacancy,
      },
    };
  }, [filteredVacancies, filteredCandidates, filteredRequisitions]);

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowMetricsDict(true)} className="gap-2">
              <BookOpen className="h-4 w-4" />
              Diccionario de Métricas
            </Button>
            <Badge variant="outline" className="w-fit bg-primary-light text-primary border-primary/20">
              {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
            </Badge>
          </div>
        </div>
      </motion.div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Filter className="h-4 w-4" /> Centro de operación
              </div>
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los centros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centerOptions.map((center) => (
                    <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Desde
              </div>
              <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <CalendarDays className="h-4 w-4" /> Hasta
              </div>
              <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ejecutivo" className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:w-[460px]">
          <TabsTrigger value="ejecutivo" className="gap-2 rounded-md py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
            Ejecutivo
          </TabsTrigger>
          <TabsTrigger value="infografias" className="gap-2 rounded-md py-2.5 text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="h-4 w-4" />
            Infografias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ejecutivo" className="mt-0 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Requisiciones activas" value={analytics.kpis.activeRequisitions} detail={`${analytics.kpis.requisitions} requisiciones filtradas`} icon={Briefcase} trend="neutral"
          info={{ calc: 'Se cuentan todas las solicitudes de personal que no han sido canceladas, rechazadas ni cerradas.', ejemplo: 'Si hay 10 solicitudes y 2 fueron canceladas, el indicador muestra 8.', note: 'Refleja cuántas necesidades de personal están pendientes de resolver.' }} />
        <KpiCard title="Vacantes abiertas" value={analytics.kpis.activeVacancies} detail={`${analytics.kpis.totalPositions} posiciones publicadas`} icon={Target} trend="up"
          info={{ calc: 'Se cuentan las vacantes en estado Abierta o En Proceso.', ejemplo: 'Si se crearon 5 vacantes y 2 ya cerraron, se muestran 3.', note: 'Indica cuántos procesos de selección están activos ahora mismo.' }} />
        <KpiCard title="Candidatos en proceso" value={analytics.kpis.inProcessCandidates} detail={`${numberFormatter.format(analytics.kpis.avgCandidatesPerVacancy)} por vacante`} icon={Users} trend="up"
          info={{ calc: 'Candidatos sin resultado final: ni contratados, ni descartados, ni desistidos.', ejemplo: 'Un candidato en entrevista cuenta; uno contratado ya no cuenta.', note: 'Muestra cuántas personas están siendo evaluadas en este momento.' }} />
        <KpiCard title="Tasa de avance" value={`${analytics.kpis.advanceRate}%`} detail="Promedio del embudo aplicado-contratado" icon={TrendingUp} trend={analytics.kpis.advanceRate >= 45 ? 'up' : 'down'}
          info={{ calc: 'Promedio de qué tan lejos llegan los candidatos dentro del proceso (de aplicación a contratación).', ejemplo: 'Si la mayoría llega hasta entrevistas pero casi nadie llega a oferta, la tasa baja.', note: 'Cuanto más alta, mejor: significa que los candidatos avanzan por todo el proceso.' }} />
        <KpiCard title="Tiempo prom. cobertura" value={`${analytics.kpis.avgTimeToFill} días`} detail="Promedio de vacantes cerradas" icon={Clock}
          info={{ calc: 'Promedio de días que tomó cerrar las vacantes ya finalizadas (desde apertura hasta cierre).', ejemplo: 'Si una vacante tardó 20 días y otra 30, el promedio es 25 días.', note: 'Permite saber si los procesos de selección son rápidos o lentos.' }} />
        <KpiCard title="Contratados" value={analytics.kpis.hiredCandidates} detail={`${analytics.kpis.hireRate}% conversión`} icon={UserCheck} trend={analytics.kpis.hireRate >= 15 ? 'up' : 'down'}
          info={{ calc: 'Candidatos que completaron el proceso y fueron oficialmente vinculados a la empresa.', ejemplo: 'Si de 20 candidatos, 4 fueron contratados, este número es 4.', note: 'Es el resultado final esperado de cada proceso de selección. Una tasa del 15% o más es saludable.' }} />
        <KpiCard title="Tasa selección" value={`${analytics.kpis.selectionRate}%`} detail="Seleccionados + contratados" icon={CheckCircle2}
          info={{ calc: 'De cada 100 candidatos, cuántos fueron seleccionados o contratados.', ejemplo: '2 seleccionados + 3 contratados de 20 = 25% de tasa de selección.', note: 'Incluye tanto a los seleccionados (pendientes de contratar) como a los ya vinculados.' }} />
        <KpiCard title="Tasa descarte global" value={`${analytics.kpis.rejectionRate}%`} detail="No seleccionados o retirados" icon={Gauge}
          info={{ calc: 'De cada 100 candidatos, cuántos no continuaron en el proceso (descartados o desistidos).', ejemplo: '5 descartados + 3 desistidos de 20 candidatos = 40% de descarte global.', note: 'Permite ver qué tanto se está filtrando el proceso. Un valor muy alto puede indicar problemas en la atracción de candidatos.' }} />
      </div>

      {/* New status KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Descartados" value={analytics.kpis.discardedCandidates} detail={`${analytics.kpis.discardRate}% del total de candidatos`} icon={UserMinus} trend={analytics.kpis.discardRate <= 20 ? 'up' : 'down'}
          info={{ calc: 'Candidatos a quienes el equipo de selección marcó como "No seleccionado" con un motivo registrado.', ejemplo: '5 descartados de 20 candidatos = 25% de tasa de descarte.', note: 'Incluye: no aprobó EMO, EDS, pruebas u otro motivo. Una tasa menor al 20% es normal.' }} />
        <KpiCard title="Desistidos" value={analytics.kpis.withdrawnCandidates} detail={`${analytics.kpis.withdrawalRate}% del total de candidatos`} icon={UserX} trend={analytics.kpis.withdrawalRate <= 10 ? 'up' : 'down'}
          info={{ calc: 'Candidatos que decidieron retirarse voluntariamente del proceso.', ejemplo: '3 desistidos de 20 candidatos = 15% de tasa de desistimiento.', note: 'Una tasa alta puede indicar demora en el proceso, salario no competitivo o alta demanda del mercado.' }} />
        <KpiCard title="Vacantes pausadas" value={analytics.kpis.pausedVacancies} detail="Contadores de tiempo suspendidos" icon={PauseCircle} trend="neutral"
          info={{ calc: 'Vacantes con el proceso suspendido temporalmente. Los días pausados no se suman al tiempo de cobertura.', ejemplo: 'Una vacante abierta 10 días, pausada 5 y reactivada, solo cuenta 10 días (no 15).', note: 'Útil cuando hay situaciones internas que impiden avanzar sin llegar a cancelar la vacante.' }} />
        <KpiCard title="Vacantes canceladas" value={analytics.kpis.cancelledVacancies} detail="Requieren revisión o justificación" icon={Ban} trend={analytics.kpis.cancelledVacancies === 0 ? 'up' : 'down'}
          info={{ calc: 'Vacantes cerradas anticipadamente con un motivo, responsable y fecha registrados.', ejemplo: 'Se cancela una vacante porque el área ya no tiene presupuesto para el cargo.', note: 'Toda cancelación queda trazable. Un número alto puede indicar inestabilidad en la planeación del personal.' }} />
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
        <ChartCard title="Tendencia mensual del proceso" className="xl:col-span-2"
          info={{ calc: 'Agrupa por mes las requisiciones creadas, vacantes abiertas, candidatos aplicados y contrataciones.', ejemplo: 'Si en marzo se abrieron 5 vacantes y 3 candidatos fueron contratados, aparecen en esas barras y líneas.', note: 'Permite ver si el proceso crece, se estanca o mejora mes a mes.' }}>
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

        <ChartCard title="Tendencia semanal: aperturas, cierres y cobertura" className="xl:col-span-2"
          info={{ calc: 'Muestra por semana cuántas vacantes se abrieron, cuántas se cerraron y cuántos días tardaron en cerrarse.', ejemplo: 'Si la semana 3 tuvo 4 aperturas y solo 1 cierre, hay acumulación de vacantes sin resolver.', note: 'La línea de cobertura indica si los cierres fueron rápidos o lentos. Picos altos = demoras.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.weeklyCoverageTrend} margin={{ left: -20, right: 18, top: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Tiempo cobertura' ? `${value} días` : value} />
              <Legend />
              <ReferenceLine yAxisId="left" x={analytics.peakWeeklyOpenings.period} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: 'Pico aperturas', fontSize: 11 }} />
              <Area yAxisId="left" type="monotone" dataKey="aperturas" name="Aperturas" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
              <Bar yAxisId="left" dataKey="cierres" name="Cierres" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cobertura" name="Tiempo cobertura" stroke="hsl(var(--warning))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comparativo mensual: volumen vs tiempo de cobertura" className="xl:col-span-2"
          info={{ calc: 'Compara el número de vacantes abiertas y cerradas por mes con el tiempo promedio que tardaron en cubrirse.', ejemplo: 'Si abril tuvo muchas aperturas pero tardó más días, el proceso se volvió más lento ese mes.', note: 'Relaciona volumen con velocidad: meses con muchas aperturas suelen tener tiempos de cobertura más altos.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.monthlyCoverageTrend} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Tiempo cobertura' ? `${value} días` : value} />
              <Legend />
              <ReferenceLine yAxisId="right" x={analytics.peakMonthlyCoverage.period} stroke="hsl(var(--warning))" strokeDasharray="4 4" label={{ value: 'Pico cobertura', fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="aperturas" name="Aperturas" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="cierres" name="Cierres" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
              <Area yAxisId="right" type="monotone" dataKey="cobertura" name="Tiempo cobertura" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.18} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Embudo de conversión"
          info={{ calc: 'Muestra cuántos elementos hay en cada etapa: requisiciones → vacantes → candidatos → en proceso → seleccionados → contratados.', ejemplo: 'Si hay 50 candidatos pero solo 5 contratados, hay una reducción del 90% en el embudo.', note: 'Entre más estrecho sea el embudo en las últimas etapas, más selectivo es el proceso. Lo ideal es que sea progresivo.' }}>
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

        <ChartCard title="Embudo de reclutamiento por etapa" className="xl:col-span-2"
          info={{ calc: 'Para cada etapa (aplicado, evaluado, entrevista, oferta, contratado) muestra cuántos candidatos la alcanzaron y qué porcentaje representa del total.', ejemplo: 'Si 20 candidatos llegaron a entrevista de 50, ese paso tiene 40% de alcance.', note: '"% etapa anterior" indica la tasa de avance entre pasos. Una caída grande entre dos etapas señala dónde se pierde más talento.' }}>
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

        <ChartCard title="Conversión por fuente de convocatoria" className="xl:col-span-2"
          info={{ calc: 'Por cada canal (portal, referidos, LinkedIn, etc.) muestra cuántos candidatos aplicaron, evaluaron, llegaron a entrevista, oferta y fueron contratados.', ejemplo: 'Si LinkedIn genera 10 candidatos pero 0 contratados, su tasa de conversión es 0%.', note: 'Identifica qué canales producen candidatos de mejor calidad (más conversión) vs. solo volumen.' }}>
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

        <ChartCard title="Salud integral del proceso"
          info={{ calc: 'Gráfico de radar con 5 dimensiones: Cobertura, Conversión, Selección, Velocidad y Pipeline. Cada una va de 0 a 100.', ejemplo: 'Un proceso ideal tendría todas las dimensiones cerca de 100. Si Velocidad es 20, las vacantes tardan demasiado en cubrirse.', note: 'Una figura equilibrada y grande indica un proceso robusto. Dimensiones bajas o asimétricas señalan áreas de mejora urgente.' }}>
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

        <ChartCard title="Candidatos por estado"
          info={{ calc: 'Distribución de todos los candidatos agrupados por su estado actual: en proceso, contratado, descartado, desistido, etc.', ejemplo: 'Si el 60% está en proceso y el 5% contratado, hay un cuello de botella en la toma de decisiones.', note: 'Una proporción alta de candidatos en proceso sin avance puede indicar falta de seguimiento.' }}>
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

        <ChartCard title="Vacantes por estado"
          info={{ calc: 'Muestra cuántas vacantes hay en cada estado: abierta, en proceso, pausada, cerrada, cancelada.', ejemplo: 'Si hay 8 vacantes abiertas y 3 pausadas, activamente se trabajan 8 pero hay 3 en espera.', note: 'Una cantidad alta de vacantes abiertas por mucho tiempo puede indicar dificultad para encontrar candidatos idóneos.' }}>
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

        <ChartCard title="Requisiciones por estado"
          info={{ calc: 'Distribución de las solicitudes de personal según su estado en el flujo de aprobación.', ejemplo: 'Si hay 5 requisiciones pendientes de aprobación, RRHH aún no las ha gestionado.', note: 'Las requisiciones bloqueadas o rechazadas frenan la creación de vacantes y retrasan la contratación.' }}>
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

        <ChartCard title="Fuentes de candidatos"
          info={{ calc: 'Cuenta cuántos candidatos provienen de cada canal de reclutamiento registrado.', ejemplo: 'Si 30 candidatos vienen de referidos y 10 de un portal de empleo, los referidos son la principal fuente.', note: 'Conocer la fuente más productiva ayuda a enfocar los esfuerzos y el presupuesto de reclutamiento.' }}>
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

        <ChartCard title="Motivos de vacante"
          info={{ calc: 'Agrupa las vacantes según el motivo por el cual fueron creadas: renuncia, nuevo cargo, reemplazo, etc.', ejemplo: 'Si el 70% de las vacantes son por renuncia, hay un posible problema de retención de personal.', note: 'Una alta concentración en un solo motivo puede indicar un patrón organizacional que merece revisión.' }}>
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

        <ChartCard title="Pipeline por centro de operación" className="xl:col-span-2"
          info={{ calc: 'Por cada centro de operación muestra los cupos demandados, los candidatos en proceso y los contratados.', ejemplo: 'Si el centro Bogotá tiene 10 cupos pero solo 3 contratados, tiene el 70% de sus cupos sin cubrir.', note: 'Permite identificar qué centros tienen mayores necesidades de personal no resueltas.' }}>
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

        <ChartCard title="Antigüedad de vacantes abiertas"
          info={{ calc: 'Clasifica las vacantes activas según cuántos días llevan abiertas: menos de 7, 7-15, 16-30 y más de 30 días.', ejemplo: 'Si 5 vacantes llevan más de 30 días abiertas, son las más urgentes de atender.', note: 'Vacantes en la categoría +30 días requieren atención inmediata. Pueden estar bloqueando producción u operaciones.' }}>
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

        <ChartCard title="Rangos salariales promedio por área"
          info={{ calc: 'Para cada área organizacional calcula el salario promedio de las vacantes publicadas en ese período.', ejemplo: 'Si el área de Tecnología tiene un promedio de $4M y Operaciones $2.5M, hay una brecha salarial entre áreas.', note: 'Ayuda a detectar áreas con presupuesto salarial bajo que pueden tener dificultad para atraer candidatos.' }}>
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

        <ChartCard title="Ranking de demanda por cargo" className="xl:col-span-2"
          info={{ calc: 'Lista los cargos más solicitados comparando cuántos cupos se pidieron, cuántos candidatos llegaron y cuántos fueron contratados.', ejemplo: 'Si Conductor tiene 10 cupos pedidos y solo 3 contratados, ese cargo tiene baja tasa de cobertura.', note: 'Los cargos con alta demanda y baja cobertura son los que más requieren estrategias de atracción específicas.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.demandByPosition} layout="vertical" margin={{ left: 36, right: 18, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="cargo" type="category" width={118} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="demanda" name="Cupos demandados" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              <Bar dataKey="candidatos" name="Candidatos" fill="hsl(var(--secondary))" radius={[0, 6, 6, 0]} />
              <Bar dataKey="contratados" name="Contratados" fill="hsl(var(--success))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tasa de cobertura por cargo"
          info={{ calc: 'Para cada cargo muestra qué porcentaje de los cupos solicitados ya fueron cubiertos con contrataciones.', ejemplo: 'Un cargo con 4 cupos pedidos y 2 contratados tiene 50% de cobertura.', note: '100% significa que todos los cupos de ese cargo ya fueron cubiertos. Por debajo del 60% requiere atención.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.coverageByPosition} margin={{ left: -20, right: 12, top: 8, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="cargo" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="cobertura" name="Cobertura" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Demanda y cobertura por jornada"
          info={{ calc: 'Agrupa los cupos demandados y contratados por tipo de jornada laboral (diurna, nocturna, mixta, etc.) y calcula la cobertura.', ejemplo: 'Si la jornada nocturna tiene 10 cupos y 4 contratados, su cobertura es 40%.', note: 'Permite identificar qué tipo de jornada tiene mayor dificultad para ser cubierta.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.demandByShift} margin={{ left: -20, right: 18, top: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="jornada" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => String(name).includes('Cobertura') ? `${value}%` : value} />
              <Legend />
              <Bar yAxisId="left" dataKey="demanda" name="Demanda" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="contratados" name="Contratados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cobertura" name="Cobertura %" stroke="hsl(var(--warning))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Motivos de descarte (No seleccionado)"
          info={{ calc: 'Cuenta cuántos candidatos fueron descartados por cada motivo registrado: EMO, EDS, pruebas u otro.', ejemplo: 'Si 8 candidatos no aprobaron el EMO y 3 no aprobaron pruebas, el EMO es el mayor filtro.', note: 'Un motivo dominante puede indicar que el proceso de selección previa no está siendo efectivo para ese criterio.' }}>
          <ResponsiveContainer width="100%" height="100%">
            {analytics.rejectionReasonsData.length > 0 ? (
              <BarChart data={analytics.rejectionReasonsData} layout="vertical" margin={{ left: 28, right: 18, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Candidatos" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
              </BarChart>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin candidatos descartados aún</div>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Motivos de desistimiento"
          info={{ calc: 'Cuenta cuántos candidatos se retiraron voluntariamente y por qué motivo: otra oferta, salario, motivos personales u otro.', ejemplo: 'Si 6 candidatos se fueron por salario, hay una señal clara de que la oferta económica no es competitiva.', note: 'Analizar estos motivos ayuda a tomar decisiones sobre la propuesta de valor del empleo.' }}>
          <ResponsiveContainer width="100%" height="100%">
            {analytics.withdrawalReasonsData.length > 0 ? (
              <BarChart data={analytics.withdrawalReasonsData} layout="vertical" margin={{ left: 28, right: 18, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Candidatos" fill="hsl(var(--warning))" radius={[0, 6, 6, 0]} />
              </BarChart>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sin candidatos desistidos aún</div>
            )}
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cobertura real de posiciones por vacante" className="xl:col-span-2"
          info={{ calc: 'Por cada vacante muestra cuántos cupos tenía asignados (posiciones requeridas) y cuántos han sido cubiertos con candidatos seleccionados o contratados.', ejemplo: 'Una vacante con 4 cupos y 2 cubiertos tiene 50% de cobertura. Cuando llega al 100%, los botones se bloquean.', note: 'Permite identificar qué vacantes aún tienen cupos disponibles y cuáles ya completaron su proceso.' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.positionsCoverage} margin={{ left: 20, right: 18, top: 10, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="cargo" angle={-12} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => String(name).includes('%') ? `${value}%` : value} />
              <Legend />
              <Bar yAxisId="left" dataKey="posiciones" name="Posiciones requeridas" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="cubiertos" name="Cubiertos (Sel.+Contrat.)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cobertura" name="Cobertura %" stroke="hsl(var(--primary))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Cancelled Vacancies Table */}
      {analytics.cancelledVacanciesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Ban className="h-5 w-5 text-destructive" />
              Vacantes canceladas con justificación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.cancelledVacanciesData.map((v: any, i: number) => (
                <div key={i} className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-foreground">{v.cargo}</p>
                    <span className="text-xs text-muted-foreground">{v.cancelledAt} · por {v.cancelledBy}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{v.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alertas de estancamiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 lg:grid-cols-2">
            {analytics.stagnationAlerts.length > 0 ? analytics.stagnationAlerts.map((candidate: any) => (
              <div key={candidate.id} className="rounded-md border border-warning/30 bg-warning-light/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">{candidate.vacancy} · {candidate.source}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-warning/30 text-warning">{candidate.stagnantDays} días</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>Estado: {candidate.status}</span>
                  <span>Sin avance ≥ 7 días</span>
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No hay candidatos en proceso sin avance durante 7 días o más.</p>
            )}
          </div>
        </CardContent>
      </Card>

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
                    <div key={label as string} className="rounded-md bg-background p-2">
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

        </TabsContent>

        <TabsContent value="infografias" className="mt-0">
          <SelectionInfographicsTab analytics={analytics} />
        </TabsContent>
      </Tabs>

      {/* ── Metrics Dictionary Modal ── */}
      <Dialog open={showMetricsDict} onOpenChange={setShowMetricsDict}>
        <DialogContent className="max-w-2xl h-[85dvh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <BookOpen className="h-5 w-5 text-primary" />
              Diccionario de Métricas — Analítica de Selección
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Aquí puedes entender qué significa cada indicador, de dónde viene la información y cómo leerlo.
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">

            {/* ── KPIs Generales ── */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <Info className="h-4 w-4" /> Indicadores generales
              </h3>
              <div className="space-y-3">
                {[
                  {
                    name: 'Requisiciones activas',
                    calc: 'Se cuentan todas las solicitudes de personal que todavía no han sido canceladas, rechazadas ni cerradas.',
                    ejemplo: 'Si hay 10 solicitudes y 2 fueron canceladas, el indicador muestra 8.',
                    note: 'Refleja cuántas necesidades de personal están pendientes de resolver.',
                  },
                  {
                    name: 'Vacantes abiertas',
                    calc: 'Se cuentan las vacantes que están en estado Abierta o En Proceso.',
                    ejemplo: 'Si se crearon 5 vacantes y 2 ya fueron cerradas, se muestran 3.',
                    note: 'Indica cuántos procesos de selección están activos en este momento.',
                  },
                  {
                    name: 'Posiciones publicadas',
                    calc: 'Se suman los cupos de todas las vacantes. Una vacante puede tener más de un cupo.',
                    ejemplo: 'Si hay 3 vacantes con 2, 1 y 4 cupos, el total es 7 posiciones.',
                    note: 'Es diferente al número de vacantes: una vacante puede necesitar varios empleados.',
                  },
                  {
                    name: 'Candidatos en proceso',
                    calc: 'Se cuentan los candidatos que aún no tienen un resultado final: ni contratados, ni descartados, ni desistidos.',
                    ejemplo: 'Un candidato en entrevista cuenta. Uno contratado o descartado ya no cuenta.',
                    note: 'Muestra cuántas personas están actualmente siendo evaluadas.',
                  },
                  {
                    name: 'Candidatos por vacante',
                    calc: 'Total de candidatos dividido entre el total de vacantes.',
                    ejemplo: 'Si hay 30 candidatos y 6 vacantes → 5 candidatos por vacante.',
                    note: 'Lo recomendable es tener 3 o más candidatos por vacante para poder elegir con criterio.',
                  },
                  {
                    name: 'Tasa de avance',
                    calc: 'Mide en promedio qué tan lejos llegan los candidatos dentro del proceso (desde la aplicación hasta la contratación).',
                    ejemplo: 'Si la mayoría llega hasta entrevistas pero casi nadie llega a oferta, la tasa baja.',
                    note: 'Cuanto más alta, mejor: significa que los candidatos avanzan por todo el proceso.',
                  },
                  {
                    name: 'Tiempo promedio de cobertura',
                    calc: 'Promedio de días que tomó cerrar las vacantes ya finalizadas (desde que se abrieron hasta que se cerraron).',
                    ejemplo: 'Si una vacante tardó 20 días y otra 30, el promedio es 25 días.',
                    note: 'Permite saber si los procesos de selección están siendo rápidos o lentos.',
                  },
                  {
                    name: 'Días abiertos (vacantes activas)',
                    calc: 'Promedio de días que llevan abiertas las vacantes que aún no se han cerrado.',
                    ejemplo: 'Si una vacante lleva 15 días abierta y otra 25, el promedio es 20 días.',
                    note: 'Alerta sobre vacantes que llevan mucho tiempo sin cubrirse.',
                  },
                ].map((m) => (
                  <div key={m.name} className="rounded-xl border bg-background p-4 space-y-2">
                    <p className="font-semibold text-foreground text-sm">{m.name}</p>
                    <p className="text-sm text-foreground/80"><span className="font-semibold">¿Cómo se calcula?</span> {m.calc}</p>
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground/70">Ejemplo:</span> {m.ejemplo}</p>
                    <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">{m.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Tasas y Conversión ── */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Tasas y conversión
              </h3>
              <div className="space-y-3">
                {[
                  {
                    name: 'Contratados',
                    calc: 'Candidatos que completaron el proceso y fueron oficialmente vinculados a la empresa.',
                    ejemplo: 'Si de 20 candidatos, 4 fueron contratados, este número es 4.',
                    note: 'Es el resultado final esperado de cada proceso de selección.',
                  },
                  {
                    name: 'Tasa de contratación',
                    calc: 'De cada 100 candidatos que aplican, cuántos terminan siendo contratados.',
                    ejemplo: '4 contratados de 20 candidatos = 20% de tasa de contratación.',
                    note: 'Una tasa del 15% o más se considera saludable.',
                  },
                  {
                    name: 'Tasa de selección',
                    calc: 'De cada 100 candidatos, cuántos fueron seleccionados o contratados.',
                    ejemplo: '2 seleccionados + 3 contratados de 20 = 25% de tasa de selección.',
                    note: 'Incluye tanto a los seleccionados (pendientes de contratar) como a los ya vinculados.',
                  },
                  {
                    name: 'Tasa de descarte global',
                    calc: 'De cada 100 candidatos, cuántos no continuaron en el proceso (ya sea descartados o desistidos).',
                    ejemplo: '5 descartados + 3 desistidos de 20 = 40% de descarte global.',
                    note: 'Permite ver qué tanto se está filtrando el proceso de selección.',
                  },
                  {
                    name: 'Tasa de descarte (Descartar)',
                    calc: 'Candidatos a quienes se les marcó como "No seleccionado" por el equipo de selección.',
                    ejemplo: '5 descartados de 20 candidatos = 25%.',
                    note: 'Incluye motivos como: no aprobó EMO, EDS, pruebas u otro motivo definido por el evaluador.',
                  },
                  {
                    name: 'Tasa de desistimiento',
                    calc: 'Candidatos que decidieron retirarse voluntariamente del proceso.',
                    ejemplo: '3 desistidos de 20 candidatos = 15%.',
                    note: 'Una tasa alta puede indicar problemas con el salario, la demora del proceso o la competencia del mercado.',
                  },
                  {
                    name: 'Cobertura real de posiciones',
                    calc: 'Por cada vacante, qué porcentaje de sus cupos han sido cubiertos con candidatos seleccionados o contratados.',
                    ejemplo: 'Una vacante con 4 cupos y 2 candidatos seleccionados tiene 50% de cobertura.',
                    note: 'Cuando llega al 100%, los botones de selección se bloquean automáticamente.',
                  },
                ].map((m) => (
                  <div key={m.name} className="rounded-xl border bg-background p-4 space-y-2">
                    <p className="font-semibold text-foreground text-sm">{m.name}</p>
                    <p className="text-sm text-foreground/80"><span className="font-semibold">¿Cómo se calcula?</span> {m.calc}</p>
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground/70">Ejemplo:</span> {m.ejemplo}</p>
                    <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">{m.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Motivos ── */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <UserMinus className="h-4 w-4" /> Motivos de descarte y desistimiento
              </h3>
              <div className="space-y-3">
                {[
                  { name: 'No aprobó EMO', calc: 'El candidato no superó el Examen Médico Ocupacional requerido para el cargo.', note: 'El evaluador registra este motivo al marcar al candidato como "Descartado".' },
                  { name: 'No aprobó EDS', calc: 'El candidato no aprobó el Estudio de Seguridad (verificación de antecedentes y referencias).', note: 'Es uno de los filtros más sensibles del proceso.' },
                  { name: 'No aprobó pruebas', calc: 'El candidato no alcanzó el puntaje mínimo en las pruebas de conocimiento o psicotécnicas.', note: 'Aplica a cargos que requieren validación técnica o psicológica.' },
                  { name: 'Otra oferta laboral', calc: 'El candidato recibió una oferta de otra empresa y decidió aceptarla.', note: 'Si este motivo es frecuente, puede indicar que el proceso tarda demasiado o que el salario no es competitivo.' },
                  { name: 'Motivos personales', calc: 'El candidato se retiró por razones personales que no están relacionadas con la empresa.', note: 'Puede incluir cambio de ciudad, situación familiar u otras circunstancias.' },
                  { name: 'Salario', calc: 'El candidato desistió porque el salario ofrecido no cumplía sus expectativas.', note: 'Una frecuencia alta de este motivo es una señal para revisar la propuesta de valor salarial.' },
                ].map((m) => (
                  <div key={m.name} className="rounded-xl border bg-background p-4 space-y-2">
                    <p className="font-semibold text-foreground text-sm">{m.name}</p>
                    <p className="text-sm text-foreground/80"><span className="font-semibold">¿Qué significa?</span> {m.calc}</p>
                    <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">{m.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Estados especiales ── */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <PauseCircle className="h-4 w-4" /> Estados especiales de vacante
              </h3>
              <div className="space-y-3">
                {[
                  {
                    name: 'Vacante pausada',
                    calc: 'El proceso de selección se pausó temporalmente. Los días que esté pausada no se cuentan en el tiempo de cobertura.',
                    ejemplo: 'Si una vacante lleva 10 días abierta, se pausa 5 días y se reactiva, solo cuenta 10 días (no 15).',
                    note: 'Útil cuando hay situaciones internas que impiden avanzar con el proceso sin que sea una cancelación.',
                  },
                  {
                    name: 'Vacante cancelada',
                    calc: 'La vacante fue cerrada antes de completarse, con un motivo registrado por el responsable.',
                    ejemplo: 'Se cancela una vacante porque el área ya no tiene presupuesto para el cargo.',
                    note: 'Toda cancelación queda registrada con fecha, responsable y justificación.',
                  },
                  {
                    name: 'Límite de selección por cupos',
                    calc: 'Cuando los cupos de una vacante ya están cubiertos (seleccionados + contratados = cupos totales), los botones de acción se desactivan automáticamente.',
                    ejemplo: 'Vacante con 2 cupos: si ya hay 2 candidatos seleccionados, no se puede seleccionar más.',
                    note: 'Evita asignar más candidatos de los que la empresa puede contratar para esa posición.',
                  },
                ].map((m) => (
                  <div key={m.name} className="rounded-xl border bg-background p-4 space-y-2">
                    <p className="font-semibold text-foreground text-sm">{m.name}</p>
                    <p className="text-sm text-foreground/80"><span className="font-semibold">¿Qué significa?</span> {m.calc}</p>
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground/70">Ejemplo:</span> {m.ejemplo}</p>
                    <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">{m.note}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Radar ── */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Índice de salud integral (gráfico de radar)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">Este gráfico muestra en qué dimensiones el proceso de selección está bien y en cuáles necesita atención. Cada eje va de 0 a 100.</p>
              <div className="space-y-3">
                {[
                  { name: 'Cobertura', calc: 'Qué porcentaje de las posiciones solicitadas han sido publicadas como vacantes.', note: '100% significa que todas las necesidades de personal ya tienen una vacante creada.' },
                  { name: 'Conversión', calc: 'De cada 100 candidatos que aplican, cuántos terminan siendo contratados (igual que la tasa de contratación).', note: 'Entre más alto, más eficiente es el proceso.' },
                  { name: 'Selección', calc: 'Qué tan bien el proceso identifica candidatos aptos (seleccionados + contratados respecto al total).', note: 'Un porcentaje bajo puede indicar que se están aplicando muchos candidatos poco calificados.' },
                  { name: 'Velocidad', calc: 'Qué tan rápido se están llenando las vacantes. Entre menos días lleven abiertas, mayor es este índice.', note: 'Una vacante de más de 50 días sin cerrarse reduce significativamente este indicador.' },
                  { name: 'Pipeline', calc: 'Qué tan surtida está la base de candidatos. Con 5 o más candidatos por vacante se llega al máximo (100%).', note: 'Un pipeline sano permite elegir al mejor candidato, no simplemente al único disponible.' },
                ].map((m) => (
                  <div key={m.name} className="rounded-xl border bg-background p-4 space-y-2">
                    <p className="font-semibold text-foreground text-sm">{m.name}</p>
                    <p className="text-sm text-foreground/80"><span className="font-semibold">¿Qué mide?</span> {m.calc}</p>
                    <p className="text-xs text-primary/80 italic border-l-2 border-primary/30 pl-2">{m.note}</p>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

