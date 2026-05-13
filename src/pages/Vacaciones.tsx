import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Clock,
  FileText,
  Plane
} from 'lucide-react';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  VacationFormDialog,
  VacationDetailDialog,
  VacationBalanceCard,
  VacationBalanceFormDialog,
  VacationCalendarView,
  VacationAlertsPanel,
} from '@/components/vacations';
import {
  useVacationRequests,
  useVacationBalances,
  useVacationStats,
  useVacationConfig,
} from '@/hooks/useVacations';
import {
  VacationRequest,
  VacationRequestType,
  VacationStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_COLORS,
} from '@/types/vacation';
import { cn } from '@/lib/utils';
import { MobileCardList } from '@/components/shared/MobileCardList';

export default function Vacaciones() {
  const [formOpen, setFormOpen] = useState(false);
  const [balanceFormOpen, setBalanceFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<VacationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<VacationRequestType | 'all'>('all');

  const { data: requests, isLoading: requestsLoading } = useVacationRequests();
  const { data: balances, isLoading: balancesLoading } = useVacationBalances();
  const { data: stats } = useVacationStats();
  const { data: config } = useVacationConfig();
  const isMobile = useIsMobile();

  const handleRequestClick = (request: VacationRequest) => {
    setSelectedRequestId(request.id);
    setDetailOpen(true);
  };

  // Filter requests
  const filteredRequests = requests?.filter(r => {
    const matchesSearch = !searchTerm || 
      r.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee?.document_number?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesType = typeFilter === 'all' || r.request_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) ?? [];

  // Filter balances
  const filteredBalances = balances?.filter(b => {
    if (!searchTerm) return true;
    return (
      b.employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.employee?.document_number?.includes(searchTerm)
    );
  }) ?? [];

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 rounded-[2rem] border border-primary/10 p-8 sm:p-10 shadow-sm">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
              <Plane className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  NOVEDADES
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-foreground mb-1">
                Libro de Vacaciones
              </h1>
              <p className="text-sm font-medium text-muted-foreground max-w-xl">
                Gestión de vacaciones, disfrutes y compensaciones según normativa laboral.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setFormOpen(true)}
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
        <Card className="rounded-3xl border-none shadow-sm bg-muted/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-[0.85rem] bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Días Pendientes</p>
            <h3 className="text-2xl font-black tracking-tight">{stats?.totalPendingDays ?? 0}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Total en la empresa</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-none shadow-sm bg-muted/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-[0.85rem] bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Acumulación Excesiva</p>
            <h3 className="text-2xl font-black tracking-tight text-orange-600">{stats?.employeesWithExcessiveAccumulation ?? 0}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Empleados con {'>'} {config?.alert_threshold_days ?? 30} días</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-none shadow-sm bg-muted/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-[0.85rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Vacaciones Activas</p>
            <h3 className="text-2xl font-black tracking-tight text-emerald-600">{stats?.activeVacations ?? 0}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">En curso ahora mismo</p>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl border-none shadow-sm bg-muted/20 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-4 sm:p-5 relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="w-9 h-9 rounded-[0.85rem] bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Por Aprobar</p>
            <h3 className="text-2xl font-black tracking-tight text-violet-600">{stats?.pendingApprovals ?? 0}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Solicitudes en borrador</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="requests" className="space-y-6">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="grid h-14 w-full sm:w-auto grid-cols-4 p-1 bg-muted/30 rounded-2xl">
            <TabsTrigger value="requests" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all gap-2">
              <FileText className="h-4 w-4 hidden sm:block" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="balances" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all gap-2">
              <Users className="h-4 w-4 hidden sm:block" />
              Saldos
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all gap-2">
              <Calendar className="h-4 w-4 hidden sm:block" />
              Mes
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-[10px] sm:text-xs uppercase tracking-widest transition-all gap-2">
              <AlertTriangle className="h-4 w-4 hidden sm:block" />
              Avisos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-muted/20 border-primary/5 focus:bg-background text-base"
              />
            </div>
            
            <CollapsibleFilters
              activeCount={
                (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)
              }
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-2xl bg-muted/20 border-primary/5">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-primary/10">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-2xl bg-muted/20 border-primary/5">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-primary/10">
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleFilters>
          </div>

          {/* Table */}
          <Card className="rounded-[2rem] border-border/50 shadow-sm overflow-hidden">
            <CardContent className={cn("p-0", !isMobile && "overflow-x-auto")}>
              {isMobile ? (
                <div className="p-3">
                  {requestsLoading ? (
                    <div className="text-center py-8 text-muted-foreground font-black uppercase tracking-widest text-xs">Cargando...</div>
                  ) : (
                    <PullToRefresh onRefresh={async () => { await new Promise(r => setTimeout(r, 800)); }}>
                      <MobileCardList
                        items={filteredRequests.map((request) => ({
                          id: request.id,
                          title: `${request.employee?.first_name} ${request.employee?.last_name}`,
                          subtitle: request.employee?.document_number,
                          badge: (
                            <Badge className={STATUS_COLORS[request.status]}>
                              {STATUS_LABELS[request.status]}
                            </Badge>
                          ),
                          fields: [
                            { label: 'Tipo', value: <Badge className={REQUEST_TYPE_COLORS[request.request_type]}>{REQUEST_TYPE_LABELS[request.request_type]}</Badge> },
                            { label: 'Días', value: `${request.business_days} días` },
                            { label: 'Desde', value: format(new Date(request.start_date), 'dd/MM/yyyy', { locale: es }) },
                            { label: 'Hasta', value: format(new Date(request.end_date), 'dd/MM/yyyy', { locale: es }) },
                          ],
                          onClick: () => handleRequestClick(request),
                        }))}
                        emptyMessage="No se encontraron solicitudes"
                      />
                    </PullToRefresh>
                  )}
                </div>
              ) : (
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Empleado</TableHead>
                    <TableHead className="hidden sm:table-cell font-black uppercase tracking-widest text-[10px]">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell font-black uppercase tracking-widest text-[10px]">Fechas</TableHead>
                    <TableHead className="text-center font-black uppercase tracking-widest text-[10px]">Días</TableHead>
                    <TableHead className="font-black uppercase tracking-widest text-[10px]">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground font-black uppercase tracking-widest text-xs">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No se encontraron solicitudes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow 
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50 border-border/50 transition-colors"
                        onClick={() => handleRequestClick(request)}
                      >
                        <TableCell className="py-4">
                          <div>
                            <p className="font-bold text-foreground">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                              CC: {request.employee?.document_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={cn(REQUEST_TYPE_COLORS[request.request_type], "font-bold uppercase tracking-widest text-[9px] border-0")}>
                            {REQUEST_TYPE_LABELS[request.request_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm font-medium">
                            <p className="text-foreground">{format(new Date(request.start_date), 'dd MMM yyyy', { locale: es })}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              al {format(new Date(request.end_date), 'dd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                            {request.business_days}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(STATUS_COLORS[request.status], "shadow-sm")}>
                            {STATUS_LABELS[request.status]}
                          </Badge>
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

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-muted/20 p-4 rounded-[2rem] border border-border/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 rounded-2xl bg-background border-primary/5 focus:bg-background text-sm"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setBalanceFormOpen(true)}
              className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs bg-background"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Período
            </Button>
          </div>

          {balancesLoading ? (
            <div className="text-center py-12 text-muted-foreground font-black uppercase tracking-widest text-xs">Cargando...</div>
          ) : filteredBalances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-muted/20 rounded-[2rem] border border-dashed border-border/50">
              <Calendar className="h-16 w-16 mb-4 opacity-50" />
              <p className="font-bold text-lg">No hay saldos registrados</p>
              <p className="text-sm mt-1 max-w-md text-center">Los saldos se generan automáticamente al registrar solicitudes o puedes crearlos manualmente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBalances.map((balance) => (
                <VacationBalanceCard
                  key={balance.id}
                  balance={balance}
                  alertThreshold={config?.alert_threshold_days ?? 30}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar">
          <div className="bg-background rounded-[2rem] border border-border/50 shadow-sm p-4 sm:p-6">
            <VacationCalendarView onRequestClick={handleRequestClick} />
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <div className="bg-background rounded-[2rem] border border-border/50 shadow-sm p-4 sm:p-6">
            <VacationAlertsPanel />
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <VacationFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <VacationBalanceFormDialog open={balanceFormOpen} onOpenChange={setBalanceFormOpen} />
      <VacationDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        requestId={selectedRequestId}
      />
    </div>
  );
}
