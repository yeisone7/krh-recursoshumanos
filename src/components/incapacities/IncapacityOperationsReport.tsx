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
  getUniqueDiagnosisCount,
  summarizeByOperationCenter,
  summarizeIncapacityOperationsRows,
  type IncapacityOperationsRow,
} from '@/lib/incapacityOperationsReport';

const reportColors = ['#0EA5B7', '#F97316', '#334155', '#EAB308', '#8B5CF6', '#22C55E', '#3B82F6', '#EC4899'];
const integerFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

function ReportMetric({ label, value, detail, icon: Icon, color }: {
  label: string;
  value: number;
  detail: string;
  icon: typeof CalendarDays;
  color: string;
}) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-950">{integerFormatter.format(value)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ color, backgroundColor: `${color}18` }}>
          <Icon className="h-5 w-5" />
        </span>
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
    };
  }, [employeeId, month, operationCenterId, positionName, rows]);

  const months = useMemo(() => sortedOptions(rows, (row) => row.startDate.slice(0, 7)).reverse(), [rows]);
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric label="Cantidad de incapacidades" value={report.filtered.length} detail="Registros en el filtro" icon={BarChart3} color="#0EA5B7" />
        <ReportMetric label="Días de incapacidad" value={report.totalDays} detail="Días totales acumulados" icon={CalendarDays} color="#F97316" />
        <ReportMetric label="Diagnósticos detectados" value={report.diagnoses} detail="Diagnósticos únicos" icon={Stethoscope} color="#8B5CF6" />
        <ReportMetric label="Colaboradores afectados" value={report.affectedEmployees} detail="Personas con registros" icon={Users} color="#334155" />
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
              <p className="mt-1 text-xs font-semibold text-slate-500">Días agrupados por persona, centro, cargo y concepto</p>
            </div>
            <div className="[&>div]:max-h-[340px] [&>div]:overflow-auto">
              <Table>
                <TableHeader className="bg-slate-900">
                  <TableRow className="border-slate-700 hover:bg-slate-900">
                    {['Colaborador', 'Centro de operación', 'Cargo', 'Concepto', 'Casos', 'Días'].map((label) => (
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
            <p className="mt-1 text-xs font-semibold text-slate-500">Casos y días acumulados para los filtros seleccionados</p>
          </div>
          <div className="[&>div]:max-h-[360px] [&>div]:overflow-auto">
            <Table>
              <TableHeader className="bg-slate-900">
                <TableRow className="border-slate-700 hover:bg-slate-900">
                  {['Centro de operación', 'Casos', 'Días'].map((label, index) => (
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
