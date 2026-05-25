import { useState } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { es } from 'date-fns/locale';
import { Plus, Calendar, List, Settings, Filter, Search, FileText } from 'lucide-react';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  LeaveRequestFormDialog,
  LeaveRequestDetailDialog,
  LeaveCalendarView,
  LeaveAlertsPanel,
  LeaveTypeConfigDialog,
} from '@/components/leaves';
import { useLeaveRequests, useLeaveTypeConfigs, usePendingLeavesCount } from '@/hooks/useLeaves';
import { LeaveRequest, LeaveTypeConfig, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveRequestStatus } from '@/types/leave';
import { MobileCardList } from '@/components/shared/MobileCardList';
import { cn } from '@/lib/utils';

export default function Permisos() {
  const [activeTab, setActiveTab] = useState('solicitudes');
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<LeaveTypeConfig | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: requests = [], isLoading } = useLeaveRequests();
  const { data: typeConfigs = [] } = useLeaveTypeConfigs();
  const { data: pendingCount = 0 } = usePendingLeavesCount();
  const isMobile = useIsMobile();

  // Filter requests
  const filteredRequests = requests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const employeeName = request.employees_v2
      ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`.toLowerCase()
      : '';
    const matchesSearch = !searchTerm || 
      employeeName.includes(searchTerm.toLowerCase()) ||
      LEAVE_TYPE_LABELS[request.leave_type].toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleViewRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailDialog(true);
  };

  const handleConfigClick = (config: LeaveTypeConfig) => {
    setSelectedConfig(config);
    setShowConfigDialog(true);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-[2rem] border border-border p-8 sm:p-10 shadow-sm">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <List className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  GESTIÓN
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground mb-1">
                Permisos y Licencias
              </h1>
              <p className="text-sm font-medium text-muted-foreground max-w-xl">
                Gestión de solicitudes de permisos, licencias y ausencias laborales
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowNewRequestDialog(true)}
            size="lg"
            className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* KPIs Premium */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pendientes</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight">{pendingCount}</h3>
                <p className="text-xs text-muted-foreground font-medium">Por revisar</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <List className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Aprobados</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-emerald-600">
                  {requests.filter(r => r.status === 'aprobado').length}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Este mes</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Rechazados</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-destructive">
                  {requests.filter(r => r.status === 'rechazado').length}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Este mes</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <Filter className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.5rem] border-none shadow-sm bg-background relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-5 relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tipos Activos</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black tracking-tight text-primary">
                  {typeConfigs.filter(c => c.is_active).length}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Configurados</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-[1rem] bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Settings className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Premium */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="h-12 w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-slate-100 p-1 scrollbar-hide sm:w-auto">
            <TabsTrigger value="solicitudes" className="relative h-10 min-w-[132px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <List className="h-4 w-4 shrink-0" />
              Solicitudes
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendario" className="h-10 min-w-[128px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Calendar className="h-4 w-4 shrink-0" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="alertas" className="h-10 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Filter className="h-4 w-4 shrink-0" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="configuracion" className="h-10 min-w-[128px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
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
                          subtitle: LEAVE_TYPE_LABELS[request.leave_type],
                          badge: (
                            <Badge variant={getStatusBadgeVariant(request.status)} className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                              {LEAVE_STATUS_LABELS[request.status]}
                            </Badge>
                          ),
                          fields: [
                            { label: 'Días', value: `${request.total_days}` },
                            { label: 'Fechas', value: `${format(new Date(request.start_date), 'dd MMM', { locale: es })} - ${format(new Date(request.end_date), 'dd MMM', { locale: es })}` },
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
                            <span className="font-medium text-muted-foreground">{LEAVE_TYPE_LABELS[request.leave_type]}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-medium">
                          {format(new Date(request.start_date), 'dd MMM', { locale: es })} - {format(new Date(request.end_date), 'dd MMM', { locale: es })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                            {request.total_days}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)} className="rounded-lg font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                            {LEAVE_STATUS_LABELS[request.status]}
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
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-black">Tipos de Permisos</CardTitle>
                  <p className="text-sm font-medium text-muted-foreground">Configura las reglas para cada tipo de licencia</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-3">
                {typeConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex flex-col gap-3 p-4 border border-border/50 rounded-2xl hover:bg-background cursor-pointer transition-colors sm:flex-row sm:items-center sm:justify-between group"
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
    </div>
  );
}
