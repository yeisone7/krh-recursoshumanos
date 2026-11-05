import { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link, useSearchParams } from 'react-router-dom';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { formatDateOnly, parseDateOnly } from '@/lib/dateOnly';
import {
  Plus,
  Search,
  Stethoscope,
  Calendar,
  TrendingUp,
  BarChart3,
  Bell,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock,
  Eye,
  Filter,
  Home,
  List,
  AlertTriangle,
  Download,
} from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getIncapacityRecoveryAmounts } from '@/lib/incapacityAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useIncapacities, useIncapacityAlerts, useIncapacityStats } from '@/hooks/useIncapacities';
import { 
  IncapacityFormDialog, 
  IncapacityDetailDialog,
  IncapacityAlertsPanel,
  IncapacityExportDialog,
} from '@/components/incapacities';
import {
  getIncapacityOriginShortLabel,
  incapacityOriginOptions,
  recoveryStatusLabels,
  recoveryStatusColors,
  getTotalChainDays,
  type IncapacityWithEmployee,
} from '@/types/incapacity';
import { MobileCardList } from '@/components/shared/MobileCardList';

function getPosition(incapacity: IncapacityWithEmployee) {
  return incapacity.employee?.employee_work_info?.find((info) => info.is_current)?.position_name;
}

export default function Incapacidades() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');
  const [epsFilter, setEpsFilter] = useState('all');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedIncapacityId, setSelectedIncapacityId] = useState<string | null>(null);
  
  const { data: incapacities, isLoading } = useIncapacities();
  const { data: stats } = useIncapacityStats();
  const { data: alerts } = useIncapacityAlerts();
  const isMobile = useIsMobile();

  const epsOptions = useMemo(() => (
    Array.from(new Set(incapacities?.flatMap((inc) => inc.eps_name ? [inc.eps_name] : [])))
      .sort((a, b) => a.localeCompare(b, 'es'))
  ), [incapacities]);

  const monthOptions = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const yearOptions = useMemo(() => {
    const years = new Set<number>();

    for (const inc of incapacities || []) {
      const startDate = parseDateOnly(inc.start_date);
      if (startDate) years.add(startDate.getFullYear());
    }

    return Array.from(years)
      .sort((a, b) => b - a)
      .map((year) => year.toString());
  }, [incapacities]);
  
  // Handle deep linking from dashboard
  useEffect(() => {
    const incapacityId = searchParams.get('incapacidad');
    if (incapacityId) {
      setSelectedIncapacityId(incapacityId);
      // Clear the param after opening
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);
  
  const handleOpenDetail = (id: string) => {
    setSelectedIncapacityId(id);
  };
  
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      maximumFractionDigits: 0 
    }).format(amount);
  };
  
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredIncapacities = incapacities?.filter((inc) => {
    const startDate = parseDateOnly(inc.start_date);
    const matchesSearch =
      !normalizedSearchTerm ||
      (inc.employee && `${inc.employee.first_name} ${inc.employee.last_name}`.toLowerCase().includes(normalizedSearchTerm)) ||
      inc.employee?.document_number?.toLowerCase().includes(normalizedSearchTerm) ||
      inc.cie10_code?.toLowerCase().includes(normalizedSearchTerm) ||
      inc.diagnosis.toLowerCase().includes(normalizedSearchTerm) ||
      inc.certificate_number?.toLowerCase().includes(normalizedSearchTerm);
    
    const matchesOrigin = originFilter === 'all' || inc.origin === originFilter;
    const matchesStatus = statusFilter === 'all' || inc.recovery_status === statusFilter;
    const matchesMonth = monthFilter === 'all' || (startDate && startDate.getMonth() + 1 === Number(monthFilter));
    const matchesYear = yearFilter === 'all' || (startDate && startDate.getFullYear().toString() === yearFilter);
    
    const matchesEps = epsFilter === 'all' || `eps:${inc.eps_name}` === epsFilter;
    return matchesSearch && matchesEps && matchesOrigin && matchesStatus && matchesMonth && matchesYear;
  });

  const activeFilterCount =
    (originFilter !== 'all' ? 1 : 0) +
    (monthFilter !== 'all' ? 1 : 0) +
    (yearFilter !== 'all' ? 1 : 0);
  
  const preview = incapacities?.find((inc) => inc.id === previewId);
  const previewRecovery = preview && getIncapacityRecoveryAmounts(preview);
  const togglePreview = (id: string) => setPreviewId((currentId) => currentId === id ? null : id);
  const metrics = [
    { label: 'Activas', value: stats?.totalActive ?? 0, note: 'En curso', icon: Calendar, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
    { label: 'Este mes', value: stats?.totalThisMonth ?? 0, note: `${stats?.totalDaysThisMonth ?? 0} días`, icon: Clock, tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
    { label: 'Recobros pendientes', value: stats?.pendingRecovery ?? 0, note: formatCurrency(stats?.pendingRecoveryAmount ?? 0), icon: ClipboardList, tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
    { label: 'Cartera pendiente', value: formatCurrency(stats?.pendingBalance ?? 0), icon: AlertTriangle, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    { label: 'Origen común', value: stats?.byOrigin.comun ?? 0, note: 'casos', icon: TrendingUp, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-1">
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm">
          <Link to="/" className="inline-flex items-center gap-2 rounded text-muted-foreground hover:text-primary">
            <Home className="h-4 w-4" aria-hidden="true" />
            Inicio
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <span aria-current="page" className="font-medium text-primary">Incapacidades</span>
        </nav>

        <header className="flex flex-col gap-4 rounded-2xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary/10 text-primary sm:h-16 sm:w-16">
              <Stethoscope className="h-8 w-8" aria-hidden="true" />
            </div>
            <div>
              <Badge variant="secondary" className="bg-primary/10 text-primary">Salud</Badge>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">Incapacidades</h1>
              <p className="text-sm text-muted-foreground">Gestión de incapacidades médicas y recobros</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <Download className="mr-2 h-4 w-4" /> Exportar
            </Button>
            <Button onClick={() => setShowFormDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nueva incapacidad
            </Button>
          </div>
        </header>

        <section aria-label="Indicadores de incapacidades" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {metrics.map(({ label, value, note, icon: Icon, tone }) => (
            <Card key={label} className="flex items-center gap-3 rounded-xl p-3 shadow-none">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-primary">{label}</p>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xl font-bold tabular-nums">{value}</span>
                  {note && <span className="text-xs text-muted-foreground">{note}</span>}
                </div>
              </div>
            </Card>
          ))}
        </section>

        <Accordion type="multiple" className="grid grid-cols-3 gap-2">
          <AccordionItem value="filters" className="contents [&>h3]:row-start-1 [&>h3]:min-w-0">
            <AccordionTrigger className="min-w-0 gap-1 rounded-xl border bg-card px-2 py-2.5 text-xs leading-tight hover:no-underline sm:gap-2 sm:px-4 sm:text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-1 text-left sm:gap-2">
                <Filter className="h-4 w-4 text-primary" /> Filtros de búsqueda
                {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="col-span-full rounded-xl border bg-card px-4 pt-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <Select value={originFilter} onValueChange={setOriginFilter}>
                  <SelectTrigger className="w-full" aria-label="Origen">
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los orígenes</SelectItem>
                    {incapacityOriginOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.shortLabel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-full" aria-label="Mes">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los meses</SelectItem>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-full" aria-label="Año">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los años</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="general" className="contents [&>h3]:row-start-1 [&>h3]:min-w-0">
            <AccordionTrigger className="min-w-0 gap-1 rounded-xl border bg-card px-2 py-2.5 text-xs leading-tight hover:no-underline sm:gap-2 sm:px-4 sm:text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-1 text-left sm:gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Información general
              </span>
            </AccordionTrigger>
            <AccordionContent className="col-span-full rounded-xl border bg-card px-4 pt-4">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <div>
                  <dt className="text-muted-foreground">Duración promedio</dt>
                  <dd className="font-semibold">{stats?.avgDuration ?? 0} días</dd>
                </div>
                {incapacityOriginOptions.filter((option) => option.value !== 'comun').map((option) => (
                  <div key={option.value}>
                    <dt className="text-muted-foreground">{option.kpiLabel}</dt>
                    <dd className="font-semibold">{stats?.byOrigin[option.value] ?? 0} casos</dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="alerts" className="contents [&>h3]:row-start-1 [&>h3]:min-w-0">
            <AccordionTrigger className="min-w-0 gap-1 rounded-xl border bg-card px-2 py-2.5 text-xs leading-tight hover:no-underline sm:gap-2 sm:px-4 sm:text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-1 text-left sm:gap-2">
                <Bell className="h-4 w-4 text-warning" /> Alertas
                {!!alerts?.length && <Badge variant="destructive">{alerts.length}</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="col-span-full rounded-xl border bg-card px-4 pt-4">
              <IncapacityAlertsPanel onViewIncapacity={handleOpenDetail} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Card className="min-w-0 overflow-hidden rounded-xl shadow-none">
          <CardHeader className="gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <List className="h-5 w-5" /> Listado de incapacidades
              </CardTitle>
              <CardDescription aria-live="polite">
                {!isLoading && `${filteredIncapacities?.length ?? 0} registros encontrados`}
              </CardDescription>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,12rem)_minmax(0,13rem)]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  aria-label="Buscar incapacidades"
                  placeholder="Buscar por nombre, documento o diagnóstico"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={epsFilter} onValueChange={setEpsFilter}>
                <SelectTrigger aria-label="EPS"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las EPS</SelectItem>
                  {epsOptions.map((eps) => <SelectItem key={eps} value={`eps:${eps}`}>{eps}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger aria-label="Estado del recobro">
                  <SelectValue placeholder="Estado Recobro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(recoveryStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredIncapacities?.length ? (
              isMobile ? (
                <div className="p-3">
                  <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
                    <MobileCardList
                      items={filteredIncapacities.map((inc) => ({
                        id: inc.id,
                        title: `${inc.employee?.first_name} ${inc.employee?.last_name}`,
                        subtitle: inc.employee?.document_number,
                        badge: (
                          <Badge className={recoveryStatusColors[inc.recovery_status]}>
                            {recoveryStatusLabels[inc.recovery_status]}
                          </Badge>
                        ),
                        fields: [
                          { label: 'Días', value: `${inc.total_days} días` },
                          { label: 'Origen', value: getIncapacityOriginShortLabel(inc.origin) },
                          { label: 'Período', value: `${formatDateOnly(inc.start_date, 'dd/MM')} - ${formatDateOnly(inc.end_date, 'dd/MM')}` },
                          { label: 'Valor', value: formatCurrency(inc.total_amount) },
                        ],
                        onClick: () => togglePreview(inc.id),
                      }))}
                      emptyMessage="No se encontraron incapacidades"
                    />
                  </PullToRefresh>
                </div>
              ) : (
                <div className="[&>div]:max-h-[26rem]">
                  <Table className="min-w-[58rem] tabular-nums [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:text-xs [&_th]:text-white">
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-sky-950 hover:bg-sky-950">
                        <TableHead>Empleado</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>EPS</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead className="text-center">Días</TableHead>
                        <TableHead>Fecha de inicio</TableHead>
                        <TableHead>Fecha final</TableHead>
                        <TableHead>Diagnóstico</TableHead>
                        <TableHead>Estado del recobro</TableHead>
                        <TableHead className="text-right">Saldo pendiente</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncapacities.map((inc) => (
                        <TableRow
                          key={inc.id}
                          data-state={preview?.id === inc.id ? 'selected' : undefined}
                          className="cursor-pointer even:bg-muted/30 hover:bg-primary/5 data-[state=selected]:bg-primary/10"
                          onClick={() => togglePreview(inc.id)}
                        >
                          <TableCell>
                            <button
                              type="button"
                              className="rounded text-left font-medium hover:text-primary hover:underline focus-visible:outline focus-visible:outline-ring"
                              aria-expanded={preview?.id === inc.id}
                              aria-controls={preview?.id === inc.id ? "incapacity-preview" : undefined}
                              onClick={(event) => {
                                event.stopPropagation();
                                togglePreview(inc.id);
                              }}
                            >
                              {inc.employee ? `${inc.employee.first_name} ${inc.employee.last_name}` : 'Empleado sin datos'}
                            </button>
                            <p className="text-xs text-muted-foreground">{inc.employee?.document_number}</p>
                          </TableCell>
                          <TableCell>{getPosition(inc) || '—'}</TableCell>
                          <TableCell>{inc.eps_name || '—'}</TableCell>
                          <TableCell>{getIncapacityOriginShortLabel(inc.origin)}</TableCell>
                          <TableCell className="text-center">
                            {inc.total_days}
                            {!!inc.extensions?.length && (
                              <p className="whitespace-nowrap text-xs text-muted-foreground">{getTotalChainDays(inc)} total</p>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateOnly(inc.start_date, 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="whitespace-nowrap">{formatDateOnly(inc.end_date, 'dd/MM/yyyy')}</TableCell>
                          <TableCell title={inc.diagnosis}>
                            {inc.cie10_code || <span className="line-clamp-2">{inc.diagnosis}</span>}
                          </TableCell>
                          <TableCell>
                            <Badge className={recoveryStatusColors[inc.recovery_status]}>
                              {recoveryStatusLabels[inc.recovery_status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-medium">
                            {formatCurrency(getIncapacityRecoveryAmounts(inc).pending)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Abrir detalle completo de ${inc.employee?.first_name ?? 'la incapacidad'} ${inc.employee?.last_name ?? ''}`.trim()}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenDetail(inc.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No hay incapacidades</h3>
                <p className="text-muted-foreground mb-4">
                  {normalizedSearchTerm || activeFilterCount > 0 || epsFilter !== 'all' || statusFilter !== 'all'
                    ? 'No se encontraron resultados con los filtros aplicados'
                    : 'Comienza registrando la primera incapacidad'}
                </p>
                <Button onClick={() => setShowFormDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Incapacidad
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {preview && previewRecovery && (
        <section id="incapacity-preview" aria-labelledby="incapacity-preview-title" className="flex max-h-[55%] min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border border-primary/20 bg-card">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-3 py-2 sm:px-4">
            <h2 id="incapacity-preview-title" className="font-semibold">
              Detalle de la incapacidad{preview.employee && ` · ${preview.employee.first_name} ${preview.employee.last_name}`}
            </h2>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => handleOpenDetail(preview.id)}>Abrir detalle completo</Button>
              <Button size="sm" variant="ghost" onClick={() => setPreviewId(null)}>Cerrar</Button>
            </div>
          </header>
          <div className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto overscroll-contain break-words bg-primary/5 p-3 text-sm sm:p-4 lg:grid-cols-4 lg:divide-x lg:divide-primary/20 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(8.5rem,0.75fr)]">
            <div className="space-y-1">
              <h3 className="font-semibold text-primary">Empleado</h3>
              <p>Documento · {preview.employee?.document_number || '—'}</p>
              <p>Cargo · {getPosition(preview) || '—'}</p>
              <p>EPS · {preview.eps_name || '—'}</p>
            </div>
            <div className="space-y-1 lg:pl-3">
              <h3 className="font-semibold text-primary">Incapacidad</h3>
              <p>Origen · {getIncapacityOriginShortLabel(preview.origin)}</p>
              <p>N.º incapacidad · {preview.certificate_number || '—'}</p>
              <p>Días · {preview.total_days}</p>
              <p>{formatDateOnly(preview.start_date, 'dd/MM/yyyy')} – {formatDateOnly(preview.end_date, 'dd/MM/yyyy')}</p>
            </div>
            <div className="space-y-1 lg:pl-3">
              <h3 className="font-semibold text-primary">Diagnóstico</h3>
              {preview.cie10_code && <p className="font-medium">{preview.cie10_code}</p>}
              <p>{preview.diagnosis}</p>
            </div>
            <div className="space-y-1 lg:pl-3">
              <h3 className="font-semibold text-primary">Recobro</h3>
              <Badge className={recoveryStatusColors[preview.recovery_status]}>{recoveryStatusLabels[preview.recovery_status]}</Badge>
              <p>Valor liquidado · {formatCurrency(preview.total_amount)}</p>
              <p>Valor recobrado · {formatCurrency(preview.recovered_amount)}</p>
            </div>
            <div className="col-span-2 self-center lg:col-span-4 lg:!border-0 xl:col-span-1">
              <div className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 ${
                previewRecovery.pending > 0
                  ? 'border-destructive/20 bg-destructive/10 text-destructive'
                  : 'border-border bg-muted text-muted-foreground'
              }`}>
                {previewRecovery.pending > 0 && <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <div className="text-center">
                  <p className="text-xs font-semibold">Saldo pendiente</p>
                  <p className="text-xl font-bold leading-tight tabular-nums">{formatCurrency(previewRecovery.pending)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Dialogs */}
      <IncapacityFormDialog
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
      />
      
      <IncapacityDetailDialog
        open={!!selectedIncapacityId}
        onOpenChange={(open) => !open && setSelectedIncapacityId(null)}
        incapacityId={selectedIncapacityId}
      />

      <IncapacityExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  );
}
