import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  History,
  Info,
  MoreHorizontal,
  Search,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { AuditDetailDrawer } from './AuditDetailDrawer';
import { AuditFilters } from './AuditFilters';
import {
  actionConfig,
  actionLabels,
  entityTypeLabels,
  resolveModuleLabel,
  severityConfig,
  type AuditFilters as AuditFiltersType,
  type AuditLogEntry,
  useAuditLogs,
} from '@/hooks/useAuditLog';

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

function SeverityIcon({ severity, className }: { severity: string | null | undefined; className?: string }) {
  if (severity === 'critical') return <XCircle className={cn('h-3.5 w-3.5', className)} />;
  if (severity === 'warning') return <AlertTriangle className={cn('h-3.5 w-3.5', className)} />;
  return <Info className={cn('h-3.5 w-3.5', className)} />;
}

function AuditRow({ log, onClick }: { log: AuditLogEntry; onClick: () => void }) {
  const actionCfg = actionConfig[log.action] ?? { class: 'bg-background text-slate-500 border-slate-200' };
  const severityCfg = log.severity ? severityConfig[log.severity] : severityConfig.info;

  return (
    <TableRow
      className="group cursor-pointer border-slate-100/70 transition-all hover:bg-primary/[0.03]"
      onClick={onClick}
    >
      <TableCell className="px-5 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase tabular-nums text-slate-900">
            {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}
          </span>
          <span className="text-[10px] font-bold tabular-nums text-slate-400">
            {format(new Date(log.created_at), 'HH:mm:ss')}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white">
            <User className="relative h-4 w-4 text-primary" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-black tracking-tight text-slate-900">
              {log.user_email?.split('@')[0] ?? 'SISTEMA'}
            </span>
            <span className="max-w-[180px] truncate text-[10px] font-medium tracking-wide text-slate-400">
              {log.user_email ?? 'Automatico'}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-5 py-4">
        <Badge
          variant="outline"
          className={cn('border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest', actionCfg.class)}
        >
          {actionLabels[log.action] ?? log.action}
        </Badge>
      </TableCell>

      <TableCell className="px-5 py-4">
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-500">
          {resolveModuleLabel(log.module)}
        </div>
      </TableCell>

      <TableCell className="px-5 py-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs font-black tracking-tight text-slate-900">
            {entityTypeLabels[log.entity_type] ?? log.entity_type}
          </span>
          {log.entity_name && (
            <span className="max-w-[190px] truncate text-[10px] font-medium text-slate-400">
              {log.entity_name}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="px-5 py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider',
              severityCfg.class,
            )}>
              <SeverityIcon severity={log.severity} />
              {severityCfg.label}
            </div>
          </TooltipTrigger>
          <TooltipContent className="rounded-xl border-none bg-primary p-3 text-xs font-bold text-white shadow-2xl">
            {log.description ?? 'Sin descripcion detallada'}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell className="px-5 py-4 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg border border-transparent opacity-0 transition-all hover:border-slate-100 hover:bg-white group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
        >
          <MoreHorizontal className="h-4 w-4 text-slate-400" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AuditMobileCard({ log, onClick }: { log: AuditLogEntry; onClick: () => void }) {
  const actionCfg = actionConfig[log.action] ?? { class: 'bg-background text-slate-500 border-slate-200' };
  const severityCfg = log.severity ? severityConfig[log.severity] : severityConfig.info;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">
              {log.user_email?.split('@')[0] ?? 'SISTEMA'}
            </p>
            <p className="truncate text-[11px] font-semibold text-slate-400">
              {log.user_email ?? 'Automatico'}
            </p>
          </div>
        </div>
        <div className={cn(
          'flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider',
          severityCfg.class,
        )}>
          <SeverityIcon severity={log.severity} className="h-3 w-3" />
          {severityCfg.label}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={cn('border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest', actionCfg.class)}
        >
          {actionLabels[log.action] ?? log.action}
        </Badge>
        <span className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          {resolveModuleLabel(log.module)}
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs font-black text-slate-900">
            {entityTypeLabels[log.entity_type] ?? log.entity_type}
          </p>
          <p className="shrink-0 text-[10px] font-black uppercase tracking-widest text-primary">
            {format(new Date(log.created_at), 'dd MMM yy', { locale: es })}
          </p>
        </div>
        {log.entity_name && (
          <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-500">
            {log.entity_name}
          </p>
        )}
        <p className="mt-2 text-[10px] font-bold text-slate-400">
          {format(new Date(log.created_at), 'HH:mm:ss')}
        </p>
      </div>
    </button>
  );
}

export function AuditLogViewer({ entityType, entityId, compact = false }: AuditLogViewerProps) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  const [filters, setFilters] = useState<AuditFiltersType>({});
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const pageSize = compact ? 15 : 25;

  const activeFilters = useMemo(() => ({
    ...filters,
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    search: localSearch || filters.search,
  }), [filters, localSearch, entityType, entityId]);

  const { data: result, isLoading, error } = useAuditLogs(page, pageSize, activeFilters);
  const logs = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFiltersChange = (nextFilters: AuditFiltersType) => {
    setFilters(nextFilters);
    setPage(0);
  };

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    setPage(0);
  };

  if (error) {
    return (
      <Card className="rounded-2xl border-red-100 bg-red-50">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm font-semibold">Error al cargar el registro de auditoria. Recarga la pagina.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-5 px-0 sm:gap-8 sm:px-2">
          <div className="overflow-x-auto px-0 pb-1 sm:flex sm:justify-center sm:px-2">
            <Tabs defaultValue="all" className="min-w-max sm:w-auto">
              <TabsList className="grid h-auto min-w-[620px] grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1 sm:min-w-0 sm:flex">
                <TabsTrigger value="all" onClick={() => handleFiltersChange({})} className="gap-1.5 px-3 py-2 text-[9px] sm:text-[10px]">
                  <History className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Todo el Registro</span>
                  <span className="sm:hidden">TODO</span>
                </TabsTrigger>
                <TabsTrigger value="critical" onClick={() => handleFiltersChange({ severity: 'critical' })} className="gap-1.5 px-3 py-2 text-[9px] sm:text-[10px]">
                  <AlertCircle className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Eventos Criticos</span>
                  <span className="sm:hidden">CRITICOS</span>
                </TabsTrigger>
                <TabsTrigger value="user" onClick={() => handleFiltersChange({ user_email: user?.email })} className="gap-1.5 px-3 py-2 text-[9px] sm:text-[10px]">
                  <User className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Por Usuario</span>
                  <span className="sm:hidden">USUARIO</span>
                </TabsTrigger>
                <TabsTrigger value="exports" onClick={() => handleFiltersChange({ action: 'export_excel' })} className="gap-1.5 px-3 py-2 text-[9px] sm:text-[10px]">
                  <FileSpreadsheet className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Exportaciones</span>
                  <span className="sm:hidden">EXP.</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
            <div className="text-center sm:text-left">
              <h3 className="flex items-center justify-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 sm:justify-start sm:text-xl">
                <History className="h-5 w-5 text-primary" />
                Historial de Auditoria
              </h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Trazabilidad completa de operaciones
              </p>
            </div>

            <div className="flex w-full flex-col items-stretch gap-3 md:flex-row md:items-center xl:w-auto">
              <div className="group relative w-full md:min-w-[320px]">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <Search className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-primary" />
                </div>
                <Input
                  placeholder="Buscar usuario, accion o modulo..."
                  className="h-12 rounded-2xl border border-slate-200 bg-white pl-11 text-xs font-bold transition-all ring-primary/5 focus-visible:ring-4"
                  value={localSearch}
                  onChange={(event) => handleSearch(event.target.value)}
                />
              </div>
              <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto md:items-center">
                <AuditFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onReset={() => {
                    setFilters({});
                    setPage(0);
                  }}
                />
                <Button
                  className="h-12 rounded-2xl bg-primary px-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-primary/90 active:scale-95 md:flex-none md:px-6"
                  onClick={() => undefined}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Exportar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white sm:rounded-3xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-4 sm:p-8">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-2xl sm:h-16" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-6 px-5 py-16 text-center sm:px-6 sm:py-24">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] border border-slate-100 bg-background sm:h-24 sm:w-24 sm:rounded-[2.5rem]">
                  <ShieldAlert className="h-9 w-9 text-slate-300 sm:h-10 sm:w-10" />
                </div>
                <div className="max-w-sm space-y-2">
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Sin registros detectados</h3>
                  <p className="text-xs font-medium leading-relaxed text-slate-500">
                    {Object.keys(activeFilters).some((key) => activeFilters[key as keyof AuditFiltersType])
                      ? 'No encontramos eventos que coincidan con los filtros actuales.'
                      : 'La red de auditoria esta activa. Las acciones del sistema comenzaran a aparecer aqui automaticamente.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({});
                    setLocalSearch('');
                    setPage(0);
                  }}
                  className="rounded-xl px-8 text-[10px] font-black uppercase tracking-widest"
                >
                  Restaurar vista
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3 bg-slate-50 p-3 md:hidden">
                  {logs.map((log) => (
                    <AuditMobileCard key={log.id} log={log} onClick={() => setSelectedLog(log)} />
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader className="bg-background">
                      <TableRow className="border-slate-100 hover:bg-transparent">
                        <TableHead className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Temporalidad</TableHead>
                        <TableHead className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actor</TableHead>
                        <TableHead className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Operacion</TableHead>
                        <TableHead className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contexto</TableHead>
                        <TableHead className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Entidad</TableHead>
                        <TableHead className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Impacto</TableHead>
                        <TableHead className="w-12 px-5" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <AuditRow key={log.id} log={log} onClick={() => setSelectedLog(log)} />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-white px-4 py-5 sm:flex-row sm:px-8 sm:py-6">
                    <p className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-left sm:text-[10px]">
                      Mostrando <span className="text-primary">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)}</span> de{' '}
                      <span className="text-primary">{total.toLocaleString('es-CO')}</span> eventos
                    </p>

                    <div className="grid w-full grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 sm:flex sm:w-auto sm:gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-slate-200 transition-all active:scale-90"
                        disabled={page === 0}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      <div className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">Pagina</span>
                        <span className="text-xs font-black tabular-nums text-primary">{page + 1}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 sm:text-[10px]">de {totalPages}</span>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-slate-200 transition-all active:scale-90"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AuditDetailDrawer
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      />
    </>
  );
}
