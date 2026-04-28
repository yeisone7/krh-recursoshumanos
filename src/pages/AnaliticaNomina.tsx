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
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Gauge,
  Moon,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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

const overtimeTypes = new Set<NoveltyType>(['hedo', 'heno', 'hedf', 'henf', 'rn', 'rnf', 'dominical_trabajado', 'festivo_trabajado']);
const absenceTypes = new Set<NoveltyType>(['incapacidad', 'vacaciones', 'permiso']);
const regularTypes = new Set<NoveltyType>(['jornada', 'descanso_remunerado']);

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

export default function AnaliticaNomina() {
  const defaultStart = format(subMonths(new Date(), 6), 'yyyy-MM-dd');
  const defaultEnd = format(new Date(), 'yyyy-MM-dd');
  const [centerFilter, setCenterFilter] = useState('all');
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [comparisonMode, setComparisonMode] = useState<'actual' | 'mes_anterior'>('actual');
  const [volumeThreshold, setVolumeThreshold] = useState(10);
  const [severityThreshold, setSeverityThreshold] = useState(1000000);
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
    const buildImpactRanking = (getKey: (item: any) => string) => Object.values(filteredNovelties.reduce<Record<string, any>>((acc, item: any) => {
      const name = getKey(item);
      if (!acc[name]) acc[name] = { name, volumen: 0, horas: 0, impacto: 0, empleados: new Set<string>() };
      acc[name].volumen += 1;
      acc[name].horas += Number(item.hours || 0);
      acc[name].impacto += getEstimatedImpact(item);
      acc[name].empleados.add(item.employee_id);
      return acc;
    }, {})).map((item: any) => ({
      ...item,
      horas: Math.round(item.horas * 10) / 10,
      impacto: Math.round(item.impacto),
      empleados: item.empleados.size,
      prioridad: item.volumen >= volumeThreshold && item.impacto >= severityThreshold ? 'Crítica' : item.volumen >= volumeThreshold || item.impacto >= severityThreshold ? 'Alta' : 'Normal',
    })).sort((a: any, b: any) => b.impacto - a.impacto || b.volumen - a.volumen).slice(0, 8);
    const impactRankingByType = buildImpactRanking((item: any) => NOVELTY_TYPE_LABELS[item.novelty_type as NoveltyType] || item.novelty_type || 'Sin tipo');
    const impactRankingByCenter = buildImpactRanking((item: any) => centerNameMap.get(employeeCenterMap.get(item.employee_id) as string) || 'Sin centro');
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
    };
  }, [assignments, centerNameMap, comparisonAssignments, comparisonMode, employeeCenterMap, filteredComparisonNovelties, filteredConfigs, filteredNovelties, payrollConfig?.daily_hours, salaryByEmployee, severityThreshold, shiftCycles, shifts, startDate, endDate, volumeThreshold, workSchedules]);

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
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Filter className="h-4 w-4" /> Centro de operación
              </div>
              <Select value={centerFilter} onValueChange={setCenterFilter}>
                <SelectTrigger><SelectValue placeholder="Todos los centros" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los centros</SelectItem>
                  {centerOptions.map((center) => <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>)}
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
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Comparación
              </div>
              <Select value={comparisonMode} onValueChange={(value: 'actual' | 'mes_anterior') => setComparisonMode(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actual">Solo período actual</SelectItem>
                  <SelectItem value="mes_anterior">Contra mes anterior</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4" /> Umbral volumen
              </div>
              <Input type="number" min={1} value={volumeThreshold} onChange={(event) => setVolumeThreshold(Number(event.target.value) || 1)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <DollarSign className="h-4 w-4" /> Umbral severidad
              </div>
              <Input type="number" min={0} step={100000} value={severityThreshold} onChange={(event) => setSeverityThreshold(Number(event.target.value) || 0)} />
            </div>
          </div>
        </CardContent>
      </Card>

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
              <div key={alert} className="rounded-md border border-warning/20 bg-background/70 p-3 text-sm text-foreground">
                {alert}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
