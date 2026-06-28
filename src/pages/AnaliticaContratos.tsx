import { useMemo, useState } from 'react';
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
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  FileCheck2,
  FileClock,
  FileText,
  Gauge,
  Layers3,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  addMonths,
  differenceInCalendarDays,
  format,
  isAfter,
  isBefore,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useContracts } from '@/hooks/useContracts';
import { useContractTypes } from '@/hooks/useContractTypes';
import { parseDateOnly } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';

type ContractStatus = 'active' | 'expiring' | 'expired' | 'terminated';
type PeriodFilter = '6m' | '12m' | 'ytd' | 'all';

const chartColors = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#64748B', '#EC4899'];

const statusLabels: Record<ContractStatus, string> = {
  active: 'Vigentes',
  expiring: 'Por vencer',
  expired: 'Vencidos',
  terminated: 'Terminados',
};

const statusColors: Record<ContractStatus, string> = {
  active: '#10B981',
  expiring: '#F59E0B',
  expired: '#EF4444',
  terminated: '#64748B',
};

const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = parseDateOnly(value) ?? new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEffectiveEndDate(contract: any): string | null {
  const extensions = Array.isArray(contract.contract_extensions) ? contract.contract_extensions : [];
  if (!extensions.length) return contract.end_date || null;

  const sorted = [...extensions].sort((a, b) => {
    const numberA = Number(a.extension_number || 0);
    const numberB = Number(b.extension_number || 0);
    if (numberA !== numberB) return numberB - numberA;
    return (asDate(b.end_date)?.getTime() || 0) - (asDate(a.end_date)?.getTime() || 0);
  });

  return sorted[0]?.end_date || contract.end_date || null;
}

function getContractStatus(contract: any): ContractStatus {
  if (contract.is_terminated) return 'terminated';
  const normalizedType = String(contract.contract_type || '').toLowerCase();
  if (normalizedType.includes('indefin')) return 'active';

  const effectiveEndDate = asDate(getEffectiveEndDate(contract));
  if (!effectiveEndDate) return 'active';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  effectiveEndDate.setHours(0, 0, 0, 0);
  const days = differenceInCalendarDays(effectiveEndDate, today);

  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'active';
}

function getRange(period: PeriodFilter) {
  const today = new Date();
  if (period === 'all') return null;
  if (period === 'ytd') return { start: new Date(today.getFullYear(), 0, 1), end: today };
  const months = period === '6m' ? 6 : 12;
  return { start: startOfMonth(subMonths(today, months - 1)), end: today };
}

function isInsideRange(date: Date | null, period: PeriodFilter) {
  const range = getRange(period);
  if (!range || !date) return true;
  return !isBefore(date, range.start) && !isAfter(date, range.end);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function money(value: number) {
  return currencyFormatter.format(value || 0).replace('COP', '$');
}

function groupCount<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return Object.entries(
    items.reduce<Record<string, number>>((acc, item) => {
      const key = getKey(item) || 'Sin clasificar';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getEmployeeName(contract: any) {
  const employee = contract.employees;
  if (!employee) return 'Empleado sin vincular';
  return [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name].filter(Boolean).join(' ');
}

function getMonthlyBuckets(period: PeriodFilter) {
  const today = new Date();
  const range = getRange(period);
  const start = range?.start || startOfMonth(subMonths(today, 11));
  const end = range?.end || today;
  const months: Date[] = [];
  let cursor = startOfMonth(start);

  while (!isAfter(cursor, end)) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }

  return months;
}

export default function AnaliticaContratos() {
  const [period, setPeriod] = useState<PeriodFilter>('12m');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [centerFilter, setCenterFilter] = useState('all');

  const { canView, hasPermission } = useAuth();
  const canViewCompensation =
    canView('salarios') ||
    hasPermission('salarios', 'view') ||
    canView('compensaciones') ||
    hasPermission('compensaciones', 'view');

  const { data: contracts = [], isLoading } = useContracts();
  const { data: contractTypes = [] } = useContractTypes();
  const { data: operationCenters = [] } = useOperationCenters();

  const typeLabelMap = useMemo(() => {
    return Object.fromEntries(contractTypes.map((type) => [type.contract_type, type.display_name || type.contract_type]));
  }, [contractTypes]);

  const enrichedContracts = useMemo(() => {
    return contracts.map((contract: any) => {
      const status = getContractStatus(contract);
      const effectiveEnd = getEffectiveEndDate(contract);
      const effectiveEndDate = asDate(effectiveEnd);
      const startDate = asDate(contract.start_date);
      const createdDate = asDate(contract.created_at);
      const salary = Number(contract.salary || 0);
      const daysToEnd = effectiveEndDate ? differenceInCalendarDays(effectiveEndDate, new Date()) : null;

      return {
        ...contract,
        status,
        statusLabel: statusLabels[status],
        effectiveEnd,
        effectiveEndDate,
        startDate,
        createdDate,
        salary,
        daysToEnd,
        typeLabel: typeLabelMap[contract.contract_type] || contract.contract_type || 'Sin tipo',
        centerName: contract.employees?.operation_centers?.name || 'Sin centro',
      };
    });
  }, [contracts, typeLabelMap]);

  const filteredContracts = useMemo(() => {
    return enrichedContracts.filter((contract) => {
      const periodDate = contract.startDate || contract.createdDate;
      const matchesPeriod = isInsideRange(periodDate, period);
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      const matchesType = typeFilter === 'all' || contract.contract_type === typeFilter;
      const matchesCenter = centerFilter === 'all' || contract.employees?.operation_center_id === centerFilter;
      return matchesPeriod && matchesStatus && matchesType && matchesCenter;
    });
  }, [centerFilter, enrichedContracts, period, statusFilter, typeFilter]);

  const analytics = useMemo(() => {
    const total = filteredContracts.length;
    const active = filteredContracts.filter((contract) => contract.status === 'active').length;
    const expiring = filteredContracts.filter((contract) => contract.status === 'expiring').length;
    const expired = filteredContracts.filter((contract) => contract.status === 'expired').length;
    const terminated = filteredContracts.filter((contract) => contract.status === 'terminated').length;
    const approved = filteredContracts.filter((contract) => contract.is_approved).length;
    const pendingApproval = total - approved;
    const withExtensions = filteredContracts.filter((contract) => contract.contract_extensions?.length > 0).length;
    const indefinite = filteredContracts.filter((contract) => String(contract.contract_type || '').toLowerCase().includes('indefin')).length;
    const salaries = filteredContracts.map((contract) => contract.salary).filter((value) => value > 0);
    const payrollExposure = salaries.reduce((sum, value) => sum + value, 0);
    const avgSalary = salaries.length ? payrollExposure / salaries.length : 0;
    const approvalRate = percent(approved, total);
    const extensionRate = percent(withExtensions, total);
    const riskRate = percent(expiring + expired, total);

    const statusData = (['active', 'expiring', 'expired', 'terminated'] as ContractStatus[]).map((status) => ({
      name: statusLabels[status],
      value: filteredContracts.filter((contract) => contract.status === status).length,
      color: statusColors[status],
    }));

    const typeData = groupCount(filteredContracts, (contract) => contract.typeLabel).slice(0, 7);
    const centerData = groupCount(filteredContracts, (contract) => contract.centerName).slice(0, 8);

    const salaryByType = groupCount(filteredContracts, (contract) => contract.typeLabel)
      .map((entry) => {
        const items = filteredContracts.filter((contract) => contract.typeLabel === entry.name && contract.salary > 0);
        const totalSalary = items.reduce((sum, contract) => sum + contract.salary, 0);
        return {
          name: entry.name,
          contratos: entry.value,
          promedio: items.length ? Math.round(totalSalary / items.length) : 0,
          masa: totalSalary,
        };
      })
      .slice(0, 7);

    const months = getMonthlyBuckets(period);
    const trendData = months.map((month) => {
      const monthKey = format(month, 'yyyy-MM');
      return {
        name: format(month, 'MMM yy', { locale: es }),
        creados: filteredContracts.filter((contract) => {
          const date = contract.startDate || contract.createdDate;
          return date && format(date, 'yyyy-MM') === monthKey;
        }).length,
        vencen: filteredContracts.filter((contract) => {
          return contract.effectiveEndDate && format(contract.effectiveEndDate, 'yyyy-MM') === monthKey;
        }).length,
        aprobados: filteredContracts.filter((contract) => {
          const date = contract.createdDate;
          return contract.is_approved && date && format(date, 'yyyy-MM') === monthKey;
        }).length,
      };
    });

    const maturityBuckets = [
      { name: 'Vencidos', value: filteredContracts.filter((contract) => contract.daysToEnd !== null && contract.daysToEnd < 0).length, color: '#EF4444' },
      { name: '0-15 dias', value: filteredContracts.filter((contract) => contract.daysToEnd !== null && contract.daysToEnd >= 0 && contract.daysToEnd <= 15).length, color: '#F97316' },
      { name: '16-30 dias', value: filteredContracts.filter((contract) => contract.daysToEnd !== null && contract.daysToEnd > 15 && contract.daysToEnd <= 30).length, color: '#F59E0B' },
      { name: '31-60 dias', value: filteredContracts.filter((contract) => contract.daysToEnd !== null && contract.daysToEnd > 30 && contract.daysToEnd <= 60).length, color: '#0EA5E9' },
      { name: '+60 dias', value: filteredContracts.filter((contract) => contract.daysToEnd !== null && contract.daysToEnd > 60).length, color: '#10B981' },
      { name: 'Indefinidos', value: filteredContracts.filter((contract) => contract.daysToEnd === null).length, color: '#8B5CF6' },
    ];

    const expiringContracts = filteredContracts
      .filter((contract) => !contract.is_terminated && contract.daysToEnd !== null && contract.daysToEnd <= 90)
      .sort((a, b) => (a.daysToEnd ?? 999) - (b.daysToEnd ?? 999))
      .slice(0, 8);

    return {
      total,
      active,
      expiring,
      expired,
      terminated,
      approved,
      pendingApproval,
      withExtensions,
      indefinite,
      payrollExposure,
      avgSalary,
      approvalRate,
      extensionRate,
      riskRate,
      statusData,
      typeData,
      centerData,
      salaryByType,
      trendData,
      maturityBuckets,
      expiringContracts,
    };
  }, [filteredContracts, period]);

  const resetFilters = () => {
    setPeriod('12m');
    setStatusFilter('all');
    setTypeFilter('all');
    setCenterFilter('all');
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </span>
              <Badge variant="outline" className="bg-primary/5 text-primary">Contratos</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Analitica de Contratos</h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-muted-foreground">
                Lectura ejecutiva de vigencias, vencimientos, aprobaciones, prorrogas, centros de operacion y exposicion salarial.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:flex">
            <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-background lg:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">Ultimos 6 meses</SelectItem>
                <SelectItem value="12m">Ultimos 12 meses</SelectItem>
                <SelectItem value="ytd">Este ano</SelectItem>
                <SelectItem value="all">Historico</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-background lg:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Vigentes</SelectItem>
                <SelectItem value="expiring">Por vencer</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
                <SelectItem value="terminated">Terminados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-background lg:w-[210px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {contractTypes.map((type) => (
                  <SelectItem key={type.id} value={type.contract_type}>{type.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-background lg:w-[230px]">
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {operationCenters.map((center) => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-10 rounded-lg" onClick={resetFilters}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Contratos analizados', value: integerFormatter.format(analytics.total), icon: FileText, tone: 'bg-sky-500/10 text-sky-600', detail: `${analytics.active} vigentes` },
          { label: 'Riesgo de vencimiento', value: `${analytics.riskRate}%`, icon: AlertTriangle, tone: 'bg-amber-500/10 text-amber-600', detail: `${analytics.expiring} por vencer | ${analytics.expired} vencidos` },
          { label: 'Aprobacion', value: `${analytics.approvalRate}%`, icon: ShieldCheck, tone: 'bg-emerald-500/10 text-emerald-600', detail: `${analytics.pendingApproval} pendientes` },
          { label: 'Con prorrogas', value: `${analytics.extensionRate}%`, icon: Layers3, tone: 'bg-violet-500/10 text-violet-600', detail: `${analytics.withExtensions} contratos` },
        ].map((item) => (
          <Card key={item.label} className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', item.tone)}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black leading-none text-foreground">{item.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-foreground/80">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canViewCompensation && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{money(analytics.payrollExposure)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Masa salarial mensual</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{money(analytics.avgSalary)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Promedio salarial</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-500/10 text-slate-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{integerFormatter.format(analytics.indefinite)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Contratos indefinidos</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tendencia contractual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="creados" name="Inician" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="aprobados" name="Aprobados" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="vencen" name="Vencen" stroke="#EF4444" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Estado del portafolio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={94} paddingAngle={3}>
                    {analytics.statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {analytics.statusData.map((entry) => (
                <div key={entry.name} className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="truncate text-xs font-semibold text-muted-foreground">{entry.name}</span>
                  </div>
                  <p className="mt-1 text-lg font-black">{entry.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileClock className="h-4 w-4 text-primary" />
              Contratos por tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.typeData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Contratos" radius={[0, 4, 4, 0]}>
                    {analytics.typeData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary" />
              Concentracion por centro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.centerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" name="Contratos" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.2} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" />
              Matriz de vencimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="18%" outerRadius="95%" data={analytics.maturityBuckets} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} background>
                    {analytics.maturityBuckets.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </RadialBar>
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {analytics.maturityBuckets.map((bucket) => (
                <div key={bucket.name} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bucket.color }} />
                    {bucket.name}
                  </span>
                  <span className="text-sm font-black">{bucket.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" />
              Proximos vencimientos y alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.expiringContracts.length > 0 ? (
                analytics.expiringContracts.map((contract) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-3 rounded-lg border border-border bg-background px-3 py-3 md:grid-cols-[minmax(0,1fr)_120px_110px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{getEmployeeName(contract)}</p>
                      <p className="truncate text-xs text-muted-foreground">{contract.typeLabel} | {contract.centerName}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'w-fit justify-center',
                        (contract.daysToEnd ?? 0) < 0
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : (contract.daysToEnd ?? 0) <= 30
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-sky-200 bg-sky-50 text-sky-700'
                      )}
                    >
                      {(contract.daysToEnd ?? 0) < 0 ? `${Math.abs(contract.daysToEnd ?? 0)} dias vencido` : `${contract.daysToEnd} dias`}
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {contract.effectiveEndDate ? format(contract.effectiveEndDate, 'd MMM yyyy', { locale: es }) : 'Sin fecha'}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-bold">Sin alertas de vencimiento en este filtro</p>
                  <p className="mt-1 text-xs text-muted-foreground">No hay contratos vencidos o por vencer en los proximos 90 dias.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {canViewCompensation && (
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins className="h-4 w-4 text-primary" />
              Analisis salarial por tipo de contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.salaryByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis yAxisId="left" tickFormatter={(value) => money(Number(value)).replace(/\s/g, '')} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
                  <Tooltip formatter={(value, name) => name === 'promedio' || name === 'masa' ? money(Number(value)) : value} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="masa" name="Masa salarial" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="promedio" name="Salario promedio" stroke="#F97316" strokeWidth={3} />
                  <Line yAxisId="right" type="monotone" dataKey="contratos" name="Contratos" stroke="#8B5CF6" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
