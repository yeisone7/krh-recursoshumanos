import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  MoreHorizontal,
  ChevronRight,
  MapPin,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  Loader2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';
import { CertificationAlertsPanel } from '@/components/employees/CertificationAlertsPanel';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeFullName } from '@/types/employee';

export default function Empleados() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { currentCompanyId } = useAuth();
  const { data: employees, isLoading } = useEmployees();
  const { data: operationCenters } = useOperationCenters();

  // Handle deep linking from dashboard
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

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp) => {
      const fullName = getEmployeeFullName(emp).toLowerCase();
      const position = emp.work_info?.position_name?.toLowerCase() || '';
      const matchesSearch = 
        fullName.includes(searchQuery.toLowerCase()) ||
        position.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && emp.is_active) ||
        (statusFilter === 'inactive' && !emp.is_active);
      const matchesCenter = centerFilter === 'all' || 
        emp.work_info?.operation_center_id === centerFilter;
      return matchesSearch && matchesStatus && matchesCenter;
    });
  }, [employees, searchQuery, statusFilter, centerFilter]);

  const stats = useMemo(() => {
    if (!employees) return { total: 0, active: 0, inactive: 0 };
    return {
      total: employees.length,
      active: employees.filter(e => e.is_active).length,
      inactive: employees.filter(e => !e.is_active).length,
    };
  }, [employees]);

  if (!currentCompanyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Users className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin empresa asignada</h2>
        <p className="text-muted-foreground">
          Contacta al administrador para que te asigne a una empresa.
        </p>
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
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="gradient-primary text-primary-foreground hover:opacity-90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </motion.div>

      {/* Employee Form Dialog */}
      <EmployeeFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen}
      />

      {/* Employee Detail Dialog */}
      <EmployeeDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        employeeId={selectedEmployeeId}
      />

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="card-elevated p-4"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
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

          {/* Filters */}
          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={centerFilter} onValueChange={setCenterFilter}>
              <SelectTrigger className="w-[180px] h-10 text-sm border-border">
                <SelectValue placeholder="Centro de operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                {operationCenters?.map((center) => (
                  <SelectItem key={center.id} value={center.id}>
                    {center.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon" className="h-10 w-10">
              <Filter className="w-4 h-4" />
            </Button>

            <Button variant="outline" size="icon" className="h-10 w-10">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats and Certification Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Stats Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="card-elevated p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total empleados</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="card-elevated p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{stats.active}</p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
            className="card-elevated p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-foreground">{stats.inactive}</p>
              <p className="text-sm text-muted-foreground">Inactivos</p>
            </div>
          </motion.div>
        </div>

        {/* Certification Alerts Panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="lg:row-span-2"
        >
          <CertificationAlertsPanel onEmployeeClick={handleOpenDetail} />
        </motion.div>
      </div>

      {/* Employee Grid */}
      {filteredEmployees.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-elevated p-12 text-center"
        >
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee, index) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="card-elevated p-5 group cursor-pointer hover:border-primary/30"
              onClick={() => handleOpenDetail(employee.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {getEmployeeFullName(employee)}
                    </h3>
                    <p className="text-sm text-muted-foreground">{employee.work_info?.position_name || 'Sin cargo'}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDetail(employee.id); }}>
                      Ver perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/empleados/${employee.id}/360`); }}>
                      <Eye className="w-4 h-4 mr-2" />
                      Vista 360
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Editar</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Ver contrato</DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>Documentos</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>{employee.areas?.name || 'Sin área'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.operation_centers?.name || 'Sin centro asignado'}</span>
                </div>
                {employee.work_info?.hire_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Desde {new Date(employee.work_info.hire_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Badge variant="outline" className={cn(
                  employee.is_active 
                    ? 'bg-success-light text-success border-success/20'
                    : 'bg-muted text-muted-foreground border-border'
                )}>
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                <div className="flex items-center gap-2">
                  {employee.contact?.email && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Mail className="w-4 h-4" />
                    </Button>
                  )}
                  {employee.contact?.phone && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <Phone className="w-4 h-4" />
                    </Button>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
