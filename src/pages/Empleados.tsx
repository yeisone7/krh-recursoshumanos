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
} from 'lucide-react';
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
import { GenerateRegistrationLinkDialog } from '@/components/registration/GenerateRegistrationLinkDialog';
import { RegistrationTokensList } from '@/components/registration/RegistrationTokensList';
import { useEmployees } from '@/hooks/useEmployees';
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeFullName } from '@/types/employee';
import { useProfesiogramas } from '@/hooks/useDotationProfesiograma';

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

  const { currentCompanyId } = useAuth();
  const { data: employees, isLoading } = useEmployees();
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTokensList(!showTokensList)}
            className="gap-2"
          >
            <Link2 className="w-4 h-4" />
            Enlaces de Registro
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowGenerateLink(true)}
            className="gap-2"
          >
            <Link2 className="w-4 h-4" />
            Generar Enlace
          </Button>
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="gradient-primary text-primary-foreground hover:opacity-90 gap-2"
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
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats + Certification Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
              transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
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
          transition={{ duration: 0.3, delay: 0.3 }}
          className="lg:col-span-9"
        >
          <CertificationAlertsPanel onEmployeeClick={handleOpenDetail} />
        </motion.div>
      </div>

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
            />
          ))}
        </div>
      )}
    </div>
  );
}
