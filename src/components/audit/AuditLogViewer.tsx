/**
 * AuditLogViewer.tsx
 * ---------------------------------------------------------------
 * Tabla principal de registros de auditoría con:
 * - Paginación server-side
 * - Búsqueda en tiempo real
 * - Badges de color por acción/severidad
 * - Drawer de detalle al hacer clic
 * - Estado vacío y de carga con skeletons
 * ---------------------------------------------------------------
 */
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, ChevronLeft, ChevronRight,
  History, AlertCircle, Eye,
  ShieldAlert, Info, AlertTriangle, XCircle,
  FileSpreadsheet, User, Calendar as CalendarIcon,
  Filter, ArrowUpDown, MoreHorizontal
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { AuditFilters } from './AuditFilters';
import { AuditDetailDrawer } from './AuditDetailDrawer';
import {
  useAuditLogs,
  actionLabels, entityTypeLabels, actionConfig, severityConfig, resolveModuleLabel,
  type AuditLogEntry, type AuditFilters as AuditFiltersType,
} from '@/hooks/useAuditLog';

// ─── Tipos ────────────────────────────────────────────────────

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

// ─── Componente de Fila ───────────────────────────────────────

function AuditRow({ log, onClick }: { log: AuditLogEntry; onClick: () => void }) {
  const actionCfg = actionConfig[log.action] ?? { class: 'bg-background text-slate-500 border-slate-200' };
  const severityCfg = log.severity ? severityConfig[log.severity] : severityConfig.info;

  const SevIcon = log.severity === 'critical' ? XCircle
    : log.severity === 'warning' ? AlertTriangle
    : Info;

  return (
    <TableRow
      className="cursor-pointer hover:bg-primary/[0.03] transition-all border-slate-100/60 group"
      onClick={onClick}
    >
      <TableCell className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-900 tabular-nums">
            {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es }).toUpperCase()}
          </span>
          <span className="text-[10px] font-bold text-slate-400 tabular-nums">
            {format(new Date(log.created_at), 'HH:mm:ss')}
          </span>
        </div>
      </TableCell>

      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
            <div className="absolute inset-0 " />
            <User className="relative w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-slate-900 truncate tracking-tight">
              {log.user_email?.split('@')[0] ?? 'SISTEMA'}
            </span>
            <span className="text-[10px] font-medium text-slate-400 truncate tracking-wide">
              {log.user_email ?? 'Automático'}
            </span>
          </div>
        </div>
      </TableCell>

      <TableCell className="px-6 py-4">
        <Badge 
          variant="outline" 
          className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border-none",
            actionCfg.class
          )}
        >
          {actionLabels[log.action] ?? log.action}
        </Badge>
      </TableCell>

      <TableCell className="px-6 py-4">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          {resolveModuleLabel(log.module)}
        </div>
      </TableCell>

      <TableCell className="px-6 py-4">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-black text-slate-900 tracking-tight truncate">
            {entityTypeLabels[log.entity_type] ?? log.entity_type}
          </span>
          {log.entity_name && (
            <span className="text-[10px] font-medium text-slate-400 truncate max-w-[180px]">
              {log.entity_name}
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="px-6 py-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
              severityCfg.class
            )}>
              <SevIcon className="w-3.5 h-3.5" />
              {severityCfg.label}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-primary text-white border-none font-bold text-xs p-3 rounded-xl shadow-2xl">
            {log.description ?? 'Sin descripción detallada'}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      <TableCell className="px-6 py-4 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white border border-transparent hover:border-slate-100"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          <MoreHorizontal className="w-4 h-4 text-slate-400" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Componente Principal ─────────────────────────────────────

export function AuditLogViewer({ entityType, entityId, compact = false }: AuditLogViewerProps) {
  const [page, setPage] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  const [filters, setFilters] = useState<AuditFiltersType>({});
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const pageSize = compact ? 15 : 25;

  // Combina búsqueda local con filtros del panel
  const activeFilters = useMemo(() => ({
    ...filters,
    ...(entityType ? { entityType } : {}),
    ...(entityId   ? { entityId } : {}),
    search: localSearch || filters.search,
  }), [filters, localSearch, entityType, entityId]);

  const { data: result, isLoading, error } = useAuditLogs(page, pageSize, activeFilters);
  const logs = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleFiltersChange = (f: AuditFiltersType) => {
    setFilters(f);
    setPage(0);
  };

  const handleSearch = (v: string) => {
    setLocalSearch(v);
    setPage(0);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p>Error al cargar el registro de auditoría. Recarga la página.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-8 px-2">
          {/* Tabs Internas Estilo Premium */}
          <div className="flex justify-center px-2">
            <Tabs defaultValue="all" className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-2 sm:flex h-auto p-1 gap-1">
                <TabsTrigger value="all" onClick={() => handleFiltersChange({})} className="text-[10px] py-2 px-2">
                  <History className="w-3.5 h-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Todo el Registro</span>
                  <span className="sm:hidden">TODO</span>
                </TabsTrigger>
                <TabsTrigger value="critical" onClick={() => handleFiltersChange({ severity: 'critical' })} className="text-[10px] py-2 px-2">
                  <AlertCircle className="w-3.5 h-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Eventos Críticos</span>
                  <span className="sm:hidden">CRÍTICOS</span>
                </TabsTrigger>
                <TabsTrigger value="user" onClick={() => handleFiltersChange({ user_email: user?.email })} className="text-[10px] py-2 px-2">
                  <User className="w-3.5 h-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Por Usuario</span>
                  <span className="sm:hidden">USUARIO</span>
                </TabsTrigger>
                <TabsTrigger value="exports" onClick={() => handleFiltersChange({ action: 'export_excel' })} className="text-[10px] py-2 px-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Exportaciones</span>
                  <span className="sm:hidden">EXP.</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight flex items-center justify-center sm:justify-start gap-2">
                <History className="w-5 h-5 text-primary" />
                Historial de Auditoría
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Trazabilidad completa de operaciones
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative group w-full md:min-w-[320px]">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
                <Input
                  placeholder="Buscar usuario, acción o módulo..."
                  className="pl-11 h-12 rounded-2xl bg-white border border-slate-200 focus-visible:ring-4 ring-primary/5 transition-all font-bold text-xs"
                  value={localSearch}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <AuditFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onReset={() => { setFilters({}); setPage(0); }}
                />
                <Button
                  className="h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 flex-1 md:flex-none"
                  onClick={() => { /* Implementar exportación */ }}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  EXPORTAR
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl bg-white border border-slate-100 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-6 px-6">
                <div className="relative h-24 w-24 flex items-center justify-center rounded-[2.5rem] bg-background border border-slate-100 group">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
                  <ShieldAlert className="relative w-10 h-10 text-slate-300" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sin registros detectados</h3>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    {Object.keys(activeFilters).some(k => activeFilters[k as keyof AuditFiltersType])
                      ? 'No hemos encontrado eventos que coincidan con los criterios de filtrado actuales.'
                      : 'La red de auditoría está activa. Las acciones del sistema comenzarán a aparecer aquí automáticamente.'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => { setFilters({}); setLocalSearch(''); setPage(0); }}
                  className="rounded-xl font-black uppercase text-[10px] tracking-widest px-8"
                >
                  RESTAURAR VISTA
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-background">
                      <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Temporalidad</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actor</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operación</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contexto</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entidad de Datos</TableHead>
                        <TableHead className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Impacto</TableHead>
                        <TableHead className="w-12 px-6" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <AuditRow
                          key={log.id}
                          log={log}
                          onClick={() => setSelectedLog(log)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación Premium */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-8 py-6 bg-white border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">
                        MOSTRANDO <span className="text-primary">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)}</span> DE <span className="text-primary">{total.toLocaleString('es-CO')}</span> EVENTOS
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 transition-all active:scale-90"
                        disabled={page === 0}
                        onClick={() => setPage(p => p - 1)}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PÁGINA</span>
                        <span className="text-xs font-black text-primary tabular-nums">{page + 1}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DE {totalPages}</span>
                      </div>

                      <Button
                        variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 transition-all active:scale-90"
                        disabled={page >= totalPages - 1}
                        onClick={() => setPage(p => p + 1)}
                      >
                        <ChevronRight className="w-4 h-4" />
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
        onOpenChange={open => { if (!open) setSelectedLog(null); }}
      />
    </>
  );
}
