import { todayDateOnlyString } from '@/lib/dateOnly';
import { motion } from 'framer-motion';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  Loader2,
  Link2,
  LayoutGrid,
  List,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';
import { CertificationAlertsPanel } from '@/components/employees/CertificationAlertsPanel';
import { EmployeeCard } from '@/components/employees/EmployeeCard';
import { IssueCertificateDialog } from '@/components/employees/IssueCertificateDialog';
import { RehireEmployeeDialog } from '@/components/employees/RehireEmployeeDialog';
import { TransferEmployeeDialog } from '@/components/employees/TransferEmployeeDialog';
import { TerminationProcessDialog } from '@/components/termination/TerminationProcessDialog';
import { GenerateRegistrationLinkDialog } from '@/components/registration/GenerateRegistrationLinkDialog';
import { RegistrationTokensList } from '@/components/registration/RegistrationTokensList';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { useEmployees, useEmployeesInfinite, useToggleEmployeeActive } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { getEmployeeFullName } from '@/types/employee';
import { useProfesiogramas } from '@/hooks/useDotationProfesiograma';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;
const EMPLOYEES_VIEW_MODE_STORAGE_KEY = 'krh.employees.viewMode';

const getInitialEmployeesViewMode = (): 'grid' | 'table' => {
  if (typeof window === 'undefined') return 'grid';

  const storedViewMode = window.localStorage.getItem(EMPLOYEES_VIEW_MODE_STORAGE_KEY);
  return storedViewMode === 'table' || storedViewMode === 'grid' ? storedViewMode : 'grid';
};

export default function Empleados() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [rehireEmployee, setRehireEmployee] = useState<any>(null);
  const [isRehireOpen, setIsRehireOpen] = useState(false);
  const [showGenerateLink, setShowGenerateLink] = useState(false);
  const [showTokensList, setShowTokensList] = useState(false);
  const [transferEmployee, setTransferEmployee] = useState<any>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [certEmployee, setCertEmployee] = useState<any>(null);
  const [isCertOpen, setIsCertOpen] = useState(false);
  const [terminationEmployee, setTerminationEmployee] = useState<any>(null);
  const [isTerminationOpen, setIsTerminationOpen] = useState(false);
  const [toggleEmployee, setToggleEmployee] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(getInitialEmployeesViewMode);
  const [showDashboardSummary, setShowDashboardSummary] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 12;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleViewModeChange = (nextViewMode: 'grid' | 'table') => {
    setViewMode(nextViewMode);
    window.localStorage.setItem(EMPLOYEES_VIEW_MODE_STORAGE_KEY, nextViewMode);
  };

  const { currentCompanyId, assignedCenterIds, canUpdate, hasPermission } = useAuth();
  const canManageRegistrationLinks = hasPermission('emp_registration_links', 'create');
  
  // Use infinite hook for the list view
  const { 
    data: infiniteData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading: isPagingLoading 
  } = useEmployeesInfinite({
    pageSize,
    search: debouncedSearch,
    status: statusFilter,
    centerId: centerFilter,
  });

  // Flatten the pages from infiniteData
  const currentEmployees = useMemo(() => {
    return infiniteData?.pages.flatMap(page => page.data) || [];
  }, [infiniteData]);

  // Infinite Scroll Observer using a more robust pattern
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isPagingLoading || isFetchingNextPage) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      },
      { 
        root: null, 
        threshold: 0.1,
        rootMargin: '200px' // Fetch slightly earlier for smoother experience
      }
    );
    
    if (node) {
      observerRef.current.observe(node);
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isPagingLoading]);

  // Keep the full query ONLY for stats and exports
  const { data: employees, isLoading } = useEmployees();

  const totalCount = infiniteData?.pages[0]?.totalCount || 0;
  const { data: allAlerts } = useDashboardAlerts();
  
  const certificationAlerts = allAlerts?.filter(alert => alert.type === 'certification') || [];
  const expiredCount = certificationAlerts.filter(a => a.daysRemaining < 0).length;
  const criticalCount = certificationAlerts.filter(a => a.level === 'critical' && a.daysRemaining >= 0).length;
  const warningCount = certificationAlerts.filter(a => a.level === 'warning').length;
  const { data: operationCenters } = useOperationCenters();
  const { data: profesiogramas } = useProfesiogramas();
  const toggleEmployeeActive = useToggleEmployeeActive();

  const profesiogramaKeys = useMemo(() => {
    if (!profesiogramas) return new Set<string>();
    return new Set(profesiogramas.map(p => `${p.operation_center_id}|${p.position_id}`));
  }, [profesiogramas]);

  const hasProfesiograma = (emp: any) => {
    const centerId = emp.work_info?.operation_center_id;
    const positionId = emp.work_info?.position_id;
    if (!centerId || !positionId) return false;
    return profesiogramaKeys.has(`${centerId}|${positionId}`);
  };

  useEffect(() => {
    const detailId = searchParams.get('detail');
    const statusParam = searchParams.get('status');
    if (detailId && employees) {
      const employee = employees.find(e => e.id === detailId);
      if (employee) {
        setSelectedEmployeeId(detailId);
        setIsDetailOpen(true);
        setSearchParams({}, { replace: true });
      }
    }
    if (statusParam) {
      setStatusFilter(statusParam);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('status');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, employees, setSearchParams]);

  const handleOpenDetail = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setIsDetailOpen(true);
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };

  const handleViewContract = (employeeId: string) => {
    navigate(`/contratos?employee=${employeeId}`);
  };

  const handleViewDocuments = (employeeId: string) => {
    navigate(`/empleados/${employeeId}/360?tab=documentos`);
  };

  const handleRehire = (employee: any) => {
    setRehireEmployee(employee);
    setIsRehireOpen(true);
  };

  const handleTransfer = (employee: any) => {
    setTransferEmployee(employee);
    setIsTransferOpen(true);
  };

  const handleIssueCertificate = (employee: any) => {
    setCertEmployee(employee);
    setIsCertOpen(true);
  };

  const handleStartTermination = (employee: any) => {
    setTerminationEmployee(employee);
    setIsTerminationOpen(true);
  };

  const isEmployeeSuspended = (employee: any) => {
    if (!employee) return false;
    const isLegacyRetired = !employee.is_active && employee.status === 'active';
    const isRetired = employee.status === 'retired' || employee.status === 'en_retiro' || isLegacyRetired;
    return employee.status === 'suspended' || (!employee.is_active && !isRetired);
  };

  const handleToggleEmployeeActive = async () => {
    if (!toggleEmployee) return;

    const shouldActivate = isEmployeeSuspended(toggleEmployee);
    try {
      await toggleEmployeeActive.mutateAsync({
        id: toggleEmployee.id,
        isActive: shouldActivate,
      });
      setToggleEmployee(null);
      toast.success(shouldActivate ? 'Empleado reactivado' : 'Empleado suspendido');
    } catch (error) {
      console.error('Error toggling employee status:', error);
      toast.error('No se pudo actualizar el estado del empleado');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCenterFilter('all');
    toast.success('Filtros limpiados');
  };

  const canStartTermination = canUpdate('contratos') || canUpdate('empleados');

  const handleExport = () => {
    if (!filteredEmployeesForExport || filteredEmployeesForExport.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      const dataToExport = filteredEmployeesForExport.map(emp => ({
        'Nombre Completo': getEmployeeFullName(emp),
        'Tipo Documento': emp.document_type || '',
        'Número Documento': emp.document_number || '',
        'Cargo': emp.work_info?.position_name || 'N/A',
        'Centro de Operación': emp.operation_centers?.name || 'N/A',
        'Estado': emp.status === 'en_retiro'
          ? 'En Retiro'
          : emp.status === 'retired' || (!emp.is_active && emp.status === 'active')
            ? 'Retirado'
            : emp.status === 'suspended' || !emp.is_active
              ? 'Inactivo'
              : 'Activo',
        'Fecha de Ingreso': emp.work_info?.hire_date || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
      XLSX.writeFile(wb, `Empleados_${todayDateOnlyString()}.xlsx`);
      toast.success('Archivo exportado correctamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const isFiltered = searchQuery !== '' || statusFilter !== 'all' || centerFilter !== 'all';

  // We no longer need filteredEmployees for the list view as it's done server-side
  // But we still need it for EXPORT (to export what's filtered)
  const filteredEmployeesForExport = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const fullName = getEmployeeFullName(emp).toLowerCase();
      const position = emp.work_info?.position_name?.toLowerCase() || '';
      const documentNumber = emp.document_number?.toLowerCase() || '';
      const documentType = emp.document_type?.toLowerCase() || '';
      const normalizedSearch = searchQuery.toLowerCase();
      const matchesSearch = 
        fullName.includes(normalizedSearch) ||
        position.includes(normalizedSearch) ||
        documentNumber.includes(normalizedSearch) ||
        documentType.includes(normalizedSearch);
      
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = emp.is_active && emp.status === 'active';
      else if (statusFilter === 'inactive') matchesStatus = emp.status === 'suspended' || (!emp.is_active && emp.status !== 'retired' && emp.status !== 'en_retiro' && emp.status !== 'active');
      else if (statusFilter === 'retired') matchesStatus = emp.status === 'retired' || (!emp.is_active && emp.status === 'active');
      else if (statusFilter === 'en_retiro') matchesStatus = emp.status === 'en_retiro';
      else if (statusFilter === 'new') {
        matchesStatus = !!emp.created_at && (Date.now() - new Date(emp.created_at).getTime()) < TEN_DAYS_MS;
      } else if (statusFilter !== 'all') matchesStatus = true;

      const matchesCenter = centerFilter === 'all' || emp.work_info?.operation_center_id === centerFilter;
      return matchesSearch && matchesStatus && matchesCenter;
    });
  }, [employees, searchQuery, statusFilter, centerFilter]);

  const stats = useMemo(() => {
    if (!employees) return { total: 0, active: 0, inactive: 0, retired: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.is_active && e.status === 'active').length,
      inactive: employees.filter(e => e.status === 'suspended' || (!e.is_active && e.status !== 'retired' && e.status !== 'en_retiro' && e.status !== 'active')).length,
      retired: employees.filter(e => e.status === 'retired' || e.status === 'en_retiro').length,
    };
  }, [employees]);

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">Contacta al administrador para que te asigne a una empresa.</p>
      </div>
    );
  }

  // Show main loader only on first mount or when switching companies
  // If we already have some employees from useEmployees, we don't need to block everything
  if (isLoading && !employees) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Empleados</h1>
          <p className="text-muted-foreground mt-1">Gestiona la información de todos los empleados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageRegistrationLinks && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowTokensList(!showTokensList)}
                className="gap-2 hidden sm:inline-flex"
              >
                <Link2 className="w-4 h-4" />
                Enlaces de Registro
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowGenerateLink(true)}
                className="gap-2 hidden sm:inline-flex"
              >
                <Link2 className="w-4 h-4" />
                Generar Enlace
              </Button>
            </>
          )}
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="gradient-primary text-primary-foreground hover:opacity-90 gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Empleado
          </Button>
        </div>
      </motion.div>

      <EmployeeFormDialog 
        open={isFormOpen} 
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingEmployee(null);
        }}
        employee={editingEmployee}
      />

      <EmployeeDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        employeeId={selectedEmployeeId}
      />

      <RehireEmployeeDialog
        open={isRehireOpen}
        onOpenChange={(open) => {
          setIsRehireOpen(open);
          if (!open) setRehireEmployee(null);
        }}
        employee={rehireEmployee}
      />

      <GenerateRegistrationLinkDialog
        open={showGenerateLink}
        onOpenChange={setShowGenerateLink}
        targetType="employee"
      />

      {showTokensList && canManageRegistrationLinks && !isLoading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-card rounded-lg border p-4"
        >
          <h3 className="text-sm font-semibold mb-3">Enlaces de Auto-registro de Empleados</h3>
          <RegistrationTokensList targetType="employee" />
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-card rounded-xl shadow-sm p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, cargo o documento..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-card border border-transparent focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="retired">🚪 Retirados</SelectItem>
                <SelectItem value="en_retiro">⏳ En Retiro</SelectItem>
                <SelectItem value="new">✨ Nuevos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="w-[180px] h-10 text-sm border-border">
                <SelectValue placeholder="Centro de operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {assignedCenterIds.length > 0 ? 'Mis centros asignados' : 'Todos los centros'}
                </SelectItem>
                {operationCenters?.map((center) => (
                  <SelectItem key={center.id} value={center.id}>{center.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant={isFiltered ? "secondary" : "outline"} 
              size="icon" 
              className={cn("h-10 w-10 transition-all", isFiltered && "bg-primary/10 border-primary/20 text-primary")}
              onClick={handleResetFilters}
              title={isFiltered ? "Limpiar filtros" : "Filtrar"}
            >
              <Filter className={cn("w-4 h-4", isFiltered && "fill-current")} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 hover:hover:text-primary transition-colors"
              onClick={handleExport}
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center bg-card rounded-lg p-1 border border-border/50 ml-2 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('grid')}
                className={cn(
                  "h-8 w-8 p-0 transition-all",
                  viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-sm" : "hover:hover:text-primary"
                )}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('table')}
                className={cn(
                  "h-8 w-8 p-0 transition-all",
                  viewMode === 'table' ? "bg-primary text-primary-foreground shadow-sm" : "hover:hover:text-primary"
                )}
                title="Vista Tabla"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dashboard Summary: Stats + Certification Alerts */}
      <Collapsible
        open={showDashboardSummary}
        onOpenChange={setShowDashboardSummary}
        className="space-y-4"
      >
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Resumen del Tablero</h2>
            </div>
            
            {/* Header Badges - Visible even when collapsed */}
            <div className="hidden sm:flex items-center gap-2">
              {expiredCount > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] h-5 px-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {expiredCount} vencidas
                </Badge>
              )}
              {criticalCount > 0 && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] h-5 px-2">
                  <Clock className="w-3 h-3 mr-1" />
                  {criticalCount} críticas
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px] h-5 px-2">
                  <Clock className="w-3 h-3 mr-1" />
                  {warningCount} advertencias
                </Badge>
              )}
            </div>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary transition-colors">
              {showDashboardSummary ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Ocultar resumen</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Mostrar resumen</span>
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 flex flex-col gap-4">
              {[
                { label: 'Total empleados', value: stats.total, color: 'secondary' },
                { label: 'Activos', value: stats.active, color: 'success' },
                { label: 'Inactivos', value: stats.inactive, color: 'rose' },
                { label: 'Retirados', value: stats.retired, color: 'warning' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
                  className={`card-elevated p-4 flex items-center gap-3 border-l-4 border-l-${stat.color}`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-${stat.color}-light flex items-center justify-center flex-shrink-0`}>
                    <Users className={`w-5 h-5 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="lg:col-span-9"
            >
              <CertificationAlertsPanel 
                onEmployeeClick={handleOpenDetail} 
                alerts={certificationAlerts}
              />
            </motion.div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Employee Grid */}
      {isPagingLoading && currentEmployees.length === 0 ? (
        <div className="flex items-center justify-center h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Cargando empleados...</p>
          </div>
        </div>
      ) : currentEmployees.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-elevated p-12 text-center">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all' || centerFilter !== 'all'
              ? 'No se encontraron empleados con los filtros seleccionados'
              : 'Comienza agregando tu primer empleado'}
          </p>
          {!searchQuery && statusFilter === 'all' && centerFilter === 'all' && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Empleado
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6 relative">
          {isFetchingNextPage && viewMode === 'table' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/40 backdrop-blur-[2px] rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          {viewMode === 'grid' ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${isPagingLoading ? 'opacity-50' : ''}`}>
              {currentEmployees.map((employee, index) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  index={index}
                  hasProfesiograma={hasProfesiograma(employee)}
                  onOpenDetail={handleOpenDetail}
                  onEdit={handleEdit}
                  onViewContract={handleViewContract}
                  onViewDocuments={handleViewDocuments}
                  onRehire={handleRehire}
                  onTransfer={handleTransfer}
                  onIssueCertificate={handleIssueCertificate}
                  onToggleActive={setToggleEmployee}
                  onStartTermination={canStartTermination ? handleStartTermination : undefined}
                />
              ))}
            </div>
          ) : (
            <div className={isPagingLoading ? 'opacity-50' : ''}>
              <EmployeeTable 
                employees={currentEmployees}
                hasProfesiogramaFn={hasProfesiograma}
                onOpenDetail={handleOpenDetail}
                onEdit={handleEdit}
                onViewContract={handleViewContract}
                onViewDocuments={handleViewDocuments}
                onRehire={handleRehire}
                onTransfer={handleTransfer}
                onIssueCertificate={handleIssueCertificate}
                onToggleActive={setToggleEmployee}
                onStartTermination={canStartTermination ? handleStartTermination : undefined}
              />
            </div>
          )}

          {/* Infinite Scroll Sentinel */}
          <div ref={lastElementRef} className="py-8 flex flex-col items-center justify-center gap-4">
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground italic">Cargando más empleados...</p>
              </>
            ) : hasNextPage ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => fetchNextPage()}
                className="text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs">Desliza o haz clic para cargar más</span>
                  <ChevronDown className="w-4 h-4 animate-bounce mt-1" />
                </div>
              </Button>
            ) : currentEmployees.length > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                <p className="text-sm text-muted-foreground">Has llegado al final del listado</p>
                <p className="text-xs text-muted-foreground/60">Mostrando {currentEmployees.length} de {totalCount} empleados</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {transferEmployee && (
        <TransferEmployeeDialog
          open={isTransferOpen}
          onOpenChange={(open) => {
            setIsTransferOpen(open);
            if (!open) setTransferEmployee(null);
          }}
          employee={transferEmployee}
        />
      )}

      {certEmployee && (
        <IssueCertificateDialog
          open={isCertOpen}
          onOpenChange={(open) => {
            setIsCertOpen(open);
            if (!open) setCertEmployee(null);
          }}
          employee={certEmployee}
        />
      )}

      {terminationEmployee && (
        <TerminationProcessDialog
          open={isTerminationOpen}
          onOpenChange={(open) => {
            setIsTerminationOpen(open);
            if (!open) setTerminationEmployee(null);
          }}
          employee={terminationEmployee}
        />
      )}

      <AlertDialog open={!!toggleEmployee} onOpenChange={(open) => !open && setToggleEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEmployeeSuspended(toggleEmployee) ? 'Reactivar empleado' : 'Suspender empleado'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isEmployeeSuspended(toggleEmployee)
                ? `Se reactivara a ${toggleEmployee ? getEmployeeFullName(toggleEmployee) : 'este empleado'} y volvera a aparecer como activo en los procesos operativos.`
                : `Se suspendera a ${toggleEmployee ? getEmployeeFullName(toggleEmployee) : 'este empleado'} sin marcarlo como retirado ni cerrar su contrato.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleEmployeeActive.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleEmployeeActive} disabled={toggleEmployeeActive.isPending}>
              {toggleEmployeeActive.isPending
                ? 'Procesando...'
                : isEmployeeSuspended(toggleEmployee)
                  ? 'Reactivar'
                  : 'Suspender'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
