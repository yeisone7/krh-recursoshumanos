import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Building2, CalendarDays, RotateCcw, Stethoscope, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  countBy,
  filterIncapacityOperationsRows,
  getIncapacityOperationsMonths,
  getUniqueDiagnosisCount,
  summarizeByOperationCenter,
  summarizeIncapacityOperationsRows,
  type IncapacityOperationsRow,
} from '@/lib/incapacityOperationsReport';
import type { BiologicalSexKey } from '@/lib/biologicalSex';

const reportColors = ['#0EA5B7', '#F97316', '#334155', '#EAB308', '#8B5CF6', '#22C55E', '#3B82F6', '#EC4899'];
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const sexDefinitions = [
  { key: 'F' as const, label: 'Femenino', color: '#EC4899' },
  { key: 'M' as const, label: 'Masculino', color: '#0891B2' },
  { key: 'O' as const, label: 'Otro', color: '#8B5CF6' },
  { key: 'sin_dato' as const, label: 'Sin dato', color: '#64748B' },
];

function MetricBubble({ label, value, detail, icon: Icon, color }: {
  label: string;
  value: number;
  detail: string;
  icon: typeof CalendarDays;
  color: string;
}) {
  return (
    <div className="group relative mx-auto flex aspect-square w-full max-w-[176px] items-center justify-center rounded-full p-5 text-center shadow-xl transition-transform duration-300 hover:-translate-y-1" style={{ backgroundColor: color }}>
      <div className="absolute inset-2 rounded-full border border-white/25" />
      <div className="relative z-10 text-white">
        <Icon className="mx-auto mb-2 h-5 w-5 opacity-90" aria-hidden="true" />
        <p className="text-[10px] font-black uppercase leading-tight tracking-wider text-white/90">{label}</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-white">{integerFormatter.format(value)}</p>
        <p className="mt-1 text-[10px] font-semibold text-white/75">{detail}</p>
      </div>
    </div>
  );
}

function OperationalSnapshotInfographic({ cases, days, daysLabel, diagnoses, affectedEmployees }: {
  cases: number;
  days: number;
  daysLabel: string;
  diagnoses: number;
  affectedEmployees: number;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg" style={{ background: 'linear-gradient(145deg, #0F172A 0%, #172554 58%, #083344 100%)' }}>
      <CardContent className="relative p-5 sm:p-6">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] !text-cyan-300">Resumen visual</p>
              <h3 className="mt-1 text-xl font-black !text-white">Panorama de incapacidades</h3>
              <p className="mt-1 text-xs font-medium !text-slate-300">Indicadores principales para los filtros seleccionados</p>
            </div>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider !text-white">
              {integerFormatter.format(affectedEmployees)} colaboradores
            </span>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-3">
            <MetricBubble label="Incapacidades" value={cases} detail="casos registrados" icon={BarChart3} color="#F97316" />
            <MetricBubble label={daysLabel} value={days} detail="días ocurridos" icon={CalendarDays} color="#06A7B9" />
            <MetricBubble label="Diagnósticos" value={diagnoses} detail="diagnósticos únicos" icon={Stethoscope} color="#8B5CF6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SexInfographicItem {
  key: BiologicalSexKey;
  label: string;
  color: string;
  cases: number;
  days: number;
  employees: number;
  percentage: number;
}

function SexDistributionInfographic({ data, totalCases }: { data: SexInfographicItem[]; totalCases: number }) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-lg">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-600">Distribución por sexo</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Participación de los casos</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">Casos, días y colaboradores afectados</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-pink-600">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[190px_1fr] sm:items-center">
          <div className="relative mx-auto h-[190px] w-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="cases" nameKey="label" innerRadius={58} outerRadius={84} paddingAngle={3} stroke="none">
                  {data.map((item) => <Cell key={item.key} fill={item.color} />)}
                </Pie>
                <Tooltip content={<ReportTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-950">{integerFormatter.format(totalCases)}</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">casos</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {data.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3" style={{ borderLeftColor: item.color, borderLeftWidth: 5 }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-800">{item.label}</span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-black text-white" style={{ backgroundColor: item.color }}>{item.percentage}%</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <span className="text-[10px] font-bold text-slate-500"><strong className="block text-sm text-slate-950">{integerFormatter.format(item.cases)}</strong>casos</span>
                  <span className="text-[10px] font-bold text-slate-500"><strong className="block text-sm text-slate-950">{integerFormatter.format(item.days)}</strong>días</span>
                  <span className="text-[10px] font-bold text-slate-500"><strong className="block text-sm text-slate-950">{integerFormatter.format(item.employees)}</strong>personas</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportChart({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">{subtitle}</p>
        <div className="mt-4 h-[300px]">{children}</div>
      </CardContent>
    </Card>
  );
}

interface TooltipEntry {
  name?: string;
  dataKey?: string | number;
  value?: string | number;
}

function ReportTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 max-w-64 font-black text-slate-900">{label}</p>}
      {payload.map((entry) => (
        <p key={`${entry.name}-${entry.dataKey}`} className="font-semibold text-slate-600">
          {entry.name}: <span className="font-black text-slate-950">{integerFormatter.format(Number(entry.value) || 0)}</span>
        </p>
      ))}
    </div>
  );
}

function sortedOptions(rows: IncapacityOperationsRow[], getValue: (row: IncapacityOperationsRow) => string) {
  return [...new Set(rows.map(getValue).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'es'));
}

export function IncapacityOperationsReport({ rows }: { rows: IncapacityOperationsRow[] }) {
  const [month, setMonth] = useState('all');
  const [operationCenterId, setOperationCenterId] = useState('all');
  const [positionName, setPositionName] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');

  const report = useMemo(() => {
    const filtered = filterIncapacityOperationsRows(rows, { month, operationCenterId, positionName, employeeId });
    const conceptData = countBy(filtered, (row) => row.concept);
    const positionData = countBy(filtered, (row) => row.positionName).slice(0, 10);
    const diagnosisData = countBy(filtered, (row) => row.diagnosisLabel).slice(0, 10);
    const centerData = countBy(filtered, (row) => row.operationCenterName).slice(0, 20);
    const timelineData = countBy(filtered, (row) => row.startDate)
      .map((item) => ({ date: item.name, label: format(parseISO(`${item.name}T00:00:00`), 'dd MMM yy', { locale: es }), cases: item.value }))
      .sort((left, right) => left.date.localeCompare(right.date));
    const sexData = sexDefinitions.map((definition) => {
      const matchingRows = filtered.filter((row) => row.gender === definition.key);
      return {
        ...definition,
        cases: matchingRows.length,
        days: matchingRows.reduce((total, row) => total + row.totalDays, 0),
        employees: new Set(matchingRows.map((row) => row.employeeId)).size,
        percentage: filtered.length ? Math.round((matchingRows.length / filtered.length) * 100) : 0,
      };
    }).filter((item) => item.key === 'F' || item.key === 'M' || item.cases > 0);

    return {
      filtered,
      totalDays: filtered.reduce((total, row) => total + row.totalDays, 0),
      diagnoses: getUniqueDiagnosisCount(filtered),
      affectedEmployees: new Set(filtered.map((row) => row.employeeId)).size,
      summaries: summarizeIncapacityOperationsRows(filtered),
      centerSummaries: summarizeByOperationCenter(filtered),
      conceptData,
      positionData,
      diagnosisData,
      centerData,
      timelineData,
      sexData,
    };
  }, [employeeId, month, operationCenterId, positionName, rows]);

  const months = useMemo(() => getIncapacityOperationsMonths(rows), [rows]);
  const centers = useMemo(() => {
    const byId = new Map(rows.map((row) => [row.operationCenterId, row.operationCenterName]));
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1], 'es'));
  }, [rows]);
  const positions = useMemo(() => sortedOptions(rows, (row) => row.positionName), [rows]);
  const employees = useMemo(() => {
    const byId = new Map(rows.map((row) => [row.employeeId, row.employeeName]));
    return [...byId.entries()].sort((left, right) => left[1].localeCompare(right[1], 'es'));
  }, [rows]);

  const resetFilters = () => {
    setMonth('all');
    setOperationCenterId('all');
    setPositionName('all');
    setEmployeeId('all');
  };
  const daysColumnLabel = month === 'all' ? 'Días' : 'Días del mes';

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-slate-200 !bg-slate-50 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 !text-cyan-700">
                <Building2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Informe operativo</span>
              </div>
              <h2 className="mt-2 text-2xl font-black !text-slate-950">Incapacidades por centro de operación</h2>
              <p className="mt-1 max-w-2xl text-sm font-medium !text-slate-600">
                Réplica del informe de Data Studio. “Campo” corresponde al centro de operación del colaborador.
              </p>
            </div>
            <Button onClick={resetFilters} className="border border-slate-900 !bg-slate-900 !text-white shadow-sm hover:!bg-slate-700 hover:!text-white">
              <RotateCcw className="mr-2 h-4 w-4" />
              Restablecer filtros
            </Button>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="border-slate-300 bg-white !text-slate-950 shadow-sm [&>span]:!text-slate-950 [&>svg]:text-slate-500"><SelectValue placeholder="Periodo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los meses</SelectItem>
                {months.map((value) => <SelectItem key={value} value={value}>{format(parseISO(`${value}-01T00:00:00`), 'MMMM yyyy', { locale: es })}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={operationCenterId} onValueChange={setOperationCenterId}>
              <SelectTrigger className="border-slate-300 bg-white !text-slate-950 shadow-sm [&>span]:!text-slate-950 [&>svg]:text-slate-500"><SelectValue placeholder="Centro de operación" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {centers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={positionName} onValueChange={setPositionName}>
              <SelectTrigger className="border-slate-300 bg-white !text-slate-950 shadow-sm [&>span]:!text-slate-950 [&>svg]:text-slate-500"><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los cargos</SelectItem>
                {positions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="border-slate-300 bg-white !text-slate-950 shadow-sm [&>span]:!text-slate-950 [&>svg]:text-slate-500"><SelectValue placeholder="Colaborador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los colaboradores</SelectItem>
                {employees.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.12fr_0.88fr]">
        <OperationalSnapshotInfographic
          cases={report.filtered.length}
          days={report.totalDays}
          daysLabel={month === 'all' ? 'Días totales' : 'Días del mes'}
          diagnoses={report.diagnoses}
          affectedEmployees={report.affectedEmployees}
        />
        <SexDistributionInfographic data={report.sexData} totalCases={report.filtered.length} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ReportChart title="Porcentaje según el concepto" subtitle="Participación por tipo de incapacidad o licencia">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={report.conceptData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={94} paddingAngle={2} label={({ percent }) => `${Math.round(percent * 100)}%`}>
                {report.conceptData.map((item, index) => <Cell key={item.name} fill={reportColors[index % reportColors.length]} />)}
              </Pie>
              <Tooltip content={<ReportTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </ReportChart>

        <Card className="border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardContent className="p-0">
            <div className="border-b border-slate-200 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Detalle por colaborador</h3>
              <p className="mt-1 text-xs font-semibold text-slate-500">{month === 'all' ? 'Días agrupados por persona, centro, cargo y concepto' : 'Días ocurridos dentro del mes seleccionado, agrupados por persona, centro, cargo y concepto'}</p>
            </div>
            <div className="[&>div]:max-h-[340px] [&>div]:overflow-auto">
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow className="border-slate-700 hover:bg-slate-900">
                    {['Colaborador', 'Centro de operación', 'Cargo', 'Concepto', 'Casos', daysColumnLabel].map((label) => (
                      <TableHead key={label} className="sticky top-0 z-20 h-10 whitespace-nowrap bg-slate-900 text-[10px] font-black uppercase tracking-wider text-white">{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.summaries.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="whitespace-nowrap py-2.5 text-xs font-bold">{row.employeeName}</TableCell>
                      <TableCell className="whitespace-nowrap py-2.5 text-xs">{row.operationCenterName}</TableCell>
                      <TableCell className="max-w-52 truncate py-2.5 text-xs">{row.positionName}</TableCell>
                      <TableCell className="py-2.5 text-xs font-black">{row.concept}</TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-bold">{row.cases}</TableCell>
                      <TableCell className="py-2.5 text-right text-xs font-black">{integerFormatter.format(row.totalDays)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {report.summaries.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-500">No hay registros para estos filtros.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-slate-200 p-4">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Días por centro de operación</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Casos y {month === 'all' ? 'días acumulados' : 'días ocurridos en el mes'} para los filtros seleccionados</p>
          </div>
          <div className="[&>div]:max-h-[360px] [&>div]:overflow-auto">
            <Table>
              <TableHeader className="bg-slate-900">
                <TableRow className="border-slate-700 hover:bg-slate-900">
                  {['Centro de operación', 'Casos', daysColumnLabel].map((label, index) => (
                    <TableHead
                      key={label}
                      className="sticky top-0 z-20 h-10 bg-slate-900 text-[10px] font-black uppercase tracking-wider text-white"
                      style={{ textAlign: index === 0 ? 'left' : 'right' }}
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.centerSummaries.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="py-2.5 text-xs font-bold">{row.operationCenterName}</TableCell>
                    <TableCell className="py-2.5 text-right text-xs font-bold">{integerFormatter.format(row.cases)}</TableCell>
                    <TableCell className="py-2.5 text-right text-xs font-black">{integerFormatter.format(row.totalDays)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {report.centerSummaries.length === 0 && <p className="p-8 text-center text-sm font-semibold text-slate-500">No hay centros para estos filtros.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportChart title="Cantidad de incapacidades según el cargo" subtitle="Diez cargos con más registros">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.positionData} layout="vertical" margin={{ left: 38, right: 14 }}>
              <CartesianGrid stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="value" name="Incapacidades" fill="#0EA5B7" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChart>

        <ReportChart title="Cantidad de incapacidades según el diagnóstico" subtitle="Diez diagnósticos con más registros">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.diagnosisData} layout="vertical" margin={{ left: 38, right: 14 }}>
              <CartesianGrid stroke="#E2E8F0" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="value" name="Incapacidades" fill="#F97316" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChart>

        <ReportChart title="Cantidad de incapacidades por centros" subtitle="Centros de operación con más registros">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.centerData} margin={{ left: 0, right: 14, bottom: 64 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<ReportTooltip />} />
              <Bar dataKey="value" name="Incapacidades" radius={[5, 5, 0, 0]}>
                {report.centerData.map((item, index) => <Cell key={item.name} fill={reportColors[index % reportColors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ReportChart>

        <ReportChart title="Línea de tiempo de incapacidades y licencias" subtitle="Cantidad de registros por fecha de inicio">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.timelineData} margin={{ left: -18, right: 14 }}>
              <defs>
                <linearGradient id="operationsTimeline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5B7" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#0EA5B7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" minTickGap={36} tick={{ fontSize: 9 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<ReportTooltip />} />
              <Area type="monotone" dataKey="cases" name="Incapacidades" stroke="#0EA5B7" strokeWidth={2.5} fill="url(#operationsTimeline)" />
            </AreaChart>
          </ResponsiveContainer>
        </ReportChart>
      </div>

    </div>
  );
}
