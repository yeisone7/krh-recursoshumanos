import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, eachDayOfInterval, differenceInCalendarDays, subMonths } from 'date-fns';
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
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BadgePercent,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Gauge,
  Moon,
  PieChart as PieChartIcon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useContracts } from '@/hooks/useContracts';
import { useEmployees } from '@/hooks/useEmployees';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { usePayrollNovelties } from '@/hooks/usePayrollNovelties';
import { useEmployeeTimeConfigs, useShiftAssignments, useShiftCycles, useShifts, useWorkSchedules } from '@/hooks/useSchedules';
import { cn } from '@/lib/utils';
import { DAY_NAMES_SHORT } from '@/types/schedule';
import { NOVELTY_TYPE_LABELS, type NoveltyType } from '@/types/payroll';

const chartColors = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--tertiary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--accent-foreground))',
];

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const formatCopInput = (value: number) => `COP ${integerFormatter.format(value || 0)}`;
const parseCopInput = (value: string) => Number(value.replace(/\D/g, '')) || 0;

const overtimeTypes = new Set<NoveltyType>(['hedo', 'heno', 'hedf', 'henf', 'rn', 'rnf', 'dominical_trabajado', 'festivo_trabajado']);
const absenceTypes = new Set<NoveltyType>(['incapacidad', 'vacaciones', 'permiso']);
const regularTypes = new Set<NoveltyType>(['jornada', 'descanso_remunerado']);

const alertStatusLabels = {
  pendiente: 'Pendiente',
  notificada: 'Notificada',
  cerrada: 'Cerrada',
};

const alertStatusStyles = {
  pendiente: 'bg-warning-light text-warning border-warning/20',
  notificada: 'bg-primary-light text-primary border-primary/20',
  cerrada: 'bg-success-light text-success border-success/20',
};

const defaultImpactMultiplier: Record<string, number> = {
  jornada: 1,
  hedo: 1.25,
  heno: 1.75,
  hedf: 1.75,
  henf: 2.1,
  rn: 0.35,
  rnf: 1.1,
  dominical_trabajado: 1.75,
  festivo_trabajado: 1.75,
  descanso_remunerado: 1,
  incapacidad: 1,
  vacaciones: 1,
  permiso: 1,
};

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function periodKey(value: string | null | undefined) {
  const date = asDate(value);
  if (!date) return 'Sin fecha';
  return format(startOfMonth(date), 'yyyy-MM-dd');
}

function periodLabel(key: string) {
  if (key === 'Sin fecha') return key;
  return format(new Date(`${key}T00:00:00`), 'MMM yy', { locale: es });
}

function shiftMonth(value: string, months: number) {
  const date = asDate(value);
  if (!date) return value;
  return format(subMonths(date, months), 'yyyy-MM-dd');
}

function hoursBetween(start?: string | null, end?: string | null, breakMinutes = 0) {
  if (!start || !end) return 0;
  const [sh, sm] = start.slice(0, 5).split(':').map(Number);
  const [eh, em] = end.slice(0, 5).split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 0;
  let minutes = eh * 60 + em - (sh * 60 + sm);
  if (minutes <= 0) minutes += 24 * 60;
  return Math.max(0, (minutes - breakMinutes) / 60);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function groupByName<T>(items: T[], getKey: (item: T) => string | null | undefined, getValue: (item: T) => number = () => 1) {
  return Object.entries(items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) || 'Sin clasificar';
    acc[key] = (acc[key] || 0) + getValue(item);
    return acc;
  }, {}))
    .map(([name, value]) => ({ name, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => b.value - a.value);
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
            <span>Indicador calculado con datos filtrados</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollInfographics({
  analytics,
  centerLabel,
  periodLabelText,
}: {
  analytics: any;
  centerLabel: string;
  periodLabelText: string;
}) {
  const kpis = analytics.kpis || {};
  const plannedHours = Math.max(1, Number(kpis.plannedHours || 0));
  const coverage = Math.min(100, Math.max(0, Number(kpis.coverage || 0)));
  const overtimeRate = Math.min(100, Math.max(0, Number(kpis.overtimeRate || 0)));
  const absenceRate = Math.min(100, Math.max(0, percent(Number(kpis.absenceHours || 0), plannedHours)));
  const pressureScore = Math.min(100, Math.round(((100 - coverage) * 0.35) + (overtimeRate * 1.35) + (absenceRate * 1.15)));
  const topTypes = (analytics.impactRankingByType || []).slice(0, 4);
  const topCenters = (analytics.impactRankingByCenter || []).slice(0, 4);
  const monthTrend = (analytics.monthlyTrend || []).slice(-5);
  const jornadaModes = (analytics.jornadaBreakdown || []).slice(0, 3);
  const heatmap = (analytics.heatmap || []).slice(-28);
  const insights = (analytics.insights || []).slice(0, 3);
  const alerts = (analytics.automaticAlerts || []).slice(0, 3);
  const maxCenterImpact = Math.max(1, ...topCenters.map((item: any) => Number(item.impact || 0)));
  const maxMonthNovelties = Math.max(1, ...monthTrend.map((item: any) => Number(item.novedades || 0)));
  const totalModeImpact = Math.max(1, jornadaModes.reduce((sum: number, item: any) => sum + Number(item.impacto || 0), 0));
  const palette = ['#0ea5e9', '#ec4899', '#f97316', '#7c3aed', '#10b981'];
  const overtimeEnd = Math.min(100, coverage + Math.max(4, overtimeRate));
  const absenceEnd = Math.min(100, overtimeEnd + Math.max(4, absenceRate));
  const sourceTotal = Math.max(1, (analytics.sourceMix || []).reduce((sum: number, item: any) => sum + Number(item.value || 0), 0));
  const noveltySourceTotal = Math.max(1, (analytics.noveltySourceMix || []).reduce((sum: number, item: any) => sum + Number(item.value || 0), 0));
  const maxTypeVolume = Math.max(1, ...topTypes.map((item: any) => Number(item.volumen || 0)));
  const maxTypeHours = Math.max(1, ...topTypes.map((item: any) => Number(item.horas || 0)));
  const sourceMix = analytics.sourceMix || [];
  const noveltyMix = analytics.noveltySourceMix || [];

  const executiveSignals = [
    {
      label: 'Cobertura',
      value: `${coverage}%`,
      detail: `${integerFormatter.format(Number(kpis.assignedWorkDays || 0))} jornadas asignadas`,
      icon: ShieldCheck,
      color: '#0ea5e9',
    },
    {
      label: 'Presion',
      value: `${pressureScore}%`,
      detail: 'Indice combinado de riesgo operativo',
      icon: Gauge,
      color: '#f97316',
    },
    {
      label: 'Impacto',
      value: currencyFormatter.format(Number(kpis.estimatedImpact || 0)),
      detail: `${integerFormatter.format(Number(kpis.totalNovelties || 0))} novedades liquidadas`,
      icon: BadgePercent,
      color: '#ec4899',
    },
    {
      label: 'Personas',
      value: integerFormatter.format(Number(kpis.impactedEmployees || 0)),
      detail: 'Empleados con afectacion en el periodo',
      icon: Users,
      color: '#7c3aed',
    },
  ];

  const commandControls = [
    {
      title: 'Horas programadas',
      value: integerFormatter.format(Number(kpis.plannedHours || 0)),
      detail: 'Carga base del periodo',
      pct: Math.min(100, percent(Number(kpis.plannedHours || 0), Number(kpis.plannedHours || 0) + Number(kpis.noveltyHours || 0))),
      icon: Clock,
      color: '#0ea5e9',
    },
    {
      title: 'Horas novedad',
      value: numberFormatter.format(Number(kpis.noveltyHours || 0)),
      detail: 'Eventos que afectan nomina',
      pct: Math.min(100, percent(Number(kpis.noveltyHours || 0), plannedHours)),
      icon: Activity,
      color: '#ec4899',
    },
    {
      title: 'Horas extra',
      value: numberFormatter.format(Number(kpis.overtimeHours || 0)),
      detail: 'Presion adicional',
      pct: overtimeRate,
      icon: Zap,
      color: '#f97316',
    },
    {
      title: 'Ausencias',
      value: numberFormatter.format(Number(kpis.absenceHours || 0)),
      detail: 'Incapacidades, permisos y vacaciones',
      pct: absenceRate,
      icon: AlertTriangle,
      color: '#ef4444',
    },
  ];

  const flowControls = [
    {
      title: 'Planear',
      metric: `${coverage}%`,
      detail: 'Cobertura de jornadas',
      color: '#0ea5e9',
      icon: CalendarDays,
    },
    {
      title: 'Detectar',
      metric: integerFormatter.format(Number(kpis.totalNovelties || 0)),
      detail: 'Novedades encontradas',
      color: '#ec4899',
      icon: Target,
    },
    {
      title: 'Priorizar',
      metric: topTypes[0]?.name || 'Sin novedades',
      detail: 'Mayor foco por impacto',
      color: '#7c3aed',
      icon: Workflow,
    },
    {
      title: 'Controlar',
      metric: `${pressureScore}%`,
      detail: 'Presion operativa',
      color: '#f97316',
      icon: Gauge,
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-border/80 bg-white">
        <CardContent className="p-0">
          <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="relative min-h-[440px] overflow-hidden bg-slate-50 p-5 sm:p-7">
              <div className="relative z-10 max-w-xl space-y-3">
                <Badge variant="outline" className="bg-primary-light text-primary border-primary/20">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Infografia de Nomina
                </Badge>
                <div>
                  <h2 className="text-2xl font-black leading-tight text-slate-950 sm:text-4xl">Radiografia operativa del periodo</h2>
                  <p className="mt-2 text-sm font-medium text-slate-600">{centerLabel} · {periodLabelText}</p>
                </div>
              </div>

              <div className="relative mx-auto mt-8 h-[310px] max-w-[560px]">
                <div className="absolute left-[18%] top-0 h-56 w-56 rounded-full bg-cyan-500 p-7 text-white shadow-xl sm:h-64 sm:w-64">
                  <Target className="mb-5 h-10 w-10" />
                  <p className="text-4xl font-black">{coverage}%</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em]">Cobertura</p>
                  <p className="mt-3 max-w-[13rem] text-xs font-medium text-white/85">Mide que tanto la programacion cubre la carga laboral registrada.</p>
                </div>
                <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-blue-700 p-7 text-white shadow-xl sm:h-64 sm:w-64">
                  <Briefcase className="mb-5 h-10 w-10" />
                  <p className="text-4xl font-black">{integerFormatter.format(Number(kpis.totalNovelties || 0))}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em]">Novedades</p>
                  <p className="mt-3 max-w-[13rem] text-xs font-medium text-white/85">Volumen real que afecta nomina, jornada y control del periodo.</p>
                </div>
                <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-500 p-7 text-white shadow-xl sm:h-64 sm:w-64">
                  <PieChartIcon className="mb-5 h-10 w-10" />
                  <p className="text-2xl font-black">{currencyFormatter.format(Number(kpis.estimatedImpact || 0))}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em]">Impacto</p>
                  <p className="mt-3 max-w-[13rem] text-xs font-medium text-white/85">Estimacion monetaria segun salario, tipo y horas reportadas.</p>
                </div>
                <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-slate-200 bg-white text-center shadow-xl">
                  <span className="text-5xl font-black text-slate-900">3</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">lecturas clave</span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 border-t border-border/70 bg-white p-5 sm:p-7 xl:border-l xl:border-t-0">
              {executiveSignals.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div key={signal.label} className="flex items-center gap-4 rounded-xl border border-border/80 bg-slate-50 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white shadow-sm" style={{ backgroundColor: signal.color }}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{signal.label}</p>
                      <p className="mt-1 text-xl font-black text-slate-950">{signal.value}</p>
                      <p className="text-xs font-medium text-slate-600">{signal.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" /> Centro de mando visual
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {commandControls.map((control) => {
              const Icon = control.icon;
              const ring = Math.max(3, Math.min(100, control.pct));
              return (
                <div key={control.title} className="relative overflow-hidden rounded-2xl border border-border/80 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{control.title}</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{control.value}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">{control.detail}</p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: control.color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full p-1" style={{ background: `conic-gradient(${control.color} 0 ${ring}%, #e2e8f0 ${ring}% 100%)` }}>
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-black text-slate-950">{Math.round(ring)}%</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full" style={{ width: `${ring}%`, backgroundColor: control.color }} />
                      </div>
                      <p className="mt-2 text-[11px] font-bold text-slate-500">Lectura porcentual sobre la carga filtrada</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgePercent className="h-5 w-5 text-primary" /> Panel de mezcla
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(sourceMix.length ? sourceMix : [{ name: 'Sin programacion', value: 0 }]).slice(0, 4).map((source: any, index: number) => (
                <div key={`program-${source.name}-${index}`} className="rounded-2xl border border-border/80 bg-slate-50 p-3 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: palette[index % palette.length] }}>
                    {percent(Number(source.value || 0), sourceTotal)}%
                  </div>
                  <p className="mt-2 truncate text-xs font-black uppercase text-slate-700">{source.name}</p>
                  <p className="text-[11px] font-medium text-slate-500">Programacion</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {(noveltyMix.length ? noveltyMix : [{ name: 'Sin novedades', value: 0 }]).slice(0, 4).map((source: any, index: number) => (
                <div key={`novelty-${source.name}-${index}`} className="grid grid-cols-[32px_1fr_44px] items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: palette[(index + 2) % palette.length] }}>{index + 1}</div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(5, percent(Number(source.value || 0), noveltySourceTotal))}%`, backgroundColor: palette[(index + 2) % palette.length] }} />
                  </div>
                  <span className="text-right text-xs font-black text-slate-950">{percent(Number(source.value || 0), noveltySourceTotal)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Workflow className="h-5 w-5 text-primary" /> Ruta visual de control de nomina
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {flowControls.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative overflow-hidden rounded-2xl border border-border/80 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white shadow-sm" style={{ backgroundColor: step.color }}>
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <Icon className="h-7 w-7" style={{ color: step.color }} />
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">{step.title}</p>
                  <p className="mt-2 min-h-[36px] text-xl font-black leading-tight text-slate-950">{step.metric}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{step.detail}</p>
                  <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: step.color }} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5 text-primary" /> Variables criticas
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {(topTypes.length ? topTypes : [{ name: 'Sin novedades', volumen: 0, horas: 0, impacto: 0 }]).map((item: any, index: number) => (
              <div key={`variable-${item.name}-${index}`} className="rounded-2xl border border-border/80 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-black text-white" style={{ backgroundColor: palette[index % palette.length] }}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <Badge variant="outline" className="bg-white">{integerFormatter.format(Number(item.volumen || 0))} casos</Badge>
                </div>
                <p className="min-h-[38px] text-sm font-black leading-tight text-slate-950">{item.name}</p>
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-[60px_1fr_44px] items-center gap-2 text-[11px] font-bold text-slate-600">
                    <span>Volumen</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(5, percent(Number(item.volumen || 0), maxTypeVolume))}%`, backgroundColor: palette[index % palette.length] }} />
                    </div>
                    <span className="text-right">{percent(Number(item.volumen || 0), maxTypeVolume)}%</span>
                  </div>
                  <div className="grid grid-cols-[60px_1fr_44px] items-center gap-2 text-[11px] font-bold text-slate-600">
                    <span>Horas</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(5, percent(Number(item.horas || 0), maxTypeHours))}%`, backgroundColor: palette[(index + 1) % palette.length] }} />
                    </div>
                    <span className="text-right">{numberFormatter.format(Number(item.horas || 0))}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs font-black text-slate-950">{currencyFormatter.format(Number(item.impacto || 0))}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" /> Comparativo de centros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {(topCenters.length ? topCenters : [{ name: 'Sin centro', impacto: 0, volumen: 0, empleados: 0 }]).map((center: any, index: number) => (
                <div key={`tile-center-${center.name}-${index}`} className="grid grid-cols-[54px_1fr] gap-3 rounded-2xl border border-border/80 bg-slate-50 p-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-black text-white" style={{ backgroundColor: palette[index % palette.length] }}>
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{center.name}</p>
                    <p className="text-xs font-medium text-slate-500">{integerFormatter.format(Number(center.volumen || 0))} novedades · {integerFormatter.format(Number(center.empleados || 0))} emp.</p>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(6, percent(Number(center.impacto || 0), maxCenterImpact))}%`, backgroundColor: palette[index % palette.length] }} />
                    </div>
                    <p className="mt-2 text-xs font-black text-slate-950">{currencyFormatter.format(Number(center.impacto || 0))}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-5 w-5 text-primary" /> Semaforo ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-[220px_1fr]">
            <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full p-4 shadow-inner" style={{ background: `conic-gradient(#0ea5e9 0 ${coverage}%, #f97316 ${coverage}% ${overtimeEnd}%, #ef4444 ${overtimeEnd}% ${absenceEnd}%, #e2e8f0 ${absenceEnd}% 100%)` }}>
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white text-center shadow-sm">
                <span className="text-4xl font-black text-slate-950">{pressureScore}%</span>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">presion</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Cobertura de jornada', value: coverage, color: '#0ea5e9' },
                { label: 'Tasa horas extra', value: overtimeRate, color: '#f97316' },
                { label: 'Ausentismo por horas', value: absenceRate, color: '#ef4444' },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-700">{item.label}</span>
                    <span className="font-black text-slate-950">{item.value}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(4, item.value)}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-border/80 bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-black text-slate-950">Lectura:</span> una presion alta combina baja cobertura, horas extra y ausencias; sirve para priorizar ajustes de turnos y novedades.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-5 w-5 text-primary" /> Flujo de prioridades por novedad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topTypes.length ? topTypes : [{ name: 'Sin novedades', volumen: 0, impacto: 0, horas: 0, prioridad: 'Baja' }]).map((item: any, index: number) => (
              <div key={`${item.name}-${index}`} className="grid gap-3 rounded-xl border border-border/80 bg-slate-50 p-3 sm:grid-cols-[72px_1fr_auto] sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-black text-white shadow-sm" style={{ backgroundColor: palette[index % palette.length] }}>
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-slate-950">{item.name}</p>
                    <Badge variant="outline" className="bg-white">{item.prioridad || 'Prioridad'}</Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-600">{numberFormatter.format(Number(item.horas || 0))} horas · {integerFormatter.format(Number(item.empleados || 0))} empleados impactados</p>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(6, percent(Number(item.impacto || 0), Math.max(1, Number(topTypes[0]?.impacto || 1))))}%`, backgroundColor: palette[index % palette.length] }} />
                  </div>
                </div>
                <p className="text-right text-sm font-black text-slate-950">{currencyFormatter.format(Number(item.impacto || 0))}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" /> Tendencia compacta del periodo
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-5">
            {(monthTrend.length ? monthTrend : [{ periodo: 'Sin datos', novedades: 0, montoEstimado: 0, empleadosImpactados: 0 }]).map((month: any, index: number) => (
              <div key={`${month.periodo}-${index}`} className="rounded-xl border border-border/80 bg-slate-50 p-3">
                <div className="flex h-32 items-end justify-center gap-2">
                  <div className="w-7 rounded-t-xl bg-sky-500" style={{ height: `${Math.max(10, percent(Number(month.novedades || 0), maxMonthNovelties))}%` }} />
                  <div className="w-7 rounded-t-xl bg-pink-500" style={{ height: `${Math.max(10, percent(Number(month.empleadosImpactados || 0), Math.max(1, Number(kpis.impactedEmployees || 1))))}%` }} />
                </div>
                <p className="mt-3 text-center text-xs font-black uppercase text-slate-700">{month.periodo}</p>
                <p className="text-center text-[11px] font-medium text-slate-500">{integerFormatter.format(Number(month.novedades || 0))} nov. · {currencyFormatter.format(Number(month.montoEstimado || 0))}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5 text-primary" /> Mezcla de jornada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(jornadaModes.length ? jornadaModes : [{ jornada: 'Sin clasificar', impacto: 0, empleados: 0 }]).map((mode: any, index: number) => (
              <div key={`${mode.jornada}-${index}`} className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: palette[index % palette.length] }}>
                  {percent(Number(mode.impacto || 0), totalModeImpact)}%
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-950">{mode.jornada}</p>
                  <p className="text-xs text-slate-500">{integerFormatter.format(Number(mode.empleados || 0))} empleados · {currencyFormatter.format(Number(mode.impacto || 0))}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" /> Centros con mayor impacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(topCenters.length ? topCenters : [{ name: 'Sin centro', impacto: 0, volumen: 0, empleados: 0 }]).map((center: any, index: number) => (
              <div key={`${center.name}-${index}`} className="rounded-xl border border-border/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{center.name}</p>
                    <p className="text-xs text-slate-500">{integerFormatter.format(Number(center.volumen || 0))} novedades · {integerFormatter.format(Number(center.empleados || 0))} empleados</p>
                  </div>
                  <p className="text-sm font-black text-slate-950">{currencyFormatter.format(Number(center.impacto || 0))}</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(6, percent(Number(center.impacto || 0), maxCenterImpact))}%`, backgroundColor: palette[index % palette.length] }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" /> Lecturas automaticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(insights.length ? insights : [{ title: 'Sin hallazgos', value: 'Estable', detail: 'No hay desviaciones relevantes con los filtros actuales.' }]).map((insight: any, index: number) => (
              <div key={`${insight.title}-${index}`} className="rounded-xl border border-border/80 bg-slate-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ backgroundColor: palette[index % palette.length] }}>{index + 1}</div>
                  <div>
                    <p className="text-sm font-black text-slate-950">{insight.title}: {insight.value}</p>
                    <p className="text-xs font-medium text-slate-600">{insight.detail}</p>
                  </div>
                </div>
              </div>
            ))}
            {alerts.map((alert: any, index: number) => (
              <div key={`${alert.id}-${index}`} className="rounded-xl border border-warning/30 bg-warning-light/40 p-3">
                <p className="text-sm font-black text-slate-950">{alert.tipo}</p>
                <p className="text-xs font-medium text-slate-600">{alert.periodo} · {alert.valor}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="h-5 w-5 text-primary" /> Origen de datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Programacion</p>
              {(analytics.sourceMix || []).map((source: any, index: number) => (
                <div key={`${source.name}-${index}`} className="mb-2 grid grid-cols-[92px_1fr_48px] items-center gap-2 text-xs">
                  <span className="truncate font-bold text-slate-700">{source.name}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(5, percent(Number(source.value || 0), sourceTotal))}%`, backgroundColor: palette[index % palette.length] }} />
                  </div>
                  <span className="text-right font-black">{percent(Number(source.value || 0), sourceTotal)}%</span>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Novedades</p>
              {(analytics.noveltySourceMix || []).map((source: any, index: number) => (
                <div key={`${source.name}-${index}`} className="mb-2 grid grid-cols-[92px_1fr_48px] items-center gap-2 text-xs">
                  <span className="truncate font-bold text-slate-700">{source.name}</span>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(5, percent(Number(source.value || 0), noveltySourceTotal))}%`, backgroundColor: palette[(index + 2) % palette.length] }} />
                  </div>
                  <span className="text-right font-black">{percent(Number(source.value || 0), noveltySourceTotal)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-5 w-5 text-primary" /> Mapa visual de intensidad reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {(heatmap.length ? heatmap : Array.from({ length: 14 }, (_, index) => ({ fecha: `D${index + 1}`, intensidad: 0, asignaciones: 0, novedades: 0 }))).map((day: any, index: number) => {
                const intensity = Number(day.intensidad || 0);
                const color = intensity >= 75 ? '#ef4444' : intensity >= 45 ? '#f97316' : intensity >= 20 ? '#0ea5e9' : '#cbd5e1';
                return (
                  <div key={`${day.fecha}-${index}`} className="min-h-[72px] rounded-xl border border-border/80 bg-slate-50 p-2">
                    <div className="h-4 rounded-full" style={{ width: `${Math.max(18, intensity)}%`, backgroundColor: color }} />
                    <p className="mt-2 text-xs font-black text-slate-950">{day.fecha}</p>
                    <p className="text-[11px] font-medium text-slate-500">{intensity}% · {integerFormatter.format(Number(day.novedades || 0))} nov.</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnaliticaNomina() {
  const defaultStart = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const defaultEnd = format(new Date(), 'yyyy-MM-dd');
  const [centerFilter, setCenterFilter] = useState('all');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [comparisonMode, setComparisonMode] = useState<'actual' | 'mes_anterior'>('actual');
  const [volumeThreshold, setVolumeThreshold] = useState(10);
  const [severityThreshold, setSeverityThreshold] = useState(1000000);
  const [selectedAlertType, setSelectedAlertType] = useState<NoveltyType>('hedo');
  const [selectedAlertCenter, setSelectedAlertCenter] = useState('all');
  const [typeAlertThresholds, setTypeAlertThresholds] = useState<Record<string, { volume: number; severity: number }>>({});
  const [centerAlertThresholds, setCenterAlertThresholds] = useState<Record<string, { volume: number; severity: number }>>({});
  const [alertStatusOverrides, setAlertStatusOverrides] = useState<Record<string, 'pendiente' | 'notificada' | 'cerrada'>>({});
  const [alertCloseReasons, setAlertCloseReasons] = useState<Record<string, string>>({});
  const [closingAlert, setClosingAlert] = useState<{ id: string; tipo: string } | null>(null);
  const [closeReasonDraft, setCloseReasonDraft] = useState('');
  const comparisonStartDate = startDate ? shiftMonth(startDate, 1) : '';
  const comparisonEndDate = endDate ? shiftMonth(endDate, 1) : '';

  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: contracts = [], isLoading: loadingContracts } = useContracts();
  const { data: payrollConfig, isLoading: loadingPayrollConfig } = usePayrollConfig();
  const { data: workSchedules = [], isLoading: loadingSchedules } = useWorkSchedules();
  const { data: shifts = [], isLoading: loadingShifts } = useShifts();
  const { data: shiftCycles = [], isLoading: loadingCycles } = useShiftCycles();
  const { data: timeConfigs = [], isLoading: loadingConfigs } = useEmployeeTimeConfigs();
  const { data: assignments = [], isLoading: loadingAssignments } = useShiftAssignments({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    centerId: centerFilter === 'all' ? undefined : centerFilter,
  });
  const { data: comparisonAssignments = [], isLoading: loadingComparisonAssignments } = useShiftAssignments({
    startDate: comparisonMode === 'mes_anterior' ? comparisonStartDate || undefined : undefined,
    endDate: comparisonMode === 'mes_anterior' ? comparisonEndDate || undefined : undefined,
    centerId: centerFilter === 'all' ? undefined : centerFilter,
  });
  const { data: novelties = [], isLoading: loadingNovelties } = usePayrollNovelties({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: comparisonNovelties = [], isLoading: loadingComparisonNovelties } = usePayrollNovelties({
    startDate: comparisonMode === 'mes_anterior' ? comparisonStartDate || undefined : undefined,
    endDate: comparisonMode === 'mes_anterior' ? comparisonEndDate || undefined : undefined,
  });

  const isLoading = loadingEmployees || loadingContracts || loadingPayrollConfig || loadingSchedules || loadingShifts || loadingCycles || loadingConfigs || loadingAssignments || loadingComparisonAssignments || loadingNovelties || loadingComparisonNovelties;

  const centerOptions = useMemo(() => {
    const centers = new Map<string, string>();
    employees.forEach((employee: any) => {
      const center = employee.operation_centers || employee.work_info?.operation_centers;
      if (center?.id) centers.set(center.id, center.name || 'Centro sin nombre');
    });
    return Array.from(centers, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const employeeCenterMap = useMemo(() => new Map(employees.map((employee: any) => [employee.id, employee.work_info?.operation_center_id || employee.operation_centers?.id || null])), [employees]);

  const centerNameMap = useMemo(() => new Map(centerOptions.map((center) => [center.id, center.name])), [centerOptions]);

  const selectedAlertTypeKey = NOVELTY_TYPE_LABELS[selectedAlertType] || selectedAlertType;
  const selectedAlertCenterKey = selectedAlertCenter === 'all' ? 'Sin centro' : centerNameMap.get(selectedAlertCenter) || 'Sin centro';
  const selectedTypeSeverity = typeAlertThresholds[selectedAlertTypeKey]?.severity ?? severityThreshold;
  const selectedCenterSeverity = centerAlertThresholds[selectedAlertCenterKey]?.severity ?? severityThreshold;
  const severityValidationMessage = 'La severidad mínima debe ser mayor a COP 0.';

  const updateTypeAlertThreshold = (field: 'volume' | 'severity', value: number) => {
    setTypeAlertThresholds((prev) => ({
      ...prev,
      [selectedAlertTypeKey]: {
        volume: prev[selectedAlertTypeKey]?.volume ?? volumeThreshold,
        severity: prev[selectedAlertTypeKey]?.severity ?? severityThreshold,
        [field]: value,
      },
    }));
  };

  const updateCenterAlertThreshold = (field: 'volume' | 'severity', value: number) => {
    setCenterAlertThresholds((prev) => ({
      ...prev,
      [selectedAlertCenterKey]: {
        volume: prev[selectedAlertCenterKey]?.volume ?? volumeThreshold,
        severity: prev[selectedAlertCenterKey]?.severity ?? severityThreshold,
        [field]: value,
      },
    }));
  };

  const openCloseReasonDialog = (alert: { id: string; tipo: string }) => {
    setClosingAlert(alert);
    setCloseReasonDraft(alertCloseReasons[alert.id] || '');
  };

  const confirmCloseWithReason = () => {
    const reason = closeReasonDraft.trim().slice(0, 500);
    if (!closingAlert || reason.length < 3) return;
    setAlertStatusOverrides((prev) => ({ ...prev, [closingAlert.id]: 'cerrada' }));
    setAlertCloseReasons((prev) => ({ ...prev, [closingAlert.id]: reason }));
    setClosingAlert(null);
    setCloseReasonDraft('');
  };

  const salaryByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    contracts.forEach((contract: any) => {
      const salary = Number(contract.salary || 0);
      if (contract.employee_id && salary > 0 && !map.has(contract.employee_id)) map.set(contract.employee_id, salary);
    });
    return map;
  }, [contracts]);

  const filteredNovelties = useMemo(() => novelties.filter((novelty: any) => {
    if (centerFilter === 'all') return true;
    return employeeCenterMap.get(novelty.employee_id) === centerFilter;
  }), [novelties, centerFilter, employeeCenterMap]);

  const filteredComparisonNovelties = useMemo(() => comparisonNovelties.filter((novelty: any) => {
    if (centerFilter === 'all') return true;
    return employeeCenterMap.get(novelty.employee_id) === centerFilter;
  }), [comparisonNovelties, centerFilter, employeeCenterMap]);

  const filteredConfigs = useMemo(() => timeConfigs.filter((config: any) => {
    if (centerFilter === 'all') return true;
    return employeeCenterMap.get(config.employee_id) === centerFilter;
  }), [timeConfigs, centerFilter, employeeCenterMap]);

  const analytics = useMemo(() => {
    const activeSchedules = workSchedules.filter((item: any) => item.is_active);
    const activeShifts = shifts.filter((item: any) => item.is_active);
    const activeCycles = shiftCycles.filter((item: any) => item.is_active);
    const activeConfigs = filteredConfigs.filter((item: any) => item.is_active);
    const days = startDate && endDate ? Math.max(1, differenceInCalendarDays(new Date(`${endDate}T00:00:00`), new Date(`${startDate}T00:00:00`)) + 1) : 0;
    const activeEmployeeCount = new Set(activeConfigs.map((item: any) => item.employee_id)).size;
    const expectedAssignments = activeEmployeeCount * days;
    const assignedWorkDays = assignments.filter((item: any) => !item.shifts?.is_rest_day).length;
    const restDays = assignments.filter((item: any) => item.shifts?.is_rest_day).length;
    const manualAssignments = assignments.filter((item: any) => item.source === 'manual').length;
    const generatedAssignments = assignments.filter((item: any) => item.source === 'cycle').length;
    const plannedHours = assignments.reduce((sum: number, item: any) => sum + (item.shifts?.is_rest_day ? 0 : hoursBetween(item.shifts?.start_time, item.shifts?.end_time, item.shifts?.break_minutes || 0)), 0);
    const averageMonthlySalary = salaryByEmployee.size ? Array.from(salaryByEmployee.values()).reduce((sum, salary) => sum + salary, 0) / salaryByEmployee.size : 0;
    const fallbackHourlyRate = averageMonthlySalary ? averageMonthlySalary / Math.max(1, (payrollConfig?.daily_hours || 8) * 30) : 0;
    const getEstimatedImpact = (item: any) => {
      const salary = salaryByEmployee.get(item.employee_id) || averageMonthlySalary;
      const hourlyRate = salary ? salary / Math.max(1, (payrollConfig?.daily_hours || 8) * 30) : fallbackHourlyRate;
      const multiplier = defaultImpactMultiplier[item.novelty_type] ?? 1;
      return Number(item.hours || 0) * hourlyRate * multiplier;
    };
    const buildMonthlyTrend = (sourceAssignments: any[], sourceNovelties: any[], suffix = '') => {
      const keys = new Set<string>();
      sourceAssignments.forEach((item: any) => keys.add(periodKey(item.assignment_date)));
      sourceNovelties.forEach((item: any) => keys.add(periodKey(item.novelty_date)));
      return Array.from(keys).sort().map((key) => {
        const monthAssignments = sourceAssignments.filter((item: any) => periodKey(item.assignment_date) === key);
        const monthNovelties = sourceNovelties.filter((item: any) => periodKey(item.novelty_date) === key);
        const currentCount = monthNovelties.length;
        const previousMonthKey = shiftMonth(key, 1);
        const previousCount = sourceNovelties.filter((item: any) => periodKey(item.novelty_date) === previousMonthKey).length;
        return {
          periodo: `${periodLabel(key)}${suffix}`,
          periodoBase: periodLabel(key),
          asignaciones: monthAssignments.length,
          jornadas: monthAssignments.filter((item: any) => !item.shifts?.is_rest_day).length,
          descansos: monthAssignments.filter((item: any) => item.shifts?.is_rest_day).length,
          novedades: currentCount,
          altasNovedades: Math.max(0, currentCount - previousCount),
          bajasNovedades: Math.max(0, previousCount - currentCount),
          empleadosImpactados: new Set(monthNovelties.map((item: any) => item.employee_id)).size,
          horasPorJornada: Math.round((monthNovelties.reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0) / Math.max(1, monthAssignments.filter((item: any) => !item.shifts?.is_rest_day).length)) * 10) / 10,
          montoEstimado: Math.round(monthNovelties.reduce((sum: number, item: any) => sum + getEstimatedImpact(item), 0)),
          horasExtra: Math.round(monthNovelties.filter((item: any) => overtimeTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0) * 10) / 10,
          ausencias: Math.round(monthNovelties.filter((item: any) => absenceTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0) * 10) / 10,
        };
      });
    };
    const noveltyHours = filteredNovelties.reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0);
    const estimatedImpact = filteredNovelties.reduce((sum: number, item: any) => sum + getEstimatedImpact(item), 0);
    const overtimeHours = filteredNovelties.filter((item: any) => overtimeTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0);
    const absenceHours = filteredNovelties.filter((item: any) => absenceTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0);
    const regularHours = filteredNovelties.filter((item: any) => regularTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0);
    const coverage = percent(assignments.length, expectedAssignments);
    const overtimeRate = percent(overtimeHours, Math.max(1, plannedHours + overtimeHours));
    const absenceRate = percent(absenceHours, Math.max(1, plannedHours));

    const monthlyTrend = buildMonthlyTrend(assignments, filteredNovelties);
    const comparisonMonthlyTrend = buildMonthlyTrend(comparisonAssignments, filteredComparisonNovelties, ' ant.');
    const historicalAverageNovelties = monthlyTrend.length ? monthlyTrend.reduce((sum, month) => sum + month.novedades, 0) / monthlyTrend.length : 0;
    const historicalAverageImpact = monthlyTrend.length ? monthlyTrend.reduce((sum, month) => sum + month.montoEstimado, 0) / monthlyTrend.length : 0;

    const weekdayBehavior = Array.from({ length: 7 }, (_, day) => {
      const dayAssignments = assignments.filter((item: any) => asDate(item.assignment_date)?.getDay() === day);
      const dayNovelties = filteredNovelties.filter((item: any) => asDate(item.novelty_date)?.getDay() === day);
      return {
        dia: DAY_NAMES_SHORT[day],
        asignaciones: dayAssignments.length,
        novedades: dayNovelties.length,
        horasExtra: Math.round(dayNovelties.filter((item: any) => overtimeTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0) * 10) / 10,
        ausencias: Math.round(dayNovelties.filter((item: any) => absenceTypes.has(item.novelty_type)).reduce((sum: number, item: any) => sum + Number(item.hours || 0), 0) * 10) / 10,
      };
    });

    const noveltyTypes = groupByName(filteredNovelties, (item: any) => NOVELTY_TYPE_LABELS[item.novelty_type as NoveltyType] || item.novelty_type);
    const noveltyHoursByType = groupByName(filteredNovelties, (item: any) => NOVELTY_TYPE_LABELS[item.novelty_type as NoveltyType] || item.novelty_type, (item: any) => Number(item.hours || 0));
    const estimatedImpactByType = groupByName(filteredNovelties, (item: any) => NOVELTY_TYPE_LABELS[item.novelty_type as NoveltyType] || item.novelty_type, getEstimatedImpact);
    const employeeModeMap = new Map(activeConfigs.map((item: any) => [item.employee_id, item.mode === 'shift' ? 'Turnos' : 'Oficina']));
    const jornadaBreakdown = Object.values(filteredNovelties.reduce<Record<string, any>>((acc, item: any) => {
      const jornada = employeeModeMap.get(item.employee_id) || 'Sin jornada';
      if (!acc[jornada]) acc[jornada] = { jornada, horas: 0, novedades: 0, impacto: 0, empleados: new Set<string>() };
      acc[jornada].horas += Number(item.hours || 0);
      acc[jornada].novedades += 1;
      acc[jornada].impacto += getEstimatedImpact(item);
      acc[jornada].empleados.add(item.employee_id);
      return acc;
    }, {})).map((item: any) => ({
      ...item,
      horas: Math.round(item.horas * 10) / 10,
      impacto: Math.round(item.impacto),
      proporcionImpacto: percent(item.impacto, estimatedImpact),
      empleados: item.empleados.size,
    })).sort((a: any, b: any) => b.impacto - a.impacto);
    const jornadaHeatmap = noveltyTypes.slice(0, 6).map((type) => {
      const row: any = { tipo: type.name };
      jornadaBreakdown.forEach((jornada: any) => {
        const impact = filteredNovelties
          .filter((item: any) => (NOVELTY_TYPE_LABELS[item.novelty_type as NoveltyType] || item.novelty_type) === type.name && (employeeModeMap.get(item.employee_id) || 'Sin jornada') === jornada.jornada)
          .reduce((sum: number, item: any) => sum + getEstimatedImpact(item), 0);
        row[jornada.jornada] = Math.round(impact);
        row[`${jornada.jornada}Pct`] = percent(impact, estimatedImpact);
      });
      return row;
    });
    const resolveThresholds = (scope: 'type' | 'center', key: string) => {
      const overrides = scope === 'type' ? typeAlertThresholds[key] : centerAlertThresholds[key];
      return {
        volume: overrides?.volume ?? volumeThreshold,
        severity: overrides?.severity ?? severityThreshold,
      };
    };
    const buildImpactRanking = (getKey: (item: any) => string, scope: 'type' | 'center') => Object.values(filteredNovelties.reduce<Record<string, any>>((acc, item: any) => {
      const name = getKey(item);
      if (!acc[name]) acc[name] = { name, volumen: 0, horas: 0, impacto: 0, empleados: new Set<string>() };
      acc[name].volumen += 1;
      acc[name].horas += Number(item.hours || 0);
      acc[name].impacto += getEstimatedImpact(item);
      acc[name].empleados.add(item.employee_id);
      return acc;
    }, {})).map((item: any) => {
      const thresholds = resolveThresholds(scope, item.name);
      return {
        ...item,
        horas: Math.round(item.horas * 10) / 10,
        impacto: Math.round(item.impacto),
        empleados: item.empleados.size,
        volumeThreshold: thresholds.volume,
        severityThreshold: thresholds.severity,
        prioridad: item.volumen >= thresholds.volume && item.impacto >= thresholds.severity ? 'Crítica' : item.volumen >= thresholds.volume || item.impacto >= thresholds.severity ? 'Alta' : 'Normal',
      };
    }).sort((a: any, b: any) => b.impacto - a.impacto || b.volumen - a.volumen).slice(0, 8);
    const impactRankingByType = buildImpactRanking((item: any) => NOVELTY_TYPE_LABELS[item.novelty_type as NoveltyType] || item.novelty_type || 'Sin tipo', 'type');
    const impactRankingByCenter = buildImpactRanking((item: any) => centerNameMap.get(employeeCenterMap.get(item.employee_id) as string) || 'Sin centro', 'center');
    const shiftDistributionTrend = monthlyTrend.map((month) => ({
      periodo: month.periodo,
      jornadas: month.jornadas,
      descansos: month.descansos,
      manual: assignments.filter((item: any) => periodLabel(periodKey(item.assignment_date)) === month.periodo && item.source === 'manual').length,
      ciclo: assignments.filter((item: any) => periodLabel(periodKey(item.assignment_date)) === month.periodo && item.source === 'cycle').length,
    }));
    const impactEvolution = monthlyTrend.map((month, index) => ({
      periodo: month.periodo,
      impactoActual: month.montoEstimado,
      impactoMesAnterior: comparisonMode === 'mes_anterior' ? comparisonMonthlyTrend[index]?.montoEstimado || 0 : undefined,
      variacion: comparisonMode === 'mes_anterior' ? month.montoEstimado - (comparisonMonthlyTrend[index]?.montoEstimado || 0) : month.montoEstimado - (monthlyTrend[index - 1]?.montoEstimado || 0),
    }));
    const shiftDemand = groupByName(assignments, (item: any) => item.shifts?.name || (item.shifts?.is_rest_day ? 'Descanso' : 'Sin turno')).slice(0, 8);
    const sourceMix = groupByName(assignments, (item: any) => item.source === 'cycle' ? 'Ciclo automático' : 'Manual');
    const noveltySourceMix = groupByName(filteredNovelties, (item: any) => item.source === 'auto' ? 'Automático' : 'Manual');
    const modeMix = groupByName(activeConfigs, (item: any) => item.mode === 'shift' ? 'Turnos rotativos' : 'Horario administrativo');

    const employeeNoveltyHours = groupByName(filteredNovelties, (item: any) => {
      const employee = item.employees_v2;
      return employee ? `${employee.first_name} ${employee.last_name}` : 'Sin empleado';
    }, (item: any) => Number(item.hours || 0)).slice(0, 6);

    const dailyDates = startDate && endDate ? eachDayOfInterval({ start: new Date(`${startDate}T00:00:00`), end: new Date(`${endDate}T00:00:00`) }) : [];
    const heatmap = dailyDates.slice(-35).map((date) => {
      const key = format(date, 'yyyy-MM-dd');
      const dayAssignments = assignments.filter((item: any) => item.assignment_date === key).length;
      const dayNovelties = filteredNovelties.filter((item: any) => item.novelty_date === key).length;
      return {
        fecha: format(date, 'd MMM', { locale: es }),
        intensidad: Math.min(100, Math.round(((dayAssignments + dayNovelties * 2) / Math.max(1, activeEmployeeCount)) * 100)),
        asignaciones: dayAssignments,
        novedades: dayNovelties,
      };
    });

    const employeesWithAssignments = new Set(assignments.map((item: any) => item.employee_id));
    const withoutAssignments = activeConfigs.filter((item: any) => !employeesWithAssignments.has(item.employee_id)).length;
    const avgNoveltyHours = filteredNovelties.length ? noveltyHours / Math.max(1, new Set(filteredNovelties.map((item: any) => item.employee_id)).size) : 0;
    const highLoadEmployees = employeeNoveltyHours.filter((item) => item.value > Math.max(8, avgNoveltyHours * 1.3)).length;

    const insights = [
      {
        title: 'Cobertura de programación',
        value: `${coverage}%`,
        tone: coverage >= 85 ? 'success' : coverage >= 60 ? 'warning' : 'destructive',
        detail: `${integerFormatter.format(assignments.length)} asignaciones sobre ${integerFormatter.format(expectedAssignments)} esperadas`,
      },
      {
        title: 'Presión por horas extra',
        value: `${overtimeRate}%`,
        tone: overtimeRate <= 8 ? 'success' : overtimeRate <= 18 ? 'warning' : 'destructive',
        detail: `${numberFormatter.format(overtimeHours)} horas extra registradas`,
      },
      {
        title: 'Ausentismo operativo',
        value: `${absenceRate}%`,
        tone: absenceRate <= 4 ? 'success' : absenceRate <= 10 ? 'warning' : 'destructive',
        detail: `${numberFormatter.format(absenceHours)} horas por incapacidades, vacaciones o permisos`,
      },
    ];

    const thresholdAlerts = [...impactRankingByType, ...impactRankingByCenter]
      .filter((item: any) => item.prioridad !== 'Normal')
      .slice(0, 6)
      .map((item: any) => `${item.prioridad}: ${item.name} supera umbral con ${item.volumen} novedades y ${currencyFormatter.format(item.impacto)} estimados.`);
    const automaticAlerts = [
      ...monthlyTrend.flatMap((month, index) => {
        const previous = monthlyTrend[index - 1];
        const noveltyVariation = previous ? percent(Math.abs(month.novedades - previous.novedades), Math.max(1, previous.novedades)) : 0;
        const impactVariation = previous ? percent(Math.abs(month.montoEstimado - previous.montoEstimado), Math.max(1, previous.montoEstimado)) : 0;
        return [
          month.novedades >= Math.max(volumeThreshold, historicalAverageNovelties * 1.6) && month.novedades > 0 ? {
            id: `pico-novedades-${month.periodo}`,
            tipo: 'Pico inusual de novedades',
            severidad: month.novedades >= historicalAverageNovelties * 2 ? 'Crítica' : 'Alta',
            estado: 'pendiente' as const,
            periodo: month.periodo,
            detalle: `${month.novedades} novedades frente a un promedio de ${numberFormatter.format(historicalAverageNovelties)}.`,
            valor: `${month.novedades} novedades`,
          } : null,
          previous && noveltyVariation >= 45 && month.novedades !== previous.novedades ? {
            id: `variacion-novedades-${month.periodo}`,
            tipo: 'Variación brusca mes a mes',
            severidad: noveltyVariation >= 80 ? 'Crítica' : 'Alta',
            estado: 'pendiente' as const,
            periodo: month.periodo,
            detalle: `${month.novedades > previous.novedades ? 'Aumento' : 'Disminución'} de ${noveltyVariation}% contra ${previous.periodo}.`,
            valor: `${month.novedades - previous.novedades > 0 ? '+' : ''}${month.novedades - previous.novedades}`,
          } : null,
          previous && impactVariation >= 50 && month.montoEstimado > Math.max(severityThreshold, historicalAverageImpact) ? {
            id: `variacion-impacto-${month.periodo}`,
            tipo: 'Variación brusca de impacto',
            severidad: impactVariation >= 100 ? 'Crítica' : 'Alta',
            estado: 'pendiente' as const,
            periodo: month.periodo,
            detalle: `Impacto cambia ${impactVariation}% contra ${previous.periodo}.`,
            valor: currencyFormatter.format(month.montoEstimado),
          } : null,
        ];
      }),
      coverage > 0 && coverage < 70 ? {
        id: 'empate-cobertura-baja',
        tipo: 'Empate de cobertura',
        severidad: coverage < 50 ? 'Crítica' : 'Alta',
        estado: 'pendiente' as const,
        periodo: `${periodLabel(periodKey(startDate))} - ${periodLabel(periodKey(endDate))}`,
        detalle: `Cobertura en ${coverage}% con ${withoutAssignments} empleados sin asignación detectada.`,
        valor: `${coverage}%`,
      } : null,
      manualAssignments > generatedAssignments && generatedAssignments > 0 ? {
        id: 'empate-cobertura-manual-ciclo',
        tipo: 'Empate de cobertura',
        severidad: manualAssignments > generatedAssignments * 1.5 ? 'Alta' : 'Media',
        estado: 'notificada' as const,
        periodo: `${periodLabel(periodKey(startDate))} - ${periodLabel(periodKey(endDate))}`,
        detalle: `Programación manual supera ciclo automático: ${manualAssignments} vs ${generatedAssignments}.`,
        valor: `${percent(manualAssignments, assignments.length)}% manual`,
      } : null,
    ].filter(Boolean) as Array<{ id: string; tipo: string; severidad: string; estado: 'pendiente' | 'notificada' | 'cerrada'; periodo: string; detalle: string; valor: string }>;
    const alerts = [
      withoutAssignments > 0 ? `${withoutAssignments} empleados activos en tiempo no tienen asignaciones en el rango.` : null,
      highLoadEmployees > 0 ? `${highLoadEmployees} empleados concentran una carga alta de novedades.` : null,
      restDays > assignedWorkDays * 0.35 ? 'La proporción de descansos programados supera el patrón esperado.' : null,
      manualAssignments > generatedAssignments && assignments.length > 0 ? 'Predomina la programación manual sobre ciclos automáticos.' : null,
      ...thresholdAlerts,
    ].filter(Boolean) as string[];

    return {
      kpis: {
        activeSchedules: activeSchedules.length,
        activeShifts: activeShifts.length,
        activeCycles: activeCycles.length,
        activeEmployeeCount,
        assignedWorkDays,
        plannedHours: Math.round(plannedHours),
        noveltyHours: Math.round(noveltyHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        absenceHours: Math.round(absenceHours * 10) / 10,
        regularHours: Math.round(regularHours * 10) / 10,
        totalNovelties: filteredNovelties.length,
        impactedEmployees: new Set(filteredNovelties.map((item: any) => item.employee_id)).size,
        hoursPerWorkday: Math.round((noveltyHours / Math.max(1, assignedWorkDays)) * 10) / 10,
        estimatedImpact: Math.round(estimatedImpact),
        coverage,
        overtimeRate,
      },
      monthlyTrend,
      comparisonMonthlyTrend,
      shiftDistributionTrend,
      impactEvolution,
      weekdayBehavior,
      noveltyTypes,
      noveltyHoursByType,
      estimatedImpactByType,
      jornadaBreakdown,
      jornadaHeatmap,
      impactRankingByType,
      impactRankingByCenter,
      shiftDemand,
      sourceMix,
      noveltySourceMix,
      modeMix,
      employeeNoveltyHours,
      heatmap,
      insights,
      alerts,
      automaticAlerts,
    };
  }, [assignments, centerAlertThresholds, centerNameMap, comparisonAssignments, comparisonMode, employeeCenterMap, filteredComparisonNovelties, filteredConfigs, filteredNovelties, payrollConfig?.daily_hours, salaryByEmployee, severityThreshold, shiftCycles, shifts, startDate, endDate, typeAlertThresholds, volumeThreshold, workSchedules]);

  const selectedCenterLabel = centerFilter === 'all' ? 'Todos los centros' : centerNameMap.get(centerFilter) || 'Centro seleccionado';
  const selectedPeriodLabel = `${asDate(startDate) ? format(asDate(startDate) as Date, 'dd MMM yyyy', { locale: es }) : 'Sin inicio'} - ${asDate(endDate) ? format(asDate(endDate) as Date, 'dd MMM yyyy', { locale: es }) : 'Sin fin'}`;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground">Analítica de Nómina</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Tendencias, comportamientos y control operativo de Jornadas y Novedades</p>
        </div>
        <Badge variant="outline" className="w-fit bg-primary-light text-primary border-primary/20">
          <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Datos en tiempo real
        </Badge>
      </motion.div>

      <Card>
        <CardContent className="p-3 sm:p-4">
          <Accordion type="multiple" defaultValue={["periodo"]} className="space-y-2">
            <AccordionItem value="periodo" className="rounded-md border border-border px-3">
              <AccordionTrigger className="py-3 text-sm hover:no-underline">
                <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /> Filtros del periodo</span>
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 pb-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 sm:col-span-2 xl:col-span-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Filter className="h-4 w-4" /> Centro</div>
                  <Select value={centerFilter} onValueChange={setCenterFilter}>
                    <SelectTrigger><SelectValue placeholder="Todos los centros" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los centros</SelectItem>
                      {centerOptions.map((center) => <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:col-span-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CalendarDays className="h-4 w-4" /> Desde</div>
                    <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><CalendarDays className="h-4 w-4" /> Hasta</div>
                    <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><TrendingUp className="h-4 w-4" /> Comparación</div>
                  <Select value={comparisonMode} onValueChange={(value: 'actual' | 'mes_anterior') => setComparisonMode(value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actual">Solo período actual</SelectItem>
                      <SelectItem value="mes_anterior">Contra mes anterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="alertas" className="rounded-md border border-border px-3">
              <AccordionTrigger className="py-3 text-sm hover:no-underline">
                <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" /> Configuración de alertas</span>
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 pb-3 xl:grid-cols-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Volumen global</div>
                    <Input type="number" min={1} value={volumeThreshold} onChange={(event) => setVolumeThreshold(Number(event.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><DollarSign className="h-4 w-4" /> Severidad global</div>
                    <Input inputMode="numeric" value={formatCopInput(severityThreshold)} onChange={(event) => setSeverityThreshold(parseCopInput(event.target.value))} aria-label="Severidad global en pesos colombianos" aria-invalid={severityThreshold <= 0} className={cn(severityThreshold <= 0 && 'border-destructive focus-visible:ring-destructive')} />
                    {severityThreshold <= 0 && <p className="text-xs text-destructive">{severityValidationMessage}</p>}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:col-span-2">
                  <div className="space-y-2 rounded-md border border-border/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><AlertTriangle className="h-4 w-4" /> Por tipo de novedad</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select value={selectedAlertType} onValueChange={(value: NoveltyType) => setSelectedAlertType(value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(NOVELTY_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                      </Select>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Volumen mínimo</span>
                        <Input type="number" min={1} placeholder="Ej. 10 novedades" aria-label="Volumen mínimo por tipo" value={typeAlertThresholds[selectedAlertTypeKey]?.volume ?? volumeThreshold} onChange={(event) => updateTypeAlertThreshold('volume', Number(event.target.value) || 1)} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Severidad mínima COP</span>
                        <Input inputMode="numeric" placeholder="COP 1.000.000" aria-label="Severidad mínima por tipo en pesos colombianos" aria-invalid={selectedTypeSeverity <= 0} value={formatCopInput(selectedTypeSeverity)} onChange={(event) => updateTypeAlertThreshold('severity', parseCopInput(event.target.value))} className={cn(selectedTypeSeverity <= 0 && 'border-destructive focus-visible:ring-destructive')} />
                        {selectedTypeSeverity <= 0 && <p className="text-xs text-destructive">{severityValidationMessage}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 rounded-md border border-border/70 p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Gauge className="h-4 w-4" /> Por centro</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select value={selectedAlertCenter} onValueChange={setSelectedAlertCenter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Sin centro</SelectItem>
                          {centerOptions.map((center) => <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Volumen mínimo</span>
                        <Input type="number" min={1} placeholder="Ej. 10 novedades" aria-label="Volumen mínimo por centro" value={centerAlertThresholds[selectedAlertCenterKey]?.volume ?? volumeThreshold} onChange={(event) => updateCenterAlertThreshold('volume', Number(event.target.value) || 1)} />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Severidad mínima COP</span>
                        <Input inputMode="numeric" placeholder="COP 1.000.000" aria-label="Severidad mínima por centro en pesos colombianos" aria-invalid={selectedCenterSeverity <= 0} value={formatCopInput(selectedCenterSeverity)} onChange={(event) => updateCenterAlertThreshold('severity', parseCopInput(event.target.value))} className={cn(selectedCenterSeverity <= 0 && 'border-destructive focus-visible:ring-destructive')} />
                        {selectedCenterSeverity <= 0 && <p className="text-xs text-destructive">{severityValidationMessage}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Tabs defaultValue="indicadores" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto pb-1">
          <TabsList className="grid h-auto min-w-[360px] grid-cols-2 gap-1 rounded-xl border border-border/70 bg-slate-50 p-1 shadow-sm sm:w-[520px]">
            <TabsTrigger value="indicadores" className="gap-2 rounded-lg py-2.5 text-xs font-black uppercase tracking-[0.12em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" /> Indicadores
            </TabsTrigger>
            <TabsTrigger value="infografias" className="gap-2 rounded-lg py-2.5 text-xs font-black uppercase tracking-[0.12em] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-4 w-4" /> Infografias
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="indicadores" className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Novedades mensuales" value={analytics.kpis.totalNovelties} detail="Total en el rango filtrado" icon={BarChart3} trend="neutral" />
        <KpiCard title="Horas por jornada" value={numberFormatter.format(analytics.kpis.hoursPerWorkday)} detail="Horas de novedades / jornadas" icon={Clock} trend={analytics.kpis.hoursPerWorkday <= 1 ? 'up' : 'down'} />
        <KpiCard title="Empleados impactados" value={analytics.kpis.impactedEmployees} detail="Con al menos una novedad" icon={Users} trend="neutral" />
        <KpiCard title="Monto estimado afectado" value={currencyFormatter.format(analytics.kpis.estimatedImpact)} detail="Estimado por salario y tipo" icon={DollarSign} trend={analytics.kpis.estimatedImpact > 0 ? 'down' : 'neutral'} />
        <KpiCard title="Empleados programables" value={analytics.kpis.activeEmployeeCount} detail="Con configuración de tiempo activa" icon={Users} trend="neutral" />
        <KpiCard title="Cobertura jornadas" value={`${analytics.kpis.coverage}%`} detail={`${integerFormatter.format(analytics.kpis.assignedWorkDays)} jornadas laborales asignadas`} icon={CheckCircle2} trend={analytics.kpis.coverage >= 85 ? 'up' : 'down'} />
        <KpiCard title="Horas programadas" value={integerFormatter.format(analytics.kpis.plannedHours)} detail="Estimadas desde turnos asignados" icon={Clock} trend="neutral" />
        <KpiCard title="Horas novedades" value={numberFormatter.format(analytics.kpis.noveltyHours)} detail="Total registrado en novedades" icon={Activity} trend="neutral" />
        <KpiCard title="Horas extra" value={numberFormatter.format(analytics.kpis.overtimeHours)} detail={`${analytics.kpis.overtimeRate}% frente a carga programada`} icon={Zap} trend={analytics.kpis.overtimeRate <= 8 ? 'up' : 'down'} />
        <KpiCard title="Ausencias" value={numberFormatter.format(analytics.kpis.absenceHours)} detail="Incapacidades, vacaciones y permisos" icon={AlertTriangle} trend={analytics.kpis.absenceHours > 0 ? 'down' : 'up'} />
        <KpiCard title="Turnos activos" value={analytics.kpis.activeShifts} detail={`${analytics.kpis.activeSchedules} horarios administrativos`} icon={Moon} trend="neutral" />
        <KpiCard title="Ciclos activos" value={analytics.kpis.activeCycles} detail="Rotaciones disponibles para programación" icon={RotateCcw} trend="neutral" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {analytics.insights.map((insight) => (
          <Card key={insight.title}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{insight.title}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{insight.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{insight.detail}</p>
                </div>
                <Badge variant="outline" className={cn(
                  insight.tone === 'success' && 'bg-success-light text-success border-success/20',
                  insight.tone === 'warning' && 'bg-warning-light text-warning border-warning/20',
                  insight.tone === 'destructive' && 'bg-destructive/10 text-destructive border-destructive/20'
                )}>
                  {insight.tone === 'success' ? 'Saludable' : insight.tone === 'warning' ? 'Atención' : 'Crítico'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics.alerts.length > 0 && (
        <Card className="border-warning/30 bg-warning-light/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-warning" /> Alertas de comportamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {analytics.alerts.map((alert) => (
              <div key={alert} className="rounded-md border border-warning/20 bg-background p-3 text-sm text-foreground">
                {alert}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-warning" /> Alertas automáticas de nómina
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analytics.automaticAlerts.length === 0 ? (
            <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
              No se detectan picos inusuales, empates de cobertura ni variaciones bruscas con los filtros actuales.
            </div>
          ) : analytics.automaticAlerts.map((alert) => {
            const status = alertStatusOverrides[alert.id] || alert.estado;
            return (
              <div key={alert.id} className="rounded-md border border-border p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{alert.tipo}</p>
                      <Badge variant="outline" className={cn(
                        alert.severidad === 'Crítica' && 'bg-destructive/10 text-destructive border-destructive/20',
                        alert.severidad === 'Alta' && 'bg-warning-light text-warning border-warning/20',
                        alert.severidad === 'Media' && 'bg-primary-light text-primary border-primary/20'
                      )}>{alert.severidad}</Badge>
                      <Badge variant="outline" className={alertStatusStyles[status]}>{alertStatusLabels[status]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{alert.periodo} · {alert.valor}</p>
                    <p className="text-sm text-foreground">{alert.detalle}</p>
                    {status === 'cerrada' && alertCloseReasons[alert.id] && (
                      <p className="rounded-md border border-success/20 bg-success-light p-2 text-xs text-success">
                        Motivo de cierre: {alertCloseReasons[alert.id]}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant={status === 'pendiente' ? 'default' : 'outline'} onClick={() => setAlertStatusOverrides((prev) => ({ ...prev, [alert.id]: 'pendiente' }))}>Pendiente</Button>
                    <Button size="sm" variant={status === 'notificada' ? 'default' : 'outline'} onClick={() => setAlertStatusOverrides((prev) => ({ ...prev, [alert.id]: 'notificada' }))}>Notificada</Button>
                    <Button size="sm" variant={status === 'cerrada' ? 'default' : 'outline'} onClick={() => openCloseReasonDialog(alert)}>Cerrar con motivo</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!closingAlert} onOpenChange={(open) => !open && setClosingAlert(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cerrar alerta con motivo</DialogTitle>
            <DialogDescription>{closingAlert?.tipo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={closeReasonDraft}
              onChange={(event) => setCloseReasonDraft(event.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="Describe la justificación del cierre"
              className="min-h-28"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Requerido, mínimo 3 caracteres</span>
              <span>{closeReasonDraft.trim().length}/500</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingAlert(null)}>Cancelar</Button>
            <Button onClick={confirmCloseWithReason} disabled={closeReasonDraft.trim().length < 3}>Guardar cierre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 xl:grid-cols-2">
        {[{ title: 'Priorización por tipo de novedad', rows: analytics.impactRankingByType }, { title: 'Priorización por centro', rows: analytics.impactRankingByCenter }].map((section) => (
          <Card key={section.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.rows.map((row: any) => (
                <div key={row.name} className="rounded-md border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">{row.volumen} novedades · {numberFormatter.format(row.horas)} horas · {row.empleados} empleados</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      row.prioridad === 'Crítica' && 'bg-destructive/10 text-destructive border-destructive/20',
                      row.prioridad === 'Alta' && 'bg-warning-light text-warning border-warning/20',
                      row.prioridad === 'Normal' && 'bg-success-light text-success border-success/20'
                    )}>{row.prioridad}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">Impacto estimado</span>
                    <span className="font-semibold text-foreground">{currencyFormatter.format(row.impacto)}</span>
                  </div>
                  <Progress value={Math.min(100, percent(row.impacto, Math.max(row.severityThreshold, row.impacto)))} className="mt-2 h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" /> Desglose por jornada
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={analytics.jornadaBreakdown} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="jornada" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value, name) => name === 'Impacto' ? currencyFormatter.format(Number(value)) : value} />
                <Legend />
                <Bar yAxisId="left" dataKey="horas" name="Horas" stackId="jornada" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="novedades" name="Cantidad novedades" stackId="jornada" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="proporcionImpacto" name="Proporción impacto %" stroke="hsl(var(--warning))" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {analytics.jornadaBreakdown.map((row: any) => (
              <div key={row.jornada} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{row.jornada}</p>
                    <p className="text-xs text-muted-foreground">{row.novedades} novedades · {numberFormatter.format(row.horas)} horas · {row.empleados} empleados</p>
                  </div>
                  <Badge variant="outline" className="bg-primary-light text-primary border-primary/20">{row.proporcionImpacto}%</Badge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Impacto estimado</span>
                  <span className="font-semibold text-foreground">{currencyFormatter.format(row.impacto)}</span>
                </div>
                <Progress value={row.proporcionImpacto} className="mt-2 h-2" />
              </div>
            ))}
          </div>
          <div className="xl:col-span-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.jornadaHeatmap.map((row: any) => (
              <div key={row.tipo} className="rounded-md border border-border p-3">
                <p className="truncate text-sm font-semibold text-foreground">{row.tipo}</p>
                <div className="mt-2 grid gap-2">
                  {analytics.jornadaBreakdown.map((jornada: any) => (
                    <div key={`${row.tipo}-${jornada.jornada}`} className="rounded-sm border border-border/60 p-2" style={{ backgroundColor: `hsl(var(--primary) / ${Math.min(0.28, (row[`${jornada.jornada}Pct`] || 0) / 180 + 0.04)})` }}>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-foreground">{jornada.jornada}</span>
                        <span className="font-medium text-foreground">{row[`${jornada.jornada}Pct`] || 0}%</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{currencyFormatter.format(row[jornada.jornada] || 0)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Tendencia mensual de jornadas y novedades" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.monthlyTrend} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="jornadas" name="Jornadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="descansos" name="Descansos" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Area yAxisId="right" type="monotone" dataKey="horasExtra" name="Horas extra" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.18} />
              <Line yAxisId="right" type="monotone" dataKey="ausencias" name="Ausencias" stroke="hsl(var(--destructive))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="KPIs mensuales: novedades, empleados e impacto" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.monthlyTrend} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Monto estimado' ? currencyFormatter.format(Number(value)) : value} />
              <Legend />
              <Bar yAxisId="left" dataKey="novedades" name="Novedades" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="empleadosImpactados" name="Empleados impactados" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="left" type="monotone" dataKey="horasPorJornada" name="Horas por jornada" stroke="hsl(var(--warning))" strokeWidth={3} />
              <Area yAxisId="right" type="monotone" dataKey="montoEstimado" name="Monto estimado" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.18} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Altas y bajas mensuales de novedades" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.monthlyTrend} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="altasNovedades" name="Altas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bajasNovedades" name="Bajas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="novedades" name="Total novedades" stroke="hsl(var(--primary))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución mensual por jornada" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.shiftDistributionTrend} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="jornadas" name="Jornadas" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.28} />
              <Area type="monotone" dataKey="descansos" name="Descansos" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.24} />
              <Line type="monotone" dataKey="manual" name="Manual" stroke="hsl(var(--warning))" strokeWidth={3} />
              <Line type="monotone" dataKey="ciclo" name="Ciclo" stroke="hsl(var(--success))" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Evolución de impacto estimado" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.impactEvolution} margin={{ left: -20, right: 18, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Legend />
              <Area type="monotone" dataKey="impactoActual" name="Impacto actual" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.18} />
              {comparisonMode === 'mes_anterior' && <Line type="monotone" dataKey="impactoMesAnterior" name="Mes anterior" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={3} />}
              <Bar dataKey="variacion" name="Variación" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Comportamiento por día de la semana">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.weekdayBehavior} margin={{ left: -20, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="asignaciones" name="Asignaciones" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="novedades" name="Novedades" stroke="hsl(var(--tertiary))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Radar de presión operativa">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={analytics.weekdayBehavior} outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="Horas extra" dataKey="horasExtra" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.25} />
              <Radar name="Ausencias" dataKey="ausencias" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.18} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por tipo de novedad">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.noveltyTypes} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2} label>
                {analytics.noveltyTypes.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Horas por tipo de novedad">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.noveltyHoursByType.slice(0, 8)} layout="vertical" margin={{ left: 34, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Horas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monto estimado por tipo de novedad">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.estimatedImpactByType.slice(0, 8)} layout="vertical" margin={{ left: 34, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
              <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => currencyFormatter.format(Number(value))} />
              <Bar dataKey="value" name="Monto estimado" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top impacto por tipo de novedad">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.impactRankingByType} layout="vertical" margin={{ left: 34, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
              <YAxis dataKey="name" type="category" width={118} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, name) => name === 'Impacto' ? currencyFormatter.format(Number(value)) : value} />
              <Bar dataKey="impacto" name="Impacto" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top impacto por centro de operación">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={analytics.impactRankingByCenter} margin={{ left: -20, right: 18, top: 8, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(value) => `$${Number(value) / 1000000}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => name === 'Impacto' ? currencyFormatter.format(Number(value)) : value} />
              <Legend />
              <Bar yAxisId="left" dataKey="impacto" name="Impacto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="volumen" name="Volumen" stroke="hsl(var(--destructive))" strokeWidth={3} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Ranking de demanda por turno">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.shiftDemand} margin={{ left: -20, right: 12, top: 8, bottom: 36 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Asignaciones" fill="hsl(var(--tertiary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Origen de programación">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.sourceMix} dataKey="value" nameKey="name" outerRadius={98} label>
                {analytics.sourceMix.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Origen de novedades">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={analytics.noveltySourceMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={94} label>
                {analytics.noveltySourceMix.map((_, index) => <Cell key={index} fill={chartColors[(index + 2) % chartColors.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Modalidad de tiempo del personal">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.modeMix} margin={{ left: -20, right: 12, top: 8, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="Empleados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Empleados con mayor carga de novedades">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.employeeNoveltyHours} layout="vertical" margin={{ left: 44, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" name="Horas" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-5 w-5 text-primary" /> Mapa de intensidad reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7 lg:grid-cols-10">
            {analytics.heatmap.map((day) => (
              <div key={day.fecha} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">{day.fecha}</span>
                  <span className="text-muted-foreground">{day.intensidad}%</span>
                </div>
                <Progress value={day.intensidad} className="mt-2 h-2" />
                <p className="mt-1 text-[11px] text-muted-foreground">{day.asignaciones} jornadas · {day.novedades} nov.</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="infografias" className="space-y-4 sm:space-y-6">
          <PayrollInfographics analytics={analytics} centerLabel={selectedCenterLabel} periodLabelText={selectedPeriodLabel} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
