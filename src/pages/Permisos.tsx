import { useState } from 'react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { es } from 'date-fns/locale';
import { Plus, Calendar, List, Settings, Filter, Search } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permisos y Licencias</h1>
          <p className="text-muted-foreground">
            Gestión de solicitudes de permisos y licencias
          </p>
        </div>
        <Button onClick={() => setShowNewRequestDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <Badge variant="outline" className="h-8">
                Por revisar
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aprobados (mes)</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'aprobado').length}
                </p>
              </div>
              <Badge className="h-8">Aprobados</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rechazados (mes)</p>
                <p className="text-2xl font-bold">
                  {requests.filter(r => r.status === 'rechazado').length}
                </p>
              </div>
              <Badge variant="destructive" className="h-8">Rechazados</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tipos Activos</p>
                <p className="text-2xl font-bold">
                  {typeConfigs.filter(c => c.is_active).length}
                </p>
              </div>
              <Badge variant="secondary" className="h-8">Configurados</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="solicitudes" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Solicitudes
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="alertas" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="configuracion" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Solicitudes Tab */}
        <TabsContent value="solicitudes" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empleado o tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="aprobado">Aprobado</SelectItem>
                <SelectItem value="rechazado">Rechazado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden md:table-cell">Fechas</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">Solicitado</TableHead>
                    <TableHead className="hidden sm:table-cell"></TableHead>
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
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewRequest(request)}
                      >
                        <TableCell className="font-medium">
                          {request.employees_v2
                            ? `${request.employees_v2.first_name} ${request.employees_v2.last_name}`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getTypeColor(request.leave_type) }}
                            />
                            {LEAVE_TYPE_LABELS[request.leave_type]}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(request.start_date), 'dd MMM', { locale: es })} - {format(new Date(request.end_date), 'dd MMM', { locale: es })}
                        </TableCell>
                        <TableCell>{request.total_days}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)}>
                            {LEAVE_STATUS_LABELS[request.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          {format(new Date(request.requested_at), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Button variant="ghost" size="sm">
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Permisos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {typeConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleConfigClick(config)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <div>
                        <p className="font-medium">{config.display_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {config.description || 'Sin descripción'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {config.max_days_per_year ? `${config.max_days_per_year} días/año` : 'Sin límite'}
                        </p>
                        <div className="flex gap-2">
                          {config.is_paid && <Badge variant="outline">Remunerado</Badge>}
                          {config.requires_document && <Badge variant="secondary">Doc. requerido</Badge>}
                        </div>
                      </div>
                      <Badge variant={config.is_active ? 'default' : 'secondary'}>
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
