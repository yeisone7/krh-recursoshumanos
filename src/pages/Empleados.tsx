import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
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
import { RehireEmployeeDialog } from '@/components/employees/RehireEmployeeDialog';
import { TransferEmployeeDialog } from '@/components/employees/TransferEmployeeDialog';
import { GenerateRegistrationLinkDialog } from '@/components/registration/GenerateRegistrationLinkDialog';
import { RegistrationTokensList } from '@/components/registration/RegistrationTokensList';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { getEmployeeFullName } from '@/types/employee';
import { useProfesiogramas } from '@/hooks/useDotationProfesiograma';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showDashboardSummary, setShowDashboardSummary] = useState(false);

  const { currentCompanyId } = useAuth();
  const { data: employees, isLoading } = useEmployees();
  const { data: allAlerts } = useDashboardAlerts();
  
  const certificationAlerts = allAlerts?.filter(alert => alert.type === 'certification') || [];
  const expiredCount = certificationAlerts.filter(a => a.daysRemaining < 0).length;
  const criticalCount = certificationAlerts.filter(a => a.level === 'critical' && a.daysRemaining >= 0).length;
  const warningCount = certificationAlerts.filter(a => a.level === 'warning').length;
  const { data: operationCenters } = useOperationCenters();
  const { data: profesiogramas } = useProfesiogramas();

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

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCenterFilter('all');
    toast.success('Filtros limpiados');
  };

  const handleExport = () => {
    if (!filteredEmployees || filteredEmployees.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    try {
      const dataToExport = filteredEmployees.map(emp => ({
        'ID Empleado': emp.employee_id || '',
        'Nombre Completo': getEmployeeFullName(emp),
        'Tipo Documento': emp.document_type || '',
        'Número Documento': emp.document_number || '',
        'Cargo': emp.work_info?.position?.name || 'N/A',
        'Centro de Operación': emp.work_info?.operation_center?.name || 'N/A',
        'Estado': emp.is_active ? 'Activo' : 'Inactivo',
        'Fecha de Ingreso': emp.work_info?.hire_date || '',
        'Correo': emp.email || '',
        'Teléfono': emp.phone || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
      XLSX.writeFile(wb, `Empleados_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Archivo exportado correctamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar los datos');
    }
  };

  const isFiltered = searchQuery !== '' || statusFilter !== 'all' || centerFilter !== 'all';

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const fullName = getEmployeeFullName(emp).toLowerCase();
      const position = emp.work_info?.position_name?.toLowerCase() || '';
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        position.includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = emp.is_active && emp.status !== 'retired' && emp.status !== 'en_retiro';
      else if (statusFilter === 'inactive') matchesStatus = !emp.is_active && emp.status !== 'retired' && emp.status !== 'en_retiro';
      else if (statusFilter === 'retired') matchesStatus = emp.status === 'retired' || emp.status === 'en_retiro';
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
      active: employees.filter(e => e.is_active && e.status !== 'retired' && e.status !== 'en_retiro').length,
      inactive: employees.filter(e => !e.is_active && e.status !== 'retired' && e.status !== 'en_retiro').length,
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

  if (isLoading) {
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

      {showTokensList && (
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
        className="card-elevated p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, cargo..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
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
                <SelectItem value="all">Todos los centros</SelectItem>
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
              className="h-10 w-10 hover:bg-primary/5 hover:text-primary transition-colors"
              onClick={handleExport}
              title="Exportar a Excel"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50 ml-2 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-8 w-8 p-0 transition-all",
                  viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/5 hover:text-primary"
                )}
                title="Vista Cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-8 w-8 p-0 transition-all",
                  viewMode === 'table' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/5 hover:text-primary"
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
      {filteredEmployees.length === 0 ? (
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
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee, index) => (
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
              />
            ))}
          </div>
        ) : (
          <EmployeeTable 
            employees={filteredEmployees}
            hasProfesiogramaFn={hasProfesiograma}
            onOpenDetail={handleOpenDetail}
            onEdit={handleEdit}
            onViewContract={handleViewContract}
            onViewDocuments={handleViewDocuments}
            onRehire={handleRehire}
            onTransfer={handleTransfer}
          />
        )
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
    </div>
  );
}
