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
  Filter,
  Download
} from 'lucide-react';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { CollapsibleFilters } from '@/components/shared/CollapsibleFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro de Vacaciones</h1>
          <p className="text-muted-foreground">
            Gestión de vacaciones según normativa laboral colombiana
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPendingDays ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total en la empresa</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acumulación Excesiva</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.employeesWithExcessiveAccumulation ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Empleados con {'>'}{config?.alert_threshold_days ?? 30} días
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacaciones Activas</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.activeVacations ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">En curso ahora</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Aprobar</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.pendingApprovals ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Solicitudes en borrador</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Solicitudes
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Saldos
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <CollapsibleFilters
              activeCount={
                (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)
              }
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
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
          <Card>
            <CardContent className={cn("p-0", !isMobile && "overflow-x-auto")}>
              {isMobile ? (
                <div className="p-3">
                  {requestsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Cargando...</div>
                  ) : (
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
                  )}
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Fechas</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requestsLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No se encontraron solicitudes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow 
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRequestClick(request)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {request.employee?.document_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge className={REQUEST_TYPE_COLORS[request.request_type]}>
                            {REQUEST_TYPE_LABELS[request.request_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            <p>{format(new Date(request.start_date), 'dd/MM/yyyy', { locale: es })}</p>
                            <p className="text-muted-foreground">
                              al {format(new Date(request.end_date), 'dd/MM/yyyy', { locale: es })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{request.business_days}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[request.status]}>
                            {STATUS_LABELS[request.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRequestClick(request);
                            }}
                          >
                            Ver detalle
                          </Button>
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
        <TabsContent value="balances" className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={() => setBalanceFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Período
            </Button>
          </div>

          {balancesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : filteredBalances.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay saldos de vacaciones registrados</p>
              <p className="text-sm mt-1">Los saldos se generan automáticamente al registrar solicitudes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <VacationCalendarView onRequestClick={handleRequestClick} />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <VacationAlertsPanel />
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
