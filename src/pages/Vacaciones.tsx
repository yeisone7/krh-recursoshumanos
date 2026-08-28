import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  AlertTriangle, 
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
  VacationBalanceFormDialog,
  VacationBalancesPanel,
  VacationCalendarView,
  VacationAlertsPanel,
} from '@/components/vacations';
import {
  useVacationRequests,
  useVacationBalances,
} from '@/hooks/useVacations';
import { useAuth } from '@/contexts/AuthContext';
import {
  VacationRequest,
  VacationRequestType,
  VacationStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_COLORS,
  APPROVAL_STAGE_LABELS,
  APPROVAL_STAGE_COLORS,
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
  const { data: balances, isLoading: balancesLoading, error: balancesError } = useVacationBalances();
  const { hasPermission, isAdmin, isRRHH, isSuperAdmin } = useAuth();
  const canAdjustBalances = isAdmin || isRRHH || isSuperAdmin || hasPermission('vacation_balances', 'update');
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

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
              <Plane className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  NOVEDADES
                </Badge>
              </div>
              <h1 className="text-2xl font-black leading-tight tracking-tighter text-foreground sm:text-3xl">
                Libro de Vacaciones
              </h1>
              <p className="mt-0.5 max-w-xl text-xs font-medium text-muted-foreground sm:text-sm">
                Gestión de vacaciones, disfrutes y compensaciones según normativa laboral.
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setFormOpen(true)}
            size="lg"
            className="h-11 w-full shrink-0 rounded-xl bg-primary px-6 text-[11px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Solicitud
          </Button>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="requests" className="space-y-3">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="h-11 w-full gap-1 overflow-x-auto overflow-y-hidden rounded-xl border border-border bg-slate-100 p-1 scrollbar-hide sm:w-auto">
            <TabsTrigger value="requests" className="h-9 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <FileText className="h-4 w-4 shrink-0" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="balances" className="h-9 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Users className="h-4 w-4 shrink-0" />
              Saldos
            </TabsTrigger>
            <TabsTrigger value="calendar" className="h-9 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <Calendar className="h-4 w-4 shrink-0" />
              Mes
            </TabsTrigger>
            <TabsTrigger value="alerts" className="h-9 min-w-[112px] flex-1 gap-2 rounded-lg px-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none">
              <AlertTriangle className="h-4 w-4 shrink-0" />
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
                className="h-14 pl-12 rounded-2xl bg-background border-border focus:bg-background text-base"
              />
            </div>
            
            <CollapsibleFilters
              activeCount={
                (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)
              }
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as VacationStatus | 'all')}>
                  <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-2xl bg-background border-border ">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border ">
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as VacationRequestType | 'all')}>
                  <SelectTrigger className="w-full sm:w-[220px] h-12 rounded-2xl bg-background border-border ">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border ">
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
                            <Badge className={APPROVAL_STAGE_COLORS[request.approval_stage]}>
                              {APPROVAL_STAGE_LABELS[request.approval_stage]}
                            </Badge>
                          ),
                          fields: [
                            { label: 'Tipo', value: <Badge className={REQUEST_TYPE_COLORS[request.request_type]}>{REQUEST_TYPE_LABELS[request.request_type]}</Badge> },
                            { label: 'Días', value: `${request.business_days} días` },
                            { label: 'Desde', value: formatDateOnly(request.start_date, 'dd/MM/yyyy', { locale: es }) },
                            { label: 'Hasta', value: formatDateOnly(request.end_date, 'dd/MM/yyyy', { locale: es }) },
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
                <TableHeader className="bg-background">
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
                        className="cursor-pointer hover:bg-background border-border/50 transition-colors"
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
                            <p className="text-foreground">{formatDateOnly(request.start_date, 'dd MMM yyyy', { locale: es })}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              al {formatDateOnly(request.end_date, 'dd MMM yyyy', { locale: es })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                            {request.business_days}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(APPROVAL_STAGE_COLORS[request.approval_stage], "shadow-sm")}>
                            {APPROVAL_STAGE_LABELS[request.approval_stage]}
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
          <div className="flex flex-col gap-4 bg-background p-4 rounded-[2rem] border border-border/50">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 pl-12 rounded-2xl bg-background border-border focus:bg-background text-sm"
              />
            </div>
          </div>
          <VacationBalancesPanel
            balances={balances ?? []}
            searchTerm={searchTerm}
            isLoading={balancesLoading}
            error={balancesError}
            onAdjust={() => setBalanceFormOpen(true)}
            canAdjust={canAdjustBalances}
          />
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-0">
          <VacationCalendarView onRequestClick={handleRequestClick} />
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
