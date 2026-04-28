import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';

import { 
  useAuditLogs, 
  actionLabels, 
  entityTypeLabels,
  type AuditLogEntry,
} from '@/hooks/useAuditLog';

const actionStyles: Record<string, string> = {
  create: 'bg-primary/10 text-primary',
  update: 'bg-accent text-accent-foreground',
  delete: 'bg-destructive/10 text-destructive',
  login: 'bg-secondary text-secondary-foreground',
  logout: 'bg-muted text-muted-foreground',
  assign_role: 'bg-primary/10 text-primary',
  remove_role: 'bg-destructive/10 text-destructive',
  assign_center: 'bg-primary/10 text-primary',
  remove_center: 'bg-destructive/10 text-destructive',
  invite_user: 'bg-primary/10 text-primary',
  terminate_contract: 'bg-destructive/10 text-destructive',
  extend_contract: 'bg-primary/10 text-primary',
  deliver_dotation: 'bg-primary/10 text-primary',
};

// Detect UUIDs to replace with friendly text
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

function LogDetailsRow({ log }: { log: AuditLogEntry }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDetails = log.old_values || log.new_values;

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">
                {format(new Date(log.created_at), 'dd MMM yyyy', { locale: es })}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.created_at), 'HH:mm:ss')}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{log.user_email || 'Usuario desconocido'}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge className={actionStyles[log.action] || 'bg-muted text-muted-foreground'}>
            {actionLabels[log.action] || log.action}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {entityTypeLabels[log.entity_type] || log.entity_type}
              </p>
              {log.entity_name && (
                <p className="text-xs text-muted-foreground">
                  {isUUID(log.entity_name) ? '(ID interno)' : log.entity_name}
                </p>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell>
          {hasDetails && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  {isOpen ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Ocultar
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Ver detalles
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}
        </TableCell>
      </TableRow>
      {hasDetails && isOpen && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-4">
              {log.old_values && (
                <div>
                  <p className="text-sm font-semibold mb-2 text-destructive">Valores anteriores:</p>
                  <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-40">
                    {JSON.stringify(log.old_values, null, 2)}
                  </pre>
                </div>
              )}
              {log.new_values && (
                <div>
                  <p className="text-sm font-semibold mb-2 text-primary">Valores nuevos:</p>
                  <pre className="text-xs bg-background p-3 rounded-md overflow-auto max-h-40">
                    {JSON.stringify(log.new_values, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface AuditLogViewerProps {
  entityType?: string;
  entityId?: string;
  compact?: boolean;
}

export function AuditLogViewer({ entityType, entityId, compact = false }: AuditLogViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>(entityType || 'all');
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = compact ? 20 : 25;

  const { data: result, isLoading, error } = useAuditLogs({
    entityType: filterEntity !== 'all' ? filterEntity : undefined,
    action: filterAction !== 'all' ? filterAction : undefined,
    limit: pageSize,
    page: currentPage,
  });

  const logs = result?.data || [];
  const totalCount = result?.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.user_email?.toLowerCase().includes(query) ||
      log.entity_name?.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.entity_type.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(0);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <p>Error al cargar el registro de auditoría</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'border-0 shadow-none' : ''}>
      {!compact && (
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Registro de Auditoría
              </CardTitle>
              <CardDescription>
                Historial de acciones realizadas en el sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className={compact ? 'p-0' : ''}>
        {/* Filters */}
          <div className="flex flex-col gap-3 mb-4 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar en logs..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
            <Select value={filterAction} onValueChange={handleFilterChange(setFilterAction)}>
              <SelectTrigger className="w-full lg:w-44">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="all">Todas las acciones</SelectItem>
              {Object.entries(actionLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!entityType && (
              <Select value={filterEntity} onValueChange={handleFilterChange(setFilterEntity)}>
                <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Entidad" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todas las entidades</SelectItem>
                {Object.entries(entityTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Sin registros</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterAction !== 'all' || filterEntity !== 'all'
                ? 'No se encontraron registros con esos filtros.'
                : 'Aún no hay acciones registradas en el sistema.'}
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className={compact ? 'h-[400px]' : 'h-[min(600px,calc(100vh-18rem))]'}>
              <div className="overflow-x-auto rounded-md border">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="w-[140px]">Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead className="w-[100px]">Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <LogDetailsRow key={log.id} log={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Mostrando {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalCount)} de {totalCount} registros
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p - 1)}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage >= totalPages - 1}
                  >
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
