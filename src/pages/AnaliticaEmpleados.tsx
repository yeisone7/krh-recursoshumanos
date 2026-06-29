import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Radar,
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
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
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  FileCheck2,
  Gauge,
  HeartPulse,
  IdCard,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  differenceInCalendarDays,
  differenceInYears,
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
import { useEmployees } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';
import { parseDateOnly } from '@/lib/dateOnly';
import { cn } from '@/lib/utils';

type PeriodFilter = '6m' | '12m' | 'ytd' | 'all';
type EmployeeStatus = 'active' | 'inactive' | 'retired' | 'en_retiro' | 'new';

const chartColors = ['#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#64748B', '#EC4899'];
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function asDate(value: string | null | undefined) {
  if (!value) return null;
  const date = parseDateOnly(value) ?? new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getRange(period: PeriodFilter) {
  const today = new Date();
  if (period === 'all') return null;
  if (period === 'ytd') return { start: new Date(today.getFullYear(), 0, 1), end: today };
  return { start: startOfMonth(subMonths(today, period === '6m' ? 5 : 11)), end: today };
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
  return Object.entries(items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) || 'Sin clasificar';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function getEmployeeName(employee: any) {
  return [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name].filter(Boolean).join(' ');
}

function getEmployeeStatus(employee: any): EmployeeStatus {
  if (employee.status === 'retired' || (!employee.is_active && employee.status === 'active')) return 'retired';
  if (employee.status === 'en_retiro') return 'en_retiro';
  if (!employee.is_active || employee.status === 'suspended') return 'inactive';
  const created = asDate(employee.created_at);
  if (created && differenceInCalendarDays(new Date(), created) <= 30) return 'new';
  return 'active';
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function getProfileScore(employee: any, related: RelatedData) {
  const checks = [
    employee.document_number,
    employee.birth_date,
    employee.gender,
    employee.marital_status,
    employee.work_info?.operation_center_id,
    employee.work_info?.position_name,
    employee.work_info?.hire_date,
    employee.contact?.mobile || employee.contact?.phone,
    employee.contact?.email || employee.contact?.personal_email,
    related.socialByEmployee[employee.id]?.eps,
    related.socialByEmployee[employee.id]?.afp,
    related.socialByEmployee[employee.id]?.arl,
    related.bankByEmployee[employee.id]?.bank_name,
    related.scheduleByEmployee[employee.id]?.payroll_type,
  ];

  return Math.round((checks.filter(hasValue).length / checks.length) * 100);
}

function getMonthlyBuckets(period: PeriodFilter) {
  const today = new Date();
  const range = getRange(period);
  const start = range?.start || startOfMonth(subMonths(today, 11));
  const end = range?.end || today;
  const months: Date[] = [];
  let cursor = start;

  while (!isAfter(cursor, end)) {
    months.push(cursor);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return months;
}

async function fetchRows(table: string, companyId: string, employeeIds: string[], select: string) {
  if (employeeIds.length === 0) return [];
  const { data, error } = await (supabase.from(table as any) as any)
    .select(select)
    .eq('company_id', companyId)
    .in('employee_id', employeeIds);

  if (error) throw error;
  return data || [];
}

function indexCurrent(rows: any[]) {
  return rows.reduce<Record<string, any>>((acc, row) => {
    const existing = acc[row.employee_id];
    if (!existing || row.is_current || row.is_active || row.created_at > existing.created_at) {
      acc[row.employee_id] = row;
    }
    return acc;
  }, {});
}

interface RelatedData {
  socialByEmployee: Record<string, any>;
  bankByEmployee: Record<string, any>;
  familyByEmployee: Record<string, any>;
  scheduleByEmployee: Record<string, any>;
  documentCounts: Record<string, number>;
}

function useEmployeeAnalyticsRelated(employeeIds: string[]) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee_analytics_related', currentCompanyId, employeeIds.join(',')],
    queryFn: async (): Promise<RelatedData> => {
      if (!currentCompanyId || employeeIds.length === 0) {
        return { socialByEmployee: {}, bankByEmployee: {}, familyByEmployee: {}, scheduleByEmployee: {}, documentCounts: {} };
      }

      const [socialRows, bankRows, familyRows, scheduleRows, documentRows] = await Promise.all([
        fetchRows('employee_social_security', currentCompanyId, employeeIds, 'employee_id, eps, afp, arl, ccf, risk_level, is_current, created_at'),
        fetchRows('employee_bank_info', currentCompanyId, employeeIds, 'employee_id, bank_name, account_type, account_registered, is_current, created_at'),
        fetchRows('employee_family', currentCompanyId, employeeIds, 'employee_id, children_count, spouse_name, is_current, created_at'),
        fetchRows('employee_schedule', currentCompanyId, employeeIds, 'employee_id, payroll_type, is_office_schedule, rest_day, is_current, created_at'),
        fetchRows('employee_documents', currentCompanyId, employeeIds, 'employee_id, is_valid'),
      ]);

      const documentCounts = documentRows.reduce<Record<string, number>>((acc, row: any) => {
        if (row.is_valid) acc[row.employee_id] = (acc[row.employee_id] || 0) + 1;
        return acc;
      }, {});

      return {
        socialByEmployee: indexCurrent(socialRows),
        bankByEmployee: indexCurrent(bankRows),
        familyByEmployee: indexCurrent(familyRows),
        scheduleByEmployee: indexCurrent(scheduleRows),
        documentCounts,
      };
    },
    enabled: !!currentCompanyId,
    staleTime: 60_000,
  });
}

export default function AnaliticaEmpleados() {
  const [period, setPeriod] = useState<PeriodFilter>('12m');
  const [statusFilter, setStatusFilter] = useState('all');
  const [centerFilter, setCenterFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');

  const { canView, hasPermission } = useAuth();
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: contracts = [], isLoading: loadingContracts } = useContracts();
  const { data: operationCenters = [] } = useOperationCenters();
  const employeeIds = useMemo(() => employees.map((employee: any) => employee.id), [employees]);
  const { data: related = { socialByEmployee: {}, bankByEmployee: {}, familyByEmployee: {}, scheduleByEmployee: {}, documentCounts: {} }, isLoading: loadingRelated } = useEmployeeAnalyticsRelated(employeeIds);

  const canViewCompensation =
    canView('salarios') ||
    hasPermission('salarios', 'view') ||
    canView('compensaciones') ||
    hasPermission('compensaciones', 'view');

  const activeContractsByEmployee = useMemo(() => {
    return contracts.reduce<Record<string, any>>((acc, contract: any) => {
      if (!contract.employee_id || contract.is_terminated) return acc;
      const endDate = asDate(contract.end_date);
      if (endDate && differenceInCalendarDays(endDate, new Date()) < 0) return acc;
      acc[contract.employee_id] = contract;
      return acc;
    }, {});
  }, [contracts]);

  const enrichedEmployees = useMemo(() => {
    return employees.map((employee: any) => {
      const hireDate = asDate(employee.work_info?.hire_date);
      const birthDate = asDate(employee.birth_date);
      const createdDate = asDate(employee.created_at);
      const age = birthDate ? differenceInYears(new Date(), birthDate) : null;
      const tenureMonths = hireDate ? Math.max(0, Math.round(differenceInCalendarDays(new Date(), hireDate) / 30.44)) : null;
      const status = getEmployeeStatus(employee);
      const contract = activeContractsByEmployee[employee.id] || null;
      const salary = Number(contract?.salary || 0);
      const profileScore = getProfileScore(employee, related);

      return {
        ...employee,
        fullName: getEmployeeName(employee),
        status,
        hireDate,
        birthDate,
        createdDate,
        age,
        tenureMonths,
        centerName: employee.operation_centers?.name || employee.work_info?.operation_centers?.name || 'Sin centro',
        centerId: employee.work_info?.operation_center_id || employee.operation_centers?.id || null,
        areaName: employee.areas?.name || employee.work_info?.areas?.name || 'Sin area',
        positionName: employee.work_info?.position_name || 'Sin cargo',
        contract,
        salary,
        social: related.socialByEmployee[employee.id] || null,
        bank: related.bankByEmployee[employee.id] || null,
        family: related.familyByEmployee[employee.id] || null,
        schedule: related.scheduleByEmployee[employee.id] || null,
        documentCount: related.documentCounts[employee.id] || 0,
        profileScore,
      };
    });
  }, [activeContractsByEmployee, employees, related]);

  const filteredEmployees = useMemo(() => {
    return enrichedEmployees.filter((employee) => {
      const matchesPeriod = isInsideRange(employee.hireDate || employee.createdDate, period);
      const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
      const matchesCenter = centerFilter === 'all' || employee.centerId === centerFilter;
      const matchesAge =
        ageFilter === 'all' ||
        (ageFilter === 'under30' && employee.age !== null && employee.age < 30) ||
        (ageFilter === '30to45' && employee.age !== null && employee.age >= 30 && employee.age <= 45) ||
        (ageFilter === 'over45' && employee.age !== null && employee.age > 45) ||
        (ageFilter === 'unknown' && employee.age === null);

      return matchesPeriod && matchesStatus && matchesCenter && matchesAge;
    });
  }, [ageFilter, centerFilter, enrichedEmployees, period, statusFilter]);

  const analytics = useMemo(() => {
    const total = filteredEmployees.length;
    const active = filteredEmployees.filter((employee) => employee.status === 'active' || employee.status === 'new').length;
    const inactive = filteredEmployees.filter((employee) => employee.status === 'inactive').length;
    const retired = filteredEmployees.filter((employee) => employee.status === 'retired').length;
    const inRetirement = filteredEmployees.filter((employee) => employee.status === 'en_retiro').length;
    const newEmployees = filteredEmployees.filter((employee) => employee.status === 'new').length;
    const withContract = filteredEmployees.filter((employee) => !!employee.contract).length;
    const withoutContract = total - withContract;
    const withCompleteSocial = filteredEmployees.filter((employee) => employee.social?.eps && employee.social?.afp && employee.social?.arl).length;
    const withBank = filteredEmployees.filter((employee) => !!employee.bank?.bank_name).length;
    const withContact = filteredEmployees.filter((employee) => employee.contact?.mobile || employee.contact?.phone).length;
    const avgProfileScore = total ? Math.round(filteredEmployees.reduce((sum, employee) => sum + employee.profileScore, 0) / total) : 0;
    const salaries = filteredEmployees.map((employee) => employee.salary).filter((salary) => salary > 0);
    const payrollExposure = salaries.reduce((sum, salary) => sum + salary, 0);
    const avgSalary = salaries.length ? payrollExposure / salaries.length : 0;
    const averageAgeValues = filteredEmployees.map((employee) => employee.age).filter((age): age is number => age !== null);
    const avgAge = averageAgeValues.length ? averageAgeValues.reduce((sum, age) => sum + age, 0) / averageAgeValues.length : 0;
    const tenureValues = filteredEmployees.map((employee) => employee.tenureMonths).filter((tenure): tenure is number => tenure !== null);
    const avgTenure = tenureValues.length ? tenureValues.reduce((sum, tenure) => sum + tenure, 0) / tenureValues.length : 0;

    const statusData = [
      { name: 'Activos', value: active, color: '#10B981' },
      { name: 'Inactivos', value: inactive, color: '#64748B' },
      { name: 'Retirados', value: retired, color: '#EF4444' },
      { name: 'En retiro', value: inRetirement, color: '#F59E0B' },
    ];

    const ageData = [
      { name: '<30', value: filteredEmployees.filter((employee) => employee.age !== null && employee.age < 30).length },
      { name: '30-45', value: filteredEmployees.filter((employee) => employee.age !== null && employee.age >= 30 && employee.age <= 45).length },
      { name: '46-60', value: filteredEmployees.filter((employee) => employee.age !== null && employee.age > 45 && employee.age <= 60).length },
      { name: '>60', value: filteredEmployees.filter((employee) => employee.age !== null && employee.age > 60).length },
      { name: 'Sin dato', value: filteredEmployees.filter((employee) => employee.age === null).length },
    ];

    const tenureData = [
      { name: '<6 meses', value: filteredEmployees.filter((employee) => employee.tenureMonths !== null && employee.tenureMonths < 6).length, color: '#0EA5E9' },
      { name: '6-12 meses', value: filteredEmployees.filter((employee) => employee.tenureMonths !== null && employee.tenureMonths >= 6 && employee.tenureMonths < 12).length, color: '#14B8A6' },
      { name: '1-3 anos', value: filteredEmployees.filter((employee) => employee.tenureMonths !== null && employee.tenureMonths >= 12 && employee.tenureMonths < 36).length, color: '#10B981' },
      { name: '3-5 anos', value: filteredEmployees.filter((employee) => employee.tenureMonths !== null && employee.tenureMonths >= 36 && employee.tenureMonths < 60).length, color: '#F59E0B' },
      { name: '+5 anos', value: filteredEmployees.filter((employee) => employee.tenureMonths !== null && employee.tenureMonths >= 60).length, color: '#8B5CF6' },
      { name: 'Sin dato', value: filteredEmployees.filter((employee) => employee.tenureMonths === null).length, color: '#64748B' },
    ];

    const centerData = groupCount(filteredEmployees, (employee) => employee.centerName).slice(0, 10);
    const areaData = groupCount(filteredEmployees, (employee) => employee.areaName).slice(0, 8);
    const positionData = groupCount(filteredEmployees, (employee) => employee.positionName).slice(0, 10);
    const genderData = groupCount(filteredEmployees, (employee) => employee.gender || 'Sin dato');
    const payrollTypeData = groupCount(filteredEmployees, (employee) => employee.schedule?.payroll_type || 'Sin nomina');
    const riskData = groupCount(filteredEmployees, (employee) => employee.social?.risk_level || 'Sin riesgo');

    const qualityRadar = [
      { subject: 'Contacto', value: percent(withContact, total) },
      { subject: 'Seguridad social', value: percent(withCompleteSocial, total) },
      { subject: 'Banco', value: percent(withBank, total) },
      { subject: 'Contrato', value: percent(withContract, total) },
      { subject: 'Documentos', value: percent(filteredEmployees.filter((employee) => employee.documentCount > 0).length, total) },
      { subject: 'Ficha base', value: avgProfileScore },
    ];

    const months = getMonthlyBuckets(period);
    const trendData = months.map((month) => {
      const monthKey = format(month, 'yyyy-MM');
      return {
        name: format(month, 'MMM yy', { locale: es }),
        ingresos: filteredEmployees.filter((employee) => employee.hireDate && format(employee.hireDate, 'yyyy-MM') === monthKey).length,
        creados: filteredEmployees.filter((employee) => employee.createdDate && format(employee.createdDate, 'yyyy-MM') === monthKey).length,
        retiros: filteredEmployees.filter((employee) => {
          const date = asDate(employee.work_info?.termination_date);
          return date && format(date, 'yyyy-MM') === monthKey;
        }).length,
      };
    });

    const alerts = filteredEmployees
      .filter((employee) => employee.profileScore < 70 || !employee.contract || !employee.social?.eps || !employee.bank?.bank_name)
      .sort((a, b) => a.profileScore - b.profileScore)
      .slice(0, 9);

    return {
      total,
      active,
      inactive,
      retired,
      inRetirement,
      newEmployees,
      withContract,
      withoutContract,
      withCompleteSocial,
      withBank,
      withContact,
      avgProfileScore,
      payrollExposure,
      avgSalary,
      avgAge,
      avgTenure,
      statusData,
      ageData,
      tenureData,
      centerData,
      areaData,
      positionData,
      genderData,
      payrollTypeData,
      riskData,
      qualityRadar,
      trendData,
      alerts,
    };
  }, [filteredEmployees, period]);

  const resetFilters = () => {
    setPeriod('12m');
    setStatusFilter('all');
    setCenterFilter('all');
    setAgeFilter('all');
  };

  const isLoading = loadingEmployees || loadingContracts || loadingRelated;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-96 rounded-lg" />
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
                <Users className="h-5 w-5" />
              </span>
              <Badge variant="outline" className="bg-primary/5 text-primary">Personal</Badge>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">Analitica de Empleados</h1>
              <p className="mt-1 max-w-3xl text-sm font-medium text-muted-foreground">
                Lectura integral de poblacion laboral, cobertura contractual, estructura organizacional, calidad de datos, seguridad social, cargos, centros y tendencias de ingreso.
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
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="new">Nuevos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="retired">Retirados</SelectItem>
                <SelectItem value="en_retiro">En retiro</SelectItem>
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

            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger className="h-10 w-full rounded-lg bg-background lg:w-[150px]">
                <SelectValue placeholder="Edad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las edades</SelectItem>
                <SelectItem value="under30">Menores de 30</SelectItem>
                <SelectItem value="30to45">30 a 45</SelectItem>
                <SelectItem value="over45">Mayores de 45</SelectItem>
                <SelectItem value="unknown">Sin dato</SelectItem>
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
          { label: 'Empleados analizados', value: integerFormatter.format(analytics.total), icon: Users, tone: 'bg-sky-500/10 text-sky-600', detail: `${analytics.active} activos` },
          { label: 'Ficha completa', value: `${analytics.avgProfileScore}%`, icon: Gauge, tone: 'bg-emerald-500/10 text-emerald-600', detail: 'Promedio de calidad de datos' },
          { label: 'Sin contrato vigente', value: integerFormatter.format(analytics.withoutContract), icon: AlertTriangle, tone: 'bg-amber-500/10 text-amber-600', detail: `${percent(analytics.withoutContract, analytics.total)}% de la muestra` },
          { label: 'Nuevos ingresos', value: integerFormatter.format(analytics.newEmployees), icon: UserPlus, tone: 'bg-violet-500/10 text-violet-600', detail: 'Ultimos 30 dias' },
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Seguridad social completa', value: `${percent(analytics.withCompleteSocial, analytics.total)}%`, icon: ShieldCheck, tone: 'bg-teal-500/10 text-teal-600', detail: `${analytics.withCompleteSocial} empleados` },
          { label: 'Datos bancarios', value: `${percent(analytics.withBank, analytics.total)}%`, icon: IdCard, tone: 'bg-orange-500/10 text-orange-600', detail: `${analytics.withBank} con banco` },
          { label: 'Edad promedio', value: analytics.avgAge ? `${numberFormatter.format(analytics.avgAge)} anos` : 'Sin dato', icon: UserCheck, tone: 'bg-rose-500/10 text-rose-600', detail: 'Sobre empleados con nacimiento' },
          { label: 'Antiguedad promedio', value: analytics.avgTenure ? `${numberFormatter.format(analytics.avgTenure / 12)} anos` : 'Sin dato', icon: Clock3, tone: 'bg-slate-500/10 text-slate-600', detail: 'Desde fecha de ingreso' },
        ].map((item) => (
          <Card key={item.label} className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', item.tone)}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black leading-none text-foreground">{item.value}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-foreground/80">{item.label}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canViewCompensation && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{money(analytics.payrollExposure)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Masa salarial mensual con contrato vigente</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-lg border-border bg-card shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-black">{money(analytics.avgSalary)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Salario promedio contratado</p>
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
              Tendencia de ingresos y retiros
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
                  <Bar dataKey="ingresos" name="Ingresos laborales" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="creados" name="Fichas creadas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="retiros" name="Retiros" stroke="#EF4444" strokeWidth={3} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck2 className="h-4 w-4 text-primary" />
              Estado de personal
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
              <Building2 className="h-4 w-4 text-primary" />
              Distribucion por centro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.centerData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Empleados" radius={[0, 4, 4, 0]}>
                    {analytics.centerData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary" />
              Top cargos por concentracion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.positionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" name="Empleados" stroke="#14B8A6" fill="#14B8A6" fillOpacity={0.2} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              Estructura demografica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Empleados" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-4 w-4 text-primary" />
              Antiguedad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="18%" outerRadius="95%" data={analytics.tenureData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={6} background>
                    {analytics.tenureData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </RadialBar>
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Calidad de informacion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.qualityRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Cobertura" dataKey="value" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.25} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-primary" />
              Riesgo, genero y nomina
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            {[
              { title: 'Genero', data: analytics.genderData },
              { title: 'Tipo de nomina', data: analytics.payrollTypeData },
              { title: 'Nivel de riesgo', data: analytics.riskData },
            ].map((section) => (
              <div key={section.title} className="rounded-lg border border-border bg-background p-3">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-muted-foreground">{section.title}</p>
                <div className="space-y-2">
                  {section.data.slice(0, 5).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-foreground">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="text-sm font-black">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Alertas de informacion accionable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.alerts.length > 0 ? (
                analytics.alerts.map((employee) => (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-3 rounded-lg border border-border bg-background px-3 py-3 md:grid-cols-[minmax(0,1fr)_90px_160px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{employee.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{employee.positionName} | {employee.centerName}</p>
                    </div>
                    <Badge variant="outline" className={cn(
                      'w-fit justify-center',
                      employee.profileScore < 50 ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                    )}>
                      {employee.profileScore}%
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {!employee.contract ? 'Sin contrato vigente' : !employee.social?.eps ? 'Falta seguridad social' : !employee.bank?.bank_name ? 'Falta banco' : 'Ficha incompleta'}
                    </span>
                  </motion.div>
                ))
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background text-center">
                  <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
                  <p className="text-sm font-bold">Sin alertas criticas en este filtro</p>
                  <p className="mt-1 text-xs text-muted-foreground">La muestra actual tiene datos esenciales cubiertos.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Areas con mayor poblacion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.areaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Empleados" radius={[4, 4, 0, 0]}>
                  {analytics.areaData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
