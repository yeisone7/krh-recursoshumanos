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
  Gauge,
  HeartPulse,
  LineChart,
  PieChart as PieChartIcon,
  ShieldAlert,
  Sparkles,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
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

function SexAvatar({ kind, color }: { kind: 'M' | 'F' | 'sin_dato'; color: string }) {
  const isFemale = kind === 'F';
  const isUnknown = kind === 'sin_dato';

  return (
    <svg viewBox="0 0 88 88" className="h-16 w-16" aria-hidden="true">
      <circle cx="44" cy="28" r="16" fill={`${color}2B`} stroke={color} strokeWidth="4" />
      {isFemale && <path d="M22 63c5-14 12-21 22-21s17 7 22 21c-9 8-35 8-44 0Z" fill={`${color}35`} stroke={color} strokeWidth="4" strokeLinejoin="round" />}
      {!isFemale && !isUnknown && <path d="M19 66c4-15 13-23 25-23s21 8 25 23c-11 7-39 7-50 0Z" fill={`${color}35`} stroke={color} strokeWidth="4" strokeLinejoin="round" />}
      {isUnknown && <path d="M19 66c4-15 13-23 25-23s21 8 25 23c-11 7-39 7-50 0Z" fill="#E5E7EB" stroke={color} strokeWidth="4" strokeLinejoin="round" />}
      {isFemale && <path d="M28 27c4-13 28-13 32 0 2 7 6 14 10 18-10 2-42 2-52 0 4-4 8-11 10-18Z" fill={color} opacity="0.72" />}
      {!isFemale && !isUnknown && <path d="M28 22c7-10 25-12 34 0-1 6-4 11-8 14-5-6-13-8-24-5-2-3-3-6-2-9Z" fill={color} opacity="0.72" />}
      {isUnknown && <text x="44" y="34" textAnchor="middle" className="fill-slate-500 text-2xl font-black">?</text>}
    </svg>
  );
}

function BiologicalSexInfographic({
  data,
}: {
  data: Array<{ key: 'F' | 'M' | 'sin_dato'; label: string; color: string; cases: number; days: number; employees: number; percentage: number }>;
}) {
  return (
    <Card className="overflow-hidden rounded-lg border border-slate-200 bg-[#FBFAF5] shadow-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-700" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Sexo biologico</h3>
            <p className="text-xs font-medium text-slate-500">Distribucion por casos filtrados</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
          {data.map((item) => (
            <div key={item.key} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
              <div className="mx-auto flex h-20 items-center justify-center">
                <SexAvatar kind={item.key} color={item.color} />
              </div>
              <div className="mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: item.color }}>
                {item.percentage}%
              </div>
              <p className="mt-2 text-sm font-black uppercase tracking-wide text-slate-950">{item.label}</p>
              <p className="text-xs font-semibold text-slate-500">{integerFormatter.format(item.cases)} casos</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600">
                <span className="rounded-md bg-slate-50 px-2 py-1">{integerFormatter.format(item.employees)} emp.</span>
                <span className="rounded-md bg-slate-50 px-2 py-1">{integerFormatter.format(item.days)} dias</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InfographicPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  );
}

function RingMetric({
  value,
  label,
  detail,
  color,
  size = 'lg',
}: {
  value: number;
  label: string;
  detail: string;
  color: string;
  size?: 'md' | 'lg';
}) {
  const percentValue = clampPercent(value);
  const circumference = 2 * Math.PI * 48;
  const dash = (percentValue / 100) * circumference;
  const dimensions = size === 'lg' ? 'h-40 w-40' : 'h-32 w-32';

  return (
    <div className="flex flex-col items-center text-center">
      <svg viewBox="0 0 132 132" className={dimensions} aria-hidden="true">
        <circle cx="66" cy="66" r="54" fill="#F4F6F8" stroke="#E4E8EF" strokeWidth="12" />
        <circle
          cx="66"
          cy="66"
          r="48"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 66 66)"
        />
        <circle cx="66" cy="66" r="34" fill="white" stroke="#D8DEE8" strokeWidth="2" />
        <text x="66" y="64" textAnchor="middle" className="fill-slate-950 text-2xl font-black">{percentValue}%</text>
        <text x="66" y="80" textAnchor="middle" className="fill-slate-500 text-[10px] font-black uppercase tracking-wide">indice</text>
      </svg>
      <p className="text-sm font-black uppercase tracking-wide text-slate-950">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </div>
  );
}

function MiniHorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;

  return (
    <div className="grid grid-cols-[104px_1fr_58px] items-center gap-3">
      <span className="truncate text-xs font-black text-slate-700">{label}</span>
      <div className="h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
      <span className="text-right text-xs font-black text-slate-900">{integerFormatter.format(value)}</span>
    </div>
  );
}

function SegmentedCircle({
  title,
  center,
  data,
}: {
  title: string;
  center: string;
  data: Array<{ label: string; value: number; color: string }>;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let current = 0;

  return (
    <InfographicPanel className="min-h-[338px] bg-[#FBFAF5]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mapa circular</p>
          <h3 className="text-lg font-black text-slate-950">{title}</h3>
        </div>
        <PieChartIcon className="h-5 w-5 text-slate-500" />
      </div>
      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
        <svg viewBox="0 0 220 220" className="mx-auto h-56 w-56" aria-hidden="true">
          <circle cx="110" cy="110" r="92" fill="white" stroke="#E7EBF0" strokeWidth="18" />
          {data.map((item) => {
            const length = Math.max(8, (item.value / total) * 520);
            const offset = current;
            current += length + 10;
            return (
              <circle
                key={item.label}
                cx="110"
                cy="110"
                r="82"
                fill="none"
                stroke={item.color}
                strokeWidth="28"
                strokeLinecap="round"
                strokeDasharray={`${length} 999`}
                strokeDashoffset={-offset}
                transform="rotate(-90 110 110)"
              />
            );
          })}
          <circle cx="110" cy="110" r="56" fill="white" stroke="#D8DEE8" strokeWidth="2" />
          <text x="110" y="105" textAnchor="middle" className="fill-slate-950 text-2xl font-black">{center}</text>
          <text x="110" y="123" textAnchor="middle" className="fill-slate-500 text-[10px] font-black uppercase tracking-widest">casos</text>
        </svg>
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-slate-950">{integerFormatter.format(item.value)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${clampPercent((item.value / total) * 100)}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </InfographicPanel>
  );
}

function ArrowStep({ index, label, value, color }: { index: number; label: string; value: string; color: string }) {
  return (
    <div className="relative min-h-[92px] overflow-hidden rounded-lg p-4 text-white shadow-sm" style={{ backgroundColor: color }}>
      <span className="absolute -right-7 top-1/2 h-16 w-16 -translate-y-1/2 rotate-45 bg-white/20" />
      <p className="text-3xl font-black leading-none">{String(index).padStart(2, '0')}</p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-widest opacity-80">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function MonthlyInfographic({ monthly }: { monthly: Array<{ mes: string; Dias: number; Incapacidades: number }> }) {
  const maxDays = Math.max(...monthly.map((item) => item.Dias), 1);
  const recent = monthly.slice(-8);

  return (
    <InfographicPanel className="min-h-[338px]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tendencia visual</p>
          <h3 className="text-lg font-black text-slate-950">Dias por mes</h3>
        </div>
        <LineChart className="h-5 w-5 text-slate-500" />
      </div>
      <div className="flex h-52 items-end gap-3 border-b border-slate-200 px-1">
        {recent.map((item, index) => {
          const height = Math.max(12, Math.round((item.Dias / maxDays) * 100));
          const color = chartColors[index % chartColors.length];
          return (
            <div key={item.mes} className="flex flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[10px] font-black text-slate-500">{integerFormatter.format(item.Dias)}</span>
              <div className="w-full rounded-t-lg" style={{ height: `${height}%`, backgroundColor: color }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(recent.length, 1)}, minmax(0, 1fr))` }}>
        {recent.map((item) => (
          <span key={item.mes} className="truncate text-center text-[10px] font-black uppercase text-slate-500">{item.mes}</span>
        ))}
      </div>
    </InfographicPanel>
  );
}

function SexInfographicBlock({
  data,
}: {
  data: Array<{ key: 'F' | 'M' | 'sin_dato'; label: string; color: string; cases: number; days: number; employees: number; percentage: number }>;
}) {
  return (
    <InfographicPanel>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Poblacion impactada</p>
          <h3 className="text-lg font-black text-slate-950">Sexo biologico</h3>
        </div>
        <Users className="h-5 w-5 text-slate-500" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {data.map((item) => (
          <div key={item.key} className="rounded-lg border border-slate-200 bg-[#FBFAF5] p-3 text-center">
            <SexAvatar kind={item.key} color={item.color} />
            <p className="mt-2 text-sm font-black uppercase text-slate-950">{item.label}</p>
            <p className="text-xs font-bold text-slate-500">{item.percentage}% de casos</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
            </div>
            <p className="mt-2 text-xs font-black text-slate-700">{integerFormatter.format(item.cases)} casos / {integerFormatter.format(item.days)} dias</p>
          </div>
        ))}
      </div>
    </InfographicPanel>
  );
}

function IncapacityInfographicsTab({ analytics }: { analytics: any }) {
  const originCircleData = [
    { label: 'Comun', value: analytics.originData.find((item: { name: string }) => item.name === 'Comun')?.value || 0, color: palette.teal },
    { label: 'Laboral', value: analytics.originData.find((item: { name: string }) => item.name === 'Laboral')?.value || 0, color: palette.orange },
    { label: 'Largo plazo', value: analytics.longCases, color: palette.violet },
    { label: 'Riesgo legal', value: analytics.legalRisk, color: palette.navy },
  ].filter((item) => item.value > 0);
  const recoveryMax = Math.max(...analytics.recoveryData.map((item: { value: number }) => item.value), 1);
  const legalMax = Math.max(...analytics.legalData.map((item: { value: number }) => item.value), 1);
  const operationalHealth = clampPercent((analytics.recoveryRate + Math.max(0, 100 - analytics.incidenceRate) + Math.max(0, 100 - percent(analytics.longCases, Math.max(analytics.total, 1)))) / 3);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-[#F7F7FD] p-3 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_1fr]">
        <InfographicPanel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Panel medico</p>
              <h3 className="text-xl font-black text-slate-950">Resumen visual</h3>
            </div>
            <Sparkles className="h-5 w-5 text-slate-500" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <RingMetric value={analytics.recoveryRate} label="Recobro" detail={`${money(analytics.recovered)} recuperado`} color={palette.teal} />
            <RingMetric value={operationalHealth} label="Control" detail={`${analytics.longCases} casos largos`} color={palette.orange} />
          </div>
        </InfographicPanel>

        <SegmentedCircle title="Origen y alertas" center={integerFormatter.format(analytics.total)} data={originCircleData.length ? originCircleData : [{ label: 'Sin datos', value: 1, color: '#CBD5E1' }]} />

        <MonthlyInfographic monthly={analytics.monthly} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ArrowStep index={1} label="Casos" value={integerFormatter.format(analytics.total)} color={palette.teal} />
        <ArrowStep index={2} label="Dias" value={integerFormatter.format(analytics.totalDays)} color={palette.amber} />
        <ArrowStep index={3} label="Promedio" value={`${numberFormatter.format(analytics.avgDays)} dias`} color={palette.orange} />
        <ArrowStep index={4} label="Activos" value={integerFormatter.format(analytics.active)} color={palette.navy} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <InfographicPanel>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Flujo administrativo</p>
              <h3 className="text-lg font-black text-slate-950">Estado de recobro</h3>
            </div>
            <Banknote className="h-5 w-5 text-slate-500" />
          </div>
          <div className="space-y-4">
            {analytics.recoveryData.map((item: { name: string; value: number }, index: number) => (
              <MiniHorizontalBar key={item.name} label={item.name} value={item.value} max={recoveryMax} color={chartColors[index % chartColors.length]} />
            ))}
          </div>
        </InfographicPanel>

        <InfographicPanel>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Responsabilidad legal</p>
              <h3 className="text-lg font-black text-slate-950">Dias por pagador</h3>
            </div>
            <ShieldAlert className="h-5 w-5 text-slate-500" />
          </div>
          <div className="space-y-4">
            {analytics.legalData.map((item: { name: string; value: number }, index: number) => (
              <MiniHorizontalBar key={item.name} label={item.name} value={item.value} max={legalMax} color={chartColors[(index + 2) % chartColors.length]} />
            ))}
          </div>
        </InfographicPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SexInfographicBlock data={analytics.sexData} />

        <InfographicPanel className="bg-[#FBFAF5]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lectura ejecutiva</p>
              <h3 className="text-lg font-black text-slate-950">Hallazgos principales</h3>
            </div>
            <Target className="h-5 w-5 text-slate-500" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diagnostico top</p>
              <p className="mt-2 line-clamp-3 text-sm font-black text-slate-950">{analytics.insights.topDiagnosis?.name || 'Sin diagnosticos'}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{integerFormatter.format(analytics.insights.topDiagnosis?.value || 0)} dias</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidad critica</p>
              <p className="mt-2 line-clamp-3 text-sm font-black text-slate-950">{analytics.insights.topEntity?.name || 'Sin entidad'}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{integerFormatter.format(analytics.insights.topEntity?.value || 0)} dias</p>
            </div>
            <div className="rounded-lg bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mes pico</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{analytics.insights.strongestMonth?.mes || 'N/A'}</p>
              <p className="mt-2 text-xs font-bold text-slate-500">{integerFormatter.format(analytics.insights.strongestMonth?.Dias || 0)} dias</p>
            </div>
          </div>
        </InfographicPanel>
      </div>
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
    const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

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
    const sexSeed: Record<'F' | 'M' | 'sin_dato', { key: 'F' | 'M' | 'sin_dato'; label: string; color: string; cases: number; days: number; employeeIds: Set<string> }> = {
      F: { key: 'F', label: 'Femenino', color: palette.orange, cases: 0, days: 0, employeeIds: new Set<string>() },
      M: { key: 'M', label: 'Masculino', color: palette.teal, cases: 0, days: 0, employeeIds: new Set<string>() },
      sin_dato: { key: 'sin_dato', label: 'Sin dato', color: palette.navy, cases: 0, days: 0, employeeIds: new Set<string>() },
    };

    filtered.forEach((item) => {
      const gender = item.employee?.gender || employeeById.get(item.employee_id)?.gender;
      const key = gender === 'F' || gender === 'M' ? gender : 'sin_dato';
      sexSeed[key].cases += 1;
      sexSeed[key].days += item.total_days || 0;
      sexSeed[key].employeeIds.add(item.employee_id);
    });

    const sexData = Object.values(sexSeed).map((item) => ({
      key: item.key,
      label: item.label,
      color: item.color,
      cases: item.cases,
      days: item.days,
      employees: item.employeeIds.size,
      percentage: percent(item.cases, filtered.length),
    }));

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
      sexData,
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

      <Tabs defaultValue="ejecutivo" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:w-[470px]">
          <TabsTrigger value="ejecutivo" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <Gauge className="h-4 w-4" />
            Ejecutivo
          </TabsTrigger>
          <TabsTrigger value="infografias" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4" />
            Infografias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ejecutivo" className="mt-0 space-y-5">
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

      <div className="grid gap-4 xl:grid-cols-3">
        <BiologicalSexInfographic data={analytics.sexData} />

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
        </TabsContent>

        <TabsContent value="infografias" className="mt-0">
          <IncapacityInfographicsTab analytics={analytics} />
        </TabsContent>
      </Tabs>

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
