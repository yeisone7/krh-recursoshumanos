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
import { IncapacityOperationsReport } from '@/components/incapacities/IncapacityOperationsReport';
import { useIncapacityAnalyticsEmployees } from '@/hooks/useEmployees';
import { useIncapacityAnalyticsData } from '@/hooks/useIncapacities';
import { usePilaUgppSettings } from '@/hooks/usePilaUgpp';
import {
  buildIncapacityEmployerCostSummary,
  buildIncapacityDurationBuckets,
  buildLegalResponsibilityDays,
  buildMonthlyEpsRecovery,
  getEarliestIncapacityStartDate,
  getActualRecoveryPayment,
  getIncapacityRecoveryAmounts,
  getLongCaseShare,
  hasIncapacityStartedBy,
  type IncapacityDurationBucket,
  type MonthlyEpsRecoveryRow,
} from '@/lib/incapacityAnalytics';
import { cn } from '@/lib/utils';
import {
  countOperationallyActiveAffectedEmployees,
  isOperationallyActiveEmployee,
} from '@/lib/employeeAnalyticsData';
import {
  normalizeBiologicalSex,
  shouldDisplayBiologicalSex,
  type BiologicalSexKey,
} from '@/lib/biologicalSex';
import {
  getLegalMilestones,
  getTotalChainDays,
  incapacityOriginOptions,
  recoveryStatusLabels,
  type IncapacityWithEmployee,
  type IncapacityEmployerCostBreakdown,
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
const durationColors = [palette.teal, palette.orange];

const operationsConceptLabels: Record<string, string> = {
  comun: 'E.G.',
  laboral: 'A.L.',
  accidente_transito: 'A.TTO',
  licencia_maternidad: 'L.M.',
  licencia_paternidad: 'L.P.',
};

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
  startDate: Date | null;
  endDate: Date | null;
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
    const employeeName = root.employee ? `${root.employee.first_name} ${root.employee.last_name}`.trim() : 'Empleado sin nombre';
    const rootFlat: FlatIncapacity = {
      ...root,
      rootId: root.id,
      chainDays,
      employeeName,
      startDate: safeDate(root.start_date),
      endDate: safeDate(root.end_date),
    };

    const extensions = (root.extensions || []).map((extension) => ({
      ...extension,
      employee: root.employee,
      rootId: root.id,
      chainDays,
      employeeName,
      startDate: safeDate(extension.start_date),
      endDate: safeDate(extension.end_date),
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

function getMonthLabel(key: string) {
  return format(parseISO(`${key}-01T00:00:00`), 'MMM yy', { locale: es });
}

interface ChartTooltipEntry {
  name?: string;
  dataKey?: string | number;
  value?: string | number;
  color?: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-black uppercase tracking-wide text-slate-800">{label}</p>}
      <div className="space-y-1">
        {payload.map((item) => (
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

function SexAvatar({ kind, color }: { kind: BiologicalSexKey; color: string }) {
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
  data: Array<{ key: BiologicalSexKey; label: string; color: string; cases: number; days: number; employees: number; percentage: number }>;
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

        <div className={cn(
          'grid grid-cols-1 gap-3 xl:grid-cols-1',
          data.length > 3 ? 'sm:grid-cols-2 2xl:grid-cols-2' : 'sm:grid-cols-3 2xl:grid-cols-3',
        )}>
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
  data: Array<{ key: BiologicalSexKey; label: string; color: string; cases: number; days: number; employees: number; percentage: number }>;
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
      <div className={cn('grid gap-3', data.length > 3 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>
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

interface IncapacityInfographicsAnalytics {
  total: number;
  totalDays: number;
  active: number;
  avgDays: number;
  recovered: number;
  recoveryRate: number;
  incidenceRate: number;
  longCases: number;
  legalRisk: number;
  originData: Array<{ name: string; value: number }>;
  recoveryData: Array<{ name: string; value: number }>;
  legalData: Array<{ name: string; value: number }>;
  monthly: Array<{ mes: string; Dias: number; Incapacidades: number }>;
  sexData: Array<{ key: BiologicalSexKey; label: string; color: string; cases: number; days: number; employees: number; percentage: number }>;
  insights: {
    topDiagnosis?: { name: string; value: number };
    topEntity?: { name: string; value: number };
    strongestMonth?: { mes: string; Dias: number };
  };
}

function IncapacityInfographicsTab({ analytics }: { analytics: IncapacityInfographicsAnalytics }) {
  const originCircleData = analytics.originData.map((item: { name: string; value: number }, index: number) => ({
    label: item.name,
    value: item.value,
    color: chartColors[index % chartColors.length],
  }));
  const recoveryMax = Math.max(...analytics.recoveryData.map((item: { value: number }) => item.value), 1);
  const legalMax = Math.max(...analytics.legalData.map((item: { value: number }) => item.value), 1);
  const longCaseShare = getLongCaseShare(analytics.longCases, analytics.total);

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
            <RingMetric value={longCaseShare} label="Casos largos" detail={`${analytics.longCases} casos de mas de 30 dias`} color={palette.orange} />
          </div>
        </InfographicPanel>

        <SegmentedCircle title="Distribucion por origen" center={integerFormatter.format(analytics.total)} data={originCircleData.length ? originCircleData : [{ label: 'Sin datos', value: 1, color: '#CBD5E1' }]} />

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

function IncapacityAnalyticsSkeleton() {
  return (
    <div className="space-y-5 pb-6" aria-label="Cargando analítica de incapacidades" aria-busy="true">
      <div className="rounded-xl border border-slate-200 bg-[#F7F7F1] p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-40 rounded-full" />
              <Skeleton className="h-8 w-72 max-w-[70vw]" />
              <Skeleton className="h-4 w-[520px] max-w-[70vw]" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 xl:w-[720px]">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-11 rounded-lg" />)}
          </div>
        </div>
      </div>

      <Skeleton className="h-12 w-full rounded-xl lg:w-[720px]" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-lg" />)}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-36 rounded-lg" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <Skeleton key={item} className="h-[360px] rounded-lg" />)}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[360px] rounded-lg xl:col-span-2" />
        <Skeleton className="h-[360px] rounded-lg" />
      </div>
    </div>
  );
}

function DurationAnalysisPanel({
  buckets,
  employerCost,
}: {
  buckets: IncapacityDurationBucket[];
  employerCost: IncapacityEmployerCostBreakdown;
}) {
  const totalCases = buckets.reduce((sum, bucket) => sum + bucket.cases, 0);
  const totalAmount = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  const formatPercentage = (rate: number) => new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: rate * 100 % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rate);

  return (
    <Card className="overflow-hidden rounded-lg border border-slate-200 bg-[#FBFAF5] shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Duración de las incapacidades</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">Cantidad, participación y valor según días reconocidos</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
              {integerFormatter.format(totalCases)} casos
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600">
              {money(totalAmount)}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {buckets.map((bucket, index) => {
            const color = durationColors[index % durationColors.length];
            const ringValue = clampPercent(bucket.casePercentage);
            return (
              <div key={bucket.key} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `conic-gradient(${color} ${ringValue}%, #E8EDF1 ${ringValue}% 100%)` }}
                    role="img"
                    aria-label={`${numberFormatter.format(bucket.casePercentage)}% de los casos`}
                  >
                    <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-white shadow-inner">
                      <span className="text-xl font-black text-slate-950">{numberFormatter.format(bucket.casePercentage)}%</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">casos</span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: color }}>
                      {bucket.label}
                    </span>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{integerFormatter.format(bucket.cases)}</p>
                    <p className="text-xs font-semibold text-slate-500">{bucket.description}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor total</p>
                    <p className="mt-1 text-base font-black text-slate-950">{money(bucket.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Participación del valor</p>
                    <p className="mt-1 text-base font-black" style={{ color }}>{numberFormatter.format(bucket.amountPercentage)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          {buckets.map((bucket, index) => (
            <div
              key={bucket.key}
              style={{ width: `${bucket.casePercentage}%`, backgroundColor: durationColors[index % durationColors.length] }}
            />
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Banknote className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">Costo laboral estimado total</h4>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Prestaciones y aportes acumulados sobre {money(employerCost.paymentBase)}.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-3">
              {[
                { label: 'Base', value: employerCost.paymentBase },
                { label: 'Costo adicional', value: employerCost.additionalCost },
                { label: 'Total con costo laboral', value: employerCost.totalCost },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 whitespace-nowrap text-sm font-black text-slate-950">{money(item.value)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-slate-200">
            {[
              { title: 'Prestaciones sociales', items: employerCost.benefits },
              { title: 'Aportes patronales', items: employerCost.contributions },
            ].map((section) => (
              <div key={section.title} className="p-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500">{section.title}</p>
                <div className="divide-y divide-slate-100 border-y border-slate-100">
                  {section.items.map((item) => (
                    <div key={item.key} className="grid grid-cols-[minmax(0,1fr)_64px_110px] items-center gap-2 py-2 text-xs">
                      <span className="truncate font-bold text-slate-700">{item.label}</span>
                      <span className="text-right tabular-nums text-slate-500">{formatPercentage(item.rate)}</span>
                      <span className="text-right font-black tabular-nums text-slate-950">{money(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getFullMonthLabel(monthKey: string) {
  const label = format(parseISO(`${monthKey}-01T00:00:00`), 'MMMM yyyy', { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function EpsMonthlyRecoveryTable({ rows }: { rows: MonthlyEpsRecoveryRow[] }) {
  const expected = rows.reduce((sum, row) => sum + row.expected, 0);
  const recovered = rows.reduce((sum, row) => sum + row.recovered, 0);
  const pending = Math.max(0, expected - recovered);
  const monthCount = new Set(rows.map((row) => row.monthKey)).size;

  return (
    <Card className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <div className="border-b border-slate-200 bg-[#FBFAF5] p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Banknote className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Recobro mensual por EPS</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">Valores asociados a incapacidades iniciadas en cada mes, desglosados por EPS</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[610px]">
              {[
                { label: 'Meses', value: integerFormatter.format(monthCount), color: palette.navy },
                { label: 'Esperado', value: money(expected), color: palette.amber },
                { label: 'Recuperado', value: money(recovered), color: palette.teal },
                { label: 'Pendiente', value: money(pending), color: palette.orange },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-black" style={{ color: item.color }} title={item.value}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {rows.length ? (
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full min-w-[920px] border-collapse text-left">
              <caption className="h-px overflow-hidden whitespace-nowrap p-0 text-[0px] leading-none [clip-path:inset(50%)]">
                Recobros de incapacidades agrupados por mes y EPS
              </caption>
              <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#E2E8F0]">
                <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                  <th scope="col" className="px-4 py-3">Mes de incapacidad</th>
                  <th scope="col" className="px-4 py-3">EPS</th>
                  <th scope="col" className="px-4 py-3 text-right">Casos</th>
                  <th scope="col" className="px-4 py-3 text-right">Esperado</th>
                  <th scope="col" className="px-4 py-3 text-right">Recuperado</th>
                  <th scope="col" className="px-4 py-3 text-right">Pendiente</th>
                  <th scope="col" className="w-[220px] px-4 py-3">Avance del recobro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.key} className="bg-white text-xs text-slate-700 transition-colors hover:bg-cyan-50/40">
                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{getFullMonthLabel(row.monthKey)}</td>
                    <td className="max-w-[260px] px-4 py-3 font-bold text-slate-800">
                      <span className="block truncate" title={row.epsName}>{row.epsName}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-black">{integerFormatter.format(row.cases)}</td>
                    <td className="px-4 py-3 text-right font-bold">{money(row.expected)}</td>
                    <td className="px-4 py-3 text-right font-black text-cyan-700">{money(row.recovered)}</td>
                    <td className="px-4 py-3 text-right font-black text-orange-600">{money(row.pending)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-cyan-600"
                            style={{ width: `${clampPercent(row.recoveryPercentage)}%` }}
                            role="progressbar"
                            aria-label={`Avance de recobro de ${row.epsName} en ${getFullMonthLabel(row.monthKey)}`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={clampPercent(row.recoveryPercentage)}
                          />
                        </div>
                        <span className="w-11 text-right text-[11px] font-black text-slate-700">{numberFormatter.format(row.recoveryPercentage)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <Banknote className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-black text-slate-800">Sin recobros EPS para los filtros seleccionados</p>
            <p className="mt-1 text-xs font-medium text-slate-500">La tabla aparecerá cuando existan incapacidades con valor asignado a una EPS.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnaliticaIncapacidades() {
  const [period, setPeriod] = useState<PeriodFilter>('12m');
  const [origin, setOrigin] = useState('all');
  const [recoveryStatus, setRecoveryStatus] = useState('all');

  const { data: incapacityRoots = [], isPending: loadingIncapacities } = useIncapacityAnalyticsData();
  const { data: employees = [], isPending: loadingEmployees } = useIncapacityAnalyticsEmployees();
  const { data: pilaSettings } = usePilaUgppSettings();

  const flatIncapacities = useMemo(() => flattenIncapacities(incapacityRoots), [incapacityRoots]);
  const employeeById = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const activeEmployees = useMemo(
    () => employees.filter(isOperationallyActiveEmployee).length,
    [employees]
  );

  const analytics = useMemo(() => {
    const range = getRange(period);
    const today = new Date();
    const all = flatIncapacities;
    const rootById = new Map(all.filter((item) => item.id === item.rootId).map((item) => [item.rootId, item]));

    const matchesStaticFilters = (item: FlatIncapacity) => (
      (origin === 'all' || item.origin === origin) &&
      (recoveryStatus === 'all' || item.recovery_status === recoveryStatus)
    );

    const matchesPeriod = (item: FlatIncapacity, targetRange: ReturnType<typeof getRange>) => {
      if (!targetRange) return hasIncapacityStartedBy(item, today);
      if (!item.startDate) return false;
      return isWithinInterval(item.startDate, { start: targetRange.start, end: targetRange.end });
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
    const recoveryAmounts = filtered.map(getIncapacityRecoveryAmounts);
    const expectedRecovery = recoveryAmounts.reduce((sum, item) => sum + item.expected, 0);
    const recovered = recoveryAmounts.reduce((sum, item) => sum + item.recovered, 0);
    const pendingRecovery = recoveryAmounts.reduce((sum, item) => sum + item.pending, 0);
    const affectedEmployeeIds = new Set(filtered.map((item) => item.employee_id));
    const affectedEmployees = affectedEmployeeIds.size;
    const affectedActiveEmployees = countOperationallyActiveAffectedEmployees(employees, affectedEmployeeIds);
    const activeItems = filtered.filter((item) => {
      return !!item.startDate && !!item.endDate && !isAfter(item.startDate, today) && !isBefore(item.endDate, today);
    });

    const longCases = incapacityRoots.filter((root) => {
      const rootFlat = rootById.get(root.id);
      return !!rootFlat && matchesStaticFilters(rootFlat) && matchesPeriod(rootFlat, range) && rootFlat.chainDays > 30;
    });

    const legalRisk = incapacityRoots.filter((root) => {
      if (root.origin !== 'comun') return false;
      const rootFlat = rootById.get(root.id);
      if (!rootFlat || !matchesStaticFilters(rootFlat) || !matchesPeriod(rootFlat, range)) return false;
      return getLegalMilestones(root.origin, rootFlat.chainDays).some((milestone) => milestone.isReached || milestone.daysRemaining <= 20);
    });

    const months = range
      ? eachMonthOfInterval({ start: startOfMonth(range.start), end: endOfMonth(range.end) })
      : eachMonthOfInterval({
          start: startOfMonth(getEarliestIncapacityStartDate(all, subMonths(today, 11))),
          end: today,
        });

    const itemsByMonth = new Map<string, FlatIncapacity[]>();
    filtered.forEach((item) => {
      if (!item.start_date) return;
      const key = item.start_date.slice(0, 7);
      const monthItems = itemsByMonth.get(key);
      if (monthItems) monthItems.push(item);
      else itemsByMonth.set(key, [item]);
    });

    const recoveredByPaymentMonth = new Map<string, number>();
    all.filter(matchesStaticFilters).forEach((item) => {
      const payment = getActualRecoveryPayment(item);
      if (!payment) return;
      recoveredByPaymentMonth.set(
        payment.monthKey,
        (recoveredByPaymentMonth.get(payment.monthKey) || 0) + payment.amount,
      );
    });

    const monthly = months.map((month) => {
      const key = format(month, 'yyyy-MM');
      const monthItems = itemsByMonth.get(key) || [];
      const originDays = incapacityOriginOptions.reduce(
        (acc, option) => {
          acc[option.shortLabel] = monthItems
            .filter((item) => item.origin === option.value)
            .reduce((sum, item) => sum + item.total_days, 0);
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        key,
        mes: getMonthLabel(key),
        Incapacidades: monthItems.length,
        Dias: monthItems.reduce((sum, item) => sum + item.total_days, 0),
        ...originDays,
        Estimado: Math.round(monthItems.reduce((sum, item) => sum + getIncapacityRecoveryAmounts(item).expected, 0)),
        Recuperado: Math.round(recoveredByPaymentMonth.get(key) || 0),
      };
    });

    const originData = incapacityOriginOptions
      .map((option) => ({
        name: option.shortLabel,
        value: filtered.filter((item) => item.origin === option.value).length,
      }))
      .filter((item) => item.value > 0);

    const durationBuckets = buildIncapacityDurationBuckets(filtered);
    const employerCostSummary = buildIncapacityEmployerCostSummary(filtered, pilaSettings);
    const epsMonthlyRecovery = buildMonthlyEpsRecovery(filtered);
    const recoveryData = groupBy(filtered, (item) => recoveryStatusLabels[item.recovery_status] || item.recovery_status);
    const legalData = buildLegalResponsibilityDays(filtered);
    const diagnosisData = groupBy(filtered, (item) => item.cie10_code ? `${item.cie10_code} - ${item.diagnosis}` : item.diagnosis, (item) => item.total_days || 0).slice(0, 8);
    const employeeData = groupBy(filtered, (item) => item.employeeName, (item) => item.total_days || 0).slice(0, 8);
    const entityData = groupBy(filtered, (item) => item.origin === 'laboral' ? item.arl_name || 'ARL no registrada' : item.eps_name || 'EPS no registrada', (item) => item.total_days || 0).slice(0, 8);
    const operationsReportRows = filtered.map((item) => {
      const employee = employeeById.get(item.employee_id);
      const center = employee?.operation_centers;
      const diagnosis = item.diagnosis?.trim() || 'Sin diagnóstico';
      const diagnosisCode = item.cie10_code?.trim();
      const gender = normalizeBiologicalSex(item.employee?.gender || employee?.gender);

      return {
        id: item.id,
        employeeId: item.employee_id,
        employeeName: item.employeeName,
        operationCenterId: center?.id || 'sin-centro',
        operationCenterName: center?.name || 'Sin centro asignado',
        positionName: employee?.work_info?.position_name?.trim() || 'Sin cargo asignado',
        concept: operationsConceptLabels[item.origin] || item.origin,
        startDate: item.start_date,
        endDate: item.end_date,
        totalDays: item.total_days || 0,
        diagnosisKey: diagnosisCode || diagnosis.toLocaleLowerCase('es'),
        diagnosisLabel: diagnosisCode ? `${diagnosisCode} - ${diagnosis}` : diagnosis,
        gender,
      };
    });
    const sexSeed: Record<BiologicalSexKey, { key: BiologicalSexKey; label: string; color: string; cases: number; days: number; employeeIds: Set<string> }> = {
      F: { key: 'F', label: 'Femenino', color: palette.orange, cases: 0, days: 0, employeeIds: new Set<string>() },
      M: { key: 'M', label: 'Masculino', color: palette.teal, cases: 0, days: 0, employeeIds: new Set<string>() },
      O: { key: 'O', label: 'Otro', color: palette.violet, cases: 0, days: 0, employeeIds: new Set<string>() },
      sin_dato: { key: 'sin_dato', label: 'Sin dato', color: palette.navy, cases: 0, days: 0, employeeIds: new Set<string>() },
    };

    filtered.forEach((item) => {
      const key = normalizeBiologicalSex(item.employee?.gender || employeeById.get(item.employee_id)?.gender);
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
    })).filter((item) => shouldDisplayBiologicalSex(item.key, item.cases));

    const weekdays = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day) => ({ day, value: 0, count: 0 }));
    filtered.forEach((item) => {
      if (!item.startDate) return;
      const weekdayIndex = item.startDate.getDay() === 0 ? 6 : item.startDate.getDay() - 1;
      weekdays[weekdayIndex].value += item.total_days || 0;
      weekdays[weekdayIndex].count += 1;
    });
    const weekdayData = weekdays;

    const recoveryRate = percent(recovered, expectedRecovery);
    const incidenceRate = percent(affectedActiveEmployees, activeEmployees);
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
      affectedActiveEmployees,
      incidenceRate,
      activeEmployees,
      longCases: longCases.length,
      legalRisk: legalRisk.length,
      monthly,
      durationBuckets,
      employerCostSummary,
      epsMonthlyRecovery,
      originData,
      recoveryData,
      legalData,
      diagnosisData,
      employeeData,
      entityData,
      operationsReportRows,
      sexData,
      weekdayData,
      trends: {
        cases: previousRange ? trend(filtered.length, previous.length) : undefined,
        days: previousRange ? trend(totalDays, previousDays) : undefined,
        recovery: previousRange
          ? trend(recovered, previous.reduce((sum, item) => sum + getIncapacityRecoveryAmounts(item).recovered, 0))
          : undefined,
      },
      insights: {
        topDiagnosis,
        topEntity,
        strongestMonth,
      },
    };
  }, [activeEmployees, employeeById, employees, flatIncapacities, incapacityRoots, origin, period, pilaSettings, recoveryStatus]);

  const isLoading = loadingIncapacities || loadingEmployees;

  if (isLoading) {
    return <IncapacityAnalyticsSkeleton />;
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
                {incapacityOriginOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
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
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 lg:w-[720px]">
          <TabsTrigger value="ejecutivo" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <Gauge className="h-4 w-4" />
            Ejecutivo
          </TabsTrigger>
          <TabsTrigger value="infografias" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <Sparkles className="h-4 w-4" />
            Infografias
          </TabsTrigger>
          <TabsTrigger value="operativo" className="gap-2 rounded-lg text-xs font-black uppercase tracking-widest data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            Centros de operación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ejecutivo" className="mt-0 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile title="Casos filtrados" value={integerFormatter.format(analytics.total)} detail={`${analytics.active} activos ahora`} icon={FileText} color={palette.teal} trend={analytics.trends.cases} />
        <KpiTile title="Dias de incapacidad" value={integerFormatter.format(analytics.totalDays)} detail={`${numberFormatter.format(analytics.avgDays)} dias promedio`} icon={CalendarDays} color={palette.orange} trend={analytics.trends.days} />
        <KpiTile title="Recobro pendiente" value={money(analytics.pendingRecovery)} detail={`${analytics.recoveryRate}% recuperado`} icon={Banknote} color={palette.amber} trend={analytics.trends.recovery} />
        <KpiTile title="Colaboradores activos afectados" value={integerFormatter.format(analytics.affectedActiveEmployees)} detail={`${analytics.incidenceRate}% de ${analytics.activeEmployees} activos`} icon={Users} color={palette.navy} />
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

      <DurationAnalysisPanel buckets={analytics.durationBuckets} employerCost={analytics.employerCostSummary} />

      <EpsMonthlyRecoveryTable rows={analytics.epsMonthlyRecovery} />

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
              {incapacityOriginOptions.map((option, index) => (
                <Area
                  key={option.value}
                  type="monotone"
                  dataKey={option.shortLabel}
                  stackId="1"
                  stroke={chartColors[index % chartColors.length]}
                  fill={chartColors[index % chartColors.length]}
                  name={option.shortLabel}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartPanel title="Mapa de recobros" subtitle="Estimado por inicio vs recuperado por fecha real de pago" icon={Banknote} className="xl:col-span-2">
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

      <div className="grid gap-4">
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

        <TabsContent value="operativo" className="mt-0">
          <IncapacityOperationsReport rows={analytics.operationsReportRows} />
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
