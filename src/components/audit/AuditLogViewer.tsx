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
  const actionCfg = actionConfig[log.action] ?? { class: 'bg-muted text-muted-foreground border-border' };
  const severityCfg = log.severity ? severityConfig[log.severity] : severityConfig.info;

  const SevIcon = log.severity === 'critical' ? XCircle
    : log.severity === 'warning' ? AlertTriangle
    : Info;

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/40 transition-colors group"
      onClick={onClick}
    >
      {/* Fecha */}
      <TableCell className="whitespace-nowrap">
        <div className="text-sm font-medium">
          {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(log.created_at), 'HH:mm:ss')}
        </div>
      </TableCell>

      {/* Usuario */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary">
              {(log.user_email ?? 'S')[0].toUpperCase()}
            </span>
          </div>
          <span className="text-sm truncate max-w-[160px]">{log.user_email ?? 'Sistema'}</span>
        </div>
      </TableCell>

      {/* Acción */}
      <TableCell>
        <Badge variant="outline" className={`text-xs ${actionCfg.class}`}>
          {actionLabels[log.action] ?? log.action}
        </Badge>
      </TableCell>

      {/* Módulo */}
      <TableCell className="text-sm text-muted-foreground">
        {resolveModuleLabel(log.module)}
      </TableCell>

      {/* Entidad */}
      <TableCell>
        <div className="text-sm font-medium">
          {entityTypeLabels[log.entity_type] ?? log.entity_type}
        </div>
        {log.entity_name && (
          <div className="text-xs text-muted-foreground truncate max-w-[140px]">
            {log.entity_name}
          </div>
        )}
      </TableCell>

      {/* Severidad */}
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`text-[11px] gap-1 ${severityCfg.class}`}>
              <SevIcon className="w-3 h-3" />
              {severityCfg.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{log.description ?? 'Sin descripción'}</TooltipContent>
        </Tooltip>
      </TableCell>

      {/* Acción ver */}
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onClick}
        >
          <Eye className="w-3.5 h-3.5" />
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
      <Card className={compact ? 'border-0 shadow-none' : ''}>
        {!compact && (
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="w-4 h-4 text-primary" />
                  Registro de Actividad
                </CardTitle>
                <CardDescription className="mt-0.5">
                  {total > 0 ? `${total.toLocaleString('es-CO')} eventos registrados` : 'Sin eventos'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar…"
                    className="pl-8 h-8 text-sm"
                    value={localSearch}
                    onChange={e => handleSearch(e.target.value)}
                  />
                </div>
                <AuditFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  onReset={() => { setFilters({}); setPage(0); }}
                />
              </div>
            </div>
          </CardHeader>
        )}

        <CardContent className={compact ? 'p-0' : 'pt-0'}>
          {isLoading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="p-4 rounded-full bg-muted/50">
                <ShieldAlert className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold">Sin registros de auditoría</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {Object.keys(activeFilters).some(k => activeFilters[k as keyof AuditFiltersType])
                  ? 'No hay eventos que coincidan con los filtros activos.'
                  : 'Las acciones del sistema comenzarán a aparecer aquí automáticamente.'}
              </p>
            </div>
          ) : (
            <>
              <ScrollArea className={compact ? 'h-[380px]' : 'h-[calc(100vh-22rem)]'}>
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[120px]">Fecha</TableHead>
                        <TableHead className="w-[180px]">Usuario</TableHead>
                        <TableHead className="w-[150px]">Acción</TableHead>
                        <TableHead className="w-[130px]">Módulo</TableHead>
                        <TableHead>Entidad</TableHead>
                        <TableHead className="w-[100px]">Severidad</TableHead>
                        <TableHead className="w-[50px]" />
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
              </ScrollArea>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-1 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} de {total.toLocaleString('es-CO')}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      disabled={page === 0}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2 tabular-nums">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline" size="icon" className="h-7 w-7"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Drawer de detalle */}
      <AuditDetailDrawer
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={open => { if (!open) setSelectedLog(null); }}
      />
    </>
  );
}
