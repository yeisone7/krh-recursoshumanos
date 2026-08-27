import { useState } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { Plus, Calendar, List, Settings, Filter, Search, FileText, Trash2, Link2 } from 'lucide-react';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  LeaveRequestFormDialog,
  LeaveRequestDetailDialog,
  LeaveCalendarView,
  LeaveAlertsPanel,
  LeaveTypeConfigDialog,
  LeavePublicLinkDialog,
} from '@/components/leaves';
import {
  LeaveTypeInUseError,
  useDeleteLeaveTypeConfig,
  useLeaveRequests,
  useLeaveTypeConfigs,
  usePendingLeavesCount,
} from '@/hooks/useLeaves';
import {
  getLeaveTypeLabel,
  LeaveRequest,
  LeaveTypeConfig,
  LEAVE_APPROVAL_STAGE_LABELS,
  LEAVE_STATUS_LABELS,
  LeaveRequestStatus,
} from '@/types/leave';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Permisos() {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [showPublicLinkDialog, setShowPublicLinkDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LeaveTypeConfig | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<LeaveTypeConfig | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: requests = [], isLoading } = useLeaveRequests();
  const { data: typeConfigs = [] } = useLeaveTypeConfigs();
  const { data: pendingCount = 0 } = usePendingLeavesCount();
  const deleteLeaveType = useDeleteLeaveTypeConfig();
  const { canCreate, canUpdate, canDelete, hasPermission } = useAuth();
  const isMobile = useIsMobile();

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const employeeName = request.employees_v2
      ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`.toLowerCase()
      : '';
    const matchesSearch = !searchTerm || 
      employeeName.includes(searchTerm.toLowerCase()) ||
      getLeaveTypeLabel(request.leave_type, typeConfigs).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleConfigClick = (config: LeaveTypeConfig) => {
    if (!canUpdate('permisos')) return;
    setSelectedConfig(config);
    setShowConfigDialog(true);
  };

  const handleCreateConfig = () => {
    setSelectedConfig(null);
    setShowConfigDialog(true);
  };

  const handleDeleteConfig = async () => {
    if (!deleteConfig) return;

    try {
      await deleteLeaveType.mutateAsync(deleteConfig);
      toast.success('Tipo de permiso eliminado');
      setDeleteConfig(null);
    } catch (error: unknown) {
      if (error instanceof LeaveTypeInUseError) {
        const { requests: requestCount, balances: balanceCount } = error.usage;
        toast.error(
          `No se puede eliminar: tiene ${requestCount} solicitud(es) y ${balanceCount} saldo(s) asociados. Desactívalo para conservar el historial.`,
        );
      } else {
        const dbError = error as { code?: string; message?: string };
        toast.error(
          dbError.code === '23503'
            ? 'El tipo ya tiene información asociada. Desactívalo para conservar el historial.'
            : dbError.message || 'No fue posible eliminar el tipo de permiso',
        );
      }
    }
  };

  const getStatusBadgeVariant = (status: LeaveRequestStatus) => {
    switch (status) {
      case 'aprobado':
        return 'default';
      case 'rechazado':
        return 'destructive';
      case 'cancelado':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeColor = (leaveType: string) => {
    const config = typeConfigs.find(c => c.leave_type === leaveType);
    return config?.color || '#3B82F6';
  };

  const getRequestStatusLabel = (request: LeaveRequest) => (
    request.status === 'pendiente'
      ? LEAVE_APPROVAL_STAGE_LABELS[request.approval_stage]
      : LEAVE_STATUS_LABELS[request.status]
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Compact Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-primary/5 p-4 shadow-sm sm:p-5">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <List className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                Permisos y Licencias
              </h1>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground sm:text-sm">
                Gestión de solicitudes de permisos, licencias y ausencias laborales
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {hasPermission('leave_public_links', 'update') && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowPublicLinkDialog(true)}
                className="h-11 w-full shrink-0 rounded-xl px-5 text-xs font-black uppercase tracking-wider sm:w-auto"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Enlace público
              </Button>
            )}
            {canCreate('permisos') && (
              <Button
                onClick={() => setShowNewRequestDialog(true)}
                size="lg"
                className="h-11 w-full shrink-0 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/15 transition-all hover:bg-primary/90 sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nueva Solicitud
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Premium */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="h-11 w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-slate-100 p-1 scrollbar-hide sm:w-auto">
            <TabsTrigger value="solicitudes" className="relative h-9 min-w-[132px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <List className="h-4 w-4 shrink-0" />
              Solicitudes
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendario" className="h-9 min-w-[128px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Calendar className="h-4 w-4 shrink-0" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="alertas" className="h-9 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Filter className="h-4 w-4 shrink-0" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="h-9 min-w-[128px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Settings className="h-4 w-4 shrink-0" />
              Configurar
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Solicitudes Tab */}
        <TabsContent value="solicitudes" className="space-y-4">
          {/* Filters Premium */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                placeholder="Buscar empleado o tipo de permiso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-14 rounded-2xl bg-background border-none shadow-sm text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
            
            <div className="w-full sm:w-[220px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-14 rounded-2xl bg-background border-none shadow-sm text-sm font-medium focus:ring-1 focus:ring-primary/50">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border ">
                  <SelectItem value="all" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1 font-medium">Todos los estados</SelectItem>
                  <SelectItem value="pendiente" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1 font-medium">Pendientes</SelectItem>
                  <SelectItem value="aprobado" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1 font-medium">Aprobados</SelectItem>
                  <SelectItem value="rechazado" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1 font-medium">Rechazados</SelectItem>
                  <SelectItem value="cancelado" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1 font-medium">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Requests Table */}
          <Card className="rounded-[2rem] border-none shadow-sm overflow-hidden">
            <CardContent className={cn("p-0", !isMobile && "overflow-x-auto")}>
              {isMobile ? (
                <div className="p-4 bg-background /10">
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                  ) : (
                    <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
                      <MobileCardList
                        items={filteredRequests.map((request) => ({
                          id: request.id,
                          title: request.employees_v2 ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}` : 'N/A',
                          subtitle: getLeaveTypeLabel(request.leave_type, typeConfigs),
                          badge: (
                            <Badge variant={getStatusBadgeVariant(request.status)} className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                              {getRequestStatusLabel(request)}
                            </Badge>
                          ),
                          fields: [
                            { label: 'Días', value: `${request.total_days}` },
                            { label: 'Fechas', value: `${formatDateOnly(request.start_date, 'dd MMM', { locale: es })} - ${formatDateOnly(request.end_date, 'dd MMM', { locale: es })}` },
                          ],
                          onClick: () => handleViewRequest(request),
                        }))}
                        emptyMessage="No se encontraron solicitudes"
                      />
                    </PullToRefresh>
                  )}
                </div>
              ) : (
              <Table>
                <TableHeader className="bg-background">
                  <TableRow className="hover:bg-transparent border-b-primary/5">
                    <TableHead className="font-black text-xs uppercase tracking-widest text-muted-foreground py-5">Empleado</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-muted-foreground py-5">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell font-black text-xs uppercase tracking-widest text-muted-foreground py-5">Fechas</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-muted-foreground py-5 text-center">Días</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-widest text-muted-foreground py-5">Estado</TableHead>
                    <TableHead className="hidden lg:table-cell font-black text-xs uppercase tracking-widest text-muted-foreground py-5">Solicitado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Cargando solicitudes...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron solicitudes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow 
                        key={request.id} 
                        className="cursor-pointer hover:bg-background transition-colors border-b-border/50 group"
                        onClick={() => handleViewRequest(request)}
                      >
                        <TableCell className="font-medium py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {request.employees_v2 ? request.employees_v2.first_name.charAt(0) + request.employees_v2.last_name.charAt(0) : '?'}
                            </div>
                            <span>
                              {request.employees_v2
                                ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
                                : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getTypeColor(request.leave_type) }}
                            />
                            <span className="font-medium text-muted-foreground">{getLeaveTypeLabel(request.leave_type, typeConfigs)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-medium">
                          {formatDateOnly(request.start_date, 'dd MMM', { locale: es })} - {formatDateOnly(request.end_date, 'dd MMM', { locale: es })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                            {request.total_days}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)} className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                            {getRequestStatusLabel(request)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell text-xs font-medium">
                          {format(new Date(request.requested_at), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendario Tab */}
        <TabsContent value="calendario">
          <LeaveCalendarView onSelectRequest={handleViewRequest} />
        </TabsContent>

        {/* Alertas Tab */}
        <TabsContent value="alertas">
          <LeaveAlertsPanel onViewRequest={(id) => {
            const request = requests.find(r => r.id === id);
            if (request) handleViewRequest(request);
          }} />
        </TabsContent>

        {/* Configuración Tab */}
        <TabsContent value="configuracion" className="space-y-4">
          <Card className="rounded-[2rem] border-none shadow-sm">
            <CardHeader className="p-8 border-b border-border/50 bg-background /10 rounded-t-[2rem]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-black">Tipos de Permisos</CardTitle>
                    <p className="text-sm font-medium text-muted-foreground">Configura las reglas para cada tipo de licencia</p>
                  </div>
                </div>
                {canCreate('permisos') && (
                  <Button onClick={handleCreateConfig} className="rounded-xl">
                    <Plus className="mr-2 size-4" />Crear tipo
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-3">
                {typeConfigs.map((config) => (
                  <div
                    key={config.id}
                    className={cn(
                      'flex flex-col gap-3 p-4 border border-border/50 rounded-2xl transition-colors sm:flex-row sm:items-center sm:justify-between group',
                      canUpdate('permisos') && 'hover:bg-background cursor-pointer',
                    )}
                    onClick={() => handleConfigClick(config)}
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div 
                        className="w-10 h-10 shrink-0 rounded-xl shadow-sm flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                      >
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-base">{config.display_name}</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {config.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start justify-between gap-3 pl-14 sm:items-center sm:pl-0">
                      <div className="text-left text-sm sm:text-right">
                        <p className="text-muted-foreground font-medium">
                          {config.max_days_per_year ? `${config.max_days_per_year} días/año` : 'Sin límite'}
                        </p>
                        <div className="flex flex-wrap gap-2 sm:justify-end mt-1">
                          {config.is_paid && <Badge variant="outline" className="rounded-lg text-[10px] uppercase font-bold tracking-wider">Remunerado</Badge>}
                          {config.requires_document && <Badge variant="secondary" className="rounded-lg text-[10px] uppercase font-bold tracking-wider">Doc. requerido</Badge>}
                        </div>
                      </div>
                      <Badge variant={config.is_active ? 'default' : 'secondary'} className="rounded-lg text-[10px] uppercase font-bold tracking-wider">
                        {config.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {canDelete('permisos') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Eliminar ${config.display_name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteConfig(config);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <LeaveRequestFormDialog
        open={showNewRequestDialog}
        onOpenChange={setShowNewRequestDialog}
      />

      <LeaveRequestDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        request={selectedRequest}
      />

      <LeaveTypeConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={selectedConfig}
      />

      <LeavePublicLinkDialog
        open={showPublicLinkDialog}
        onOpenChange={setShowPublicLinkDialog}
      />

      <AlertDialog open={Boolean(deleteConfig)} onOpenChange={(open) => !open && setDeleteConfig(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar “{deleteConfig?.display_name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará únicamente si nunca se ha utilizado en solicitudes o saldos. Si tiene historial, la operación será bloqueada y podrás marcarlo como inactivo desde Configurar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteLeaveType.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteConfig();
              }}
            >
              {deleteLeaveType.isPending ? 'Verificando…' : 'Eliminar de forma segura'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
