import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  FileWarning,
  Landmark,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  WalletCards,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PilaValidationStatus,
  PilaUgppValidation,
  useGeneratePilaUgppPeriod,
  usePilaUgppPeriods,
  usePilaUgppSettings,
  usePilaUgppValidations,
} from '@/hooks/usePilaUgpp';
import { cn } from '@/lib/utils';

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const statusStyles: Record<PilaValidationStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  advertencia: 'bg-amber-100 text-amber-700 border-amber-200',
  critico: 'bg-red-100 text-red-700 border-red-200',
};

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function statusLabel(status: PilaValidationStatus) {
  if (status === 'ok') return 'OK';
  if (status === 'advertencia') return 'Advertencia';
  return 'Critico';
}

function ValidationRow({ validation }: { validation: PilaUgppValidation }) {
  const mainIssue = validation.issues?.[0];

  return (
    <Card className="rounded-3xl border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-4 p-5 xl:grid-cols-[1.2fr_0.9fr_0.9fr_1.4fr] xl:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge className={cn('rounded-full border text-[10px] font-black uppercase tracking-[0.12em]', statusStyles[validation.status])}>
              {statusLabel(validation.status)}
            </Badge>
            <Badge variant="outline" className="rounded-full border-slate-200 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              {validation.issue_count} hallazgos
            </Badge>
          </div>
          <h3 className="truncate text-base font-black text-slate-950">{validation.employee_name}</h3>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {validation.document_type || 'Doc.'} {validation.document_number || 'sin numero'} · {validation.position_name || 'Cargo no asignado'}
          </p>
          <p className="mt-1 text-xs text-slate-400">{validation.operation_center_name || 'Centro no asignado'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm xl:grid-cols-1">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Salario</p>
            <p className="mt-1 font-black text-slate-900">{currencyFormatter.format(Number(validation.salary || 0))}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">IBC estimado</p>
            <p className="mt-1 font-black text-slate-900">{currencyFormatter.format(Number(validation.ibc || 0))}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600">
          {[
            ['EPS', validation.eps],
            ['AFP', validation.afp],
            ['ARL', validation.arl],
            ['CCF', validation.ccf],
          ].map(([label, value]) => (
            <div key={label} className={cn('rounded-xl border p-3', value ? 'border-emerald-100 bg-emerald-50/70' : 'border-red-100 bg-red-50/70')}>
              <span className="block text-[10px] uppercase tracking-[0.12em] text-slate-400">{label}</span>
              <span className="mt-1 line-clamp-1 block">{value || 'Falta'}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            {validation.status === 'critico' ? <AlertTriangle className="size-4 text-red-500" /> : <FileWarning className="size-4 text-amber-500" />}
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Hallazgo principal</p>
          </div>
          <p className="text-sm font-bold leading-5 text-slate-700">{mainIssue?.message || 'Sin inconsistencias detectadas.'}</p>
          {validation.issues.length > 1 && (
            <p className="mt-2 text-xs font-bold text-slate-400">+ {validation.issues.length - 1} hallazgo(s) adicional(es)</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PilaUgpp() {
  const [month, setMonth] = useState(currentMonthValue());
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [status, setStatus] = useState<PilaValidationStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const settingsQuery = usePilaUgppSettings();
  const periodsQuery = usePilaUgppPeriods();
  const generatePeriod = useGeneratePilaUgppPeriod();
  const periods = periodsQuery.data || [];
  const activePeriod = periods.find((period) => period.id === (selectedPeriodId || periods[0]?.id)) || periods[0] || null;
  const validationsQuery = usePilaUgppValidations(activePeriod?.id);
  const validations = validationsQuery.data || [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return validations.filter((validation) => {
      const matchesStatus = status === 'all' || validation.status === status;
      const matchesSearch = !term || [
        validation.employee_name,
        validation.document_number,
        validation.position_name,
        validation.operation_center_name,
        validation.eps,
        validation.afp,
        validation.arl,
        validation.ccf,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [search, status, validations]);

  const summary = useMemo(() => {
    const totalEstimated = validations.reduce((sum, item) => sum + Number((item.estimated_contributions as any)?.total || 0), 0);
    const missingSecurity = validations.filter((item) => !item.eps || !item.afp || !item.arl).length;
    return {
      totalEstimated,
      missingSecurity,
      critical: validations.filter((item) => item.status === 'critico').length,
      warnings: validations.filter((item) => item.status === 'advertencia').length,
      ok: validations.filter((item) => item.status === 'ok').length,
    };
  }, [validations]);

  const handleGenerate = async () => {
    const period = await generatePeriod.mutateAsync({ month, settings: settingsQuery.data || null });
    setSelectedPeriodId(period.id);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white">
        <div className="relative p-6 md:p-8">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-full bg-sky-50" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-3xl bg-sky-100 text-sky-600">
                <Landmark className="size-8" />
              </div>
              <div>
                <Badge className="mb-2 rounded-full bg-sky-100 text-sky-700">Seguridad Social Colombia</Badge>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">PILA / UGPP</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Valida empleados, contratos, seguridad social, incapacidades y novedades antes de consolidar aportes del periodo.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[170px_auto]">
              <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-12 rounded-2xl bg-white" />
              <Button onClick={handleGenerate} disabled={generatePeriod.isPending || !month} className="h-12 rounded-2xl bg-sky-500 px-5 font-black hover:bg-sky-600">
                <RefreshCw className="mr-2 size-4" />
                Generar validacion
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Empleados', value: activePeriod?.total_employees || 0, helper: 'En periodo', icon: UserRoundCheck, color: 'text-sky-600 bg-sky-50' },
          { label: 'Criticos', value: summary.critical, helper: 'Bloquean cierre', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
          { label: 'Advertencias', value: summary.warnings, helper: 'Revisar antes de pagar', icon: FileWarning, color: 'text-amber-600 bg-amber-50' },
          { label: 'IBC Total', value: currencyFormatter.format(Number(activePeriod?.total_ibc || 0)), helper: 'Base estimada', icon: WalletCards, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Aportes Est.', value: currencyFormatter.format(summary.totalEstimated), helper: 'Proyeccion periodo', icon: BadgeCheck, color: 'text-violet-600 bg-violet-50' },
        ].map((metric) => (
          <Card key={metric.label} className="rounded-3xl border-slate-200 bg-white shadow-sm">
            <CardContent className="flex min-h-[126px] items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
                <p className="mt-2 truncate text-2xl font-black text-slate-950">{metric.value}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{metric.helper}</p>
              </div>
              <div className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', metric.color)}>
                <metric.icon className="size-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 xl:grid-cols-[240px_1fr_200px]">
        <Select value={activePeriod?.id || ''} onValueChange={setSelectedPeriodId}>
          <SelectTrigger className="h-12 rounded-2xl">
            <SelectValue placeholder="Seleccionar periodo" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((period) => (
              <SelectItem key={period.id} value={period.id}>
                {period.period_label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar empleado, documento, cargo, centro o entidad..."
            className="h-12 rounded-2xl pl-11"
          />
        </div>

        <Select value={status} onValueChange={(value) => setStatus(value as PilaValidationStatus | 'all')}>
          <SelectTrigger className="h-12 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="critico">Criticos</SelectItem>
            <SelectItem value="advertencia">Advertencias</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {activePeriod && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 text-red-500" />
              <p className="font-black text-red-700">Seguridad social incompleta</p>
            </div>
            <p className="mt-2 text-3xl font-black text-red-700">{summary.missingSecurity}</p>
            <p className="mt-1 text-sm font-medium text-red-500">Empleados sin EPS, AFP o ARL completa.</p>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <p className="font-black text-emerald-700">Sin hallazgos</p>
            </div>
            <p className="mt-2 text-3xl font-black text-emerald-700">{summary.ok}</p>
            <p className="mt-1 text-sm font-medium text-emerald-600">Registros listos para conciliacion.</p>
          </div>
          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5 text-sky-600" />
              <p className="font-black text-sky-700">Periodo</p>
            </div>
            <p className="mt-2 text-2xl font-black text-sky-700">{activePeriod.period_label}</p>
            <p className="mt-1 text-sm font-medium text-sky-600">{activePeriod.period_start} a {activePeriod.period_end}</p>
          </div>
        </div>
      )}

      {validationsQuery.isLoading ? (
        <div className="grid min-h-64 place-items-center rounded-3xl border border-slate-200 bg-white text-slate-500">
          Cargando matriz PILA/UGPP...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((validation) => (
            <ValidationRow key={validation.id} validation={validation} />
          ))}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <div>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-sky-50 text-sky-500">
              <ShieldCheck className="size-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Sin validaciones para mostrar</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Genera un periodo para crear la matriz de inconsistencias PILA/UGPP de la empresa.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
