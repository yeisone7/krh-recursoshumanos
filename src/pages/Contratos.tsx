import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Search,
  Plus,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Calendar,
  User
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
import { cn } from '@/lib/utils';

import { ContractFormDialog } from '@/components/contracts/ContractFormDialog';
import { ContractDetailDialog } from '@/components/contracts/ContractDetailDialog';
import {
  Contract,
  ContractExtension,
  ContractType,
  contractTypeLabels,
  getContractStatus,
  calculateDaysRemaining,
  getCurrentEndDate,
} from '@/types/contract';

// Mock data with full Contract structure
const mockContracts: Contract[] = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'María García López',
    contractType: 'indefinite',
    startDate: new Date('2022-03-15'),
    originalEndDate: null,
    currentEndDate: null,
    salary: 4500000,
    salaryType: 'monthly',
    transportAllowance: false,
    operationCenter: 'Bogotá Centro',
    position: 'Analista de Sistemas',
    area: 'Tecnología',
    hasNonCompeteClause: false,
    hasConfidentialityClause: true,
    extensions: [],
    status: 'active',
    createdAt: new Date('2022-03-15'),
    updatedAt: new Date('2022-03-15'),
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: 'Carlos Rodríguez Mejía',
    contractType: 'fixed',
    startDate: new Date('2023-06-01'),
    originalEndDate: new Date('2023-12-01'),
    currentEndDate: new Date('2024-02-15'),
    salary: 3800000,
    salaryType: 'monthly',
    transportAllowance: true,
    operationCenter: 'Medellín Norte',
    position: 'Contador Senior',
    area: 'Finanzas',
    hasNonCompeteClause: false,
    hasConfidentialityClause: true,
    extensions: [
      {
        id: 'ext-1',
        extensionNumber: 1,
        startDate: new Date('2023-12-01'),
        endDate: new Date('2024-02-15'),
        createdAt: new Date('2023-11-25'),
        notes: 'Primera prórroga por evaluación de desempeño',
      },
    ],
    status: 'expiring',
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-11-25'),
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: 'Ana Martínez Suárez',
    contractType: 'fixed',
    startDate: new Date('2023-01-10'),
    originalEndDate: new Date('2023-07-10'),
    currentEndDate: new Date('2024-07-10'),
    salary: 5200000,
    salaryType: 'monthly',
    transportAllowance: false,
    operationCenter: 'Bogotá Centro',
    position: 'Coordinadora RRHH',
    area: 'Recursos Humanos',
    hasNonCompeteClause: true,
    hasConfidentialityClause: true,
    extensions: [
      {
        id: 'ext-2',
        extensionNumber: 1,
        startDate: new Date('2023-07-10'),
        endDate: new Date('2024-01-10'),
        createdAt: new Date('2023-07-05'),
        notes: 'Prórroga por proyecto de reestructuración',
      },
      {
        id: 'ext-3',
        extensionNumber: 2,
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-07-10'),
        createdAt: new Date('2024-01-05'),
        notes: 'Segunda prórroga - continuidad del proyecto',
      },
    ],
    status: 'active',
    createdAt: new Date('2023-01-10'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: 'Pedro López Hernández',
    contractType: 'work_labor',
    startDate: new Date('2023-06-20'),
    originalEndDate: new Date('2024-01-20'),
    currentEndDate: new Date('2024-01-20'),
    salary: 2800000,
    salaryType: 'monthly',
    transportAllowance: true,
    operationCenter: 'Cali Sur',
    position: 'Operador de Planta',
    area: 'Operaciones',
    hasNonCompeteClause: false,
    hasConfidentialityClause: false,
    extensions: [],
    status: 'expired',
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2023-06-20'),
  },
  {
    id: '5',
    employeeId: '5',
    employeeName: 'Laura Sánchez Torres',
    contractType: 'indefinite',
    startDate: new Date('2022-11-05'),
    originalEndDate: null,
    currentEndDate: null,
    salary: 6000000,
    salaryType: 'integral',
    transportAllowance: false,
    operationCenter: 'Bogotá Centro',
    position: 'Diseñadora UX Senior',
    area: 'Tecnología',
    hasNonCompeteClause: true,
    hasConfidentialityClause: true,
    extensions: [],
    status: 'active',
    createdAt: new Date('2022-11-05'),
    updatedAt: new Date('2022-11-05'),
  },
];

const statusConfig = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-muted text-muted-foreground border-border', icon: FileText },
};

export default function Contratos() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Filter contracts
  const filteredContracts = mockContracts.filter((contract) => {
    const matchesSearch = contract.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          contract.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || contract.contractType === typeFilter;
    const status = getContractStatus(contract);
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: mockContracts.length,
    active: mockContracts.filter(c => getContractStatus(c) === 'active').length,
    expiring: mockContracts.filter(c => getContractStatus(c) === 'expiring').length,
    expired: mockContracts.filter(c => getContractStatus(c) === 'expired').length,
    withExtensions: mockContracts.filter(c => c.extensions.length > 0).length,
  };

  const handleContractClick = (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailOpen(true);
  };

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
          <h1 className="font-display text-2xl font-bold text-foreground">Contratos</h1>
          <p className="text-muted-foreground mt-1">Administra contratos y prórrogas de empleados</p>
        </div>
        <Button 
          onClick={() => setIsFormOpen(true)}
          className="gradient-primary text-primary-foreground hover:opacity-90 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Contrato
        </Button>
      </motion.div>

      {/* Contract Form Dialog */}
      <ContractFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {/* Contract Detail Dialog */}
      <ContractDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        contract={selectedContract}
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Contratos activos</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.expiring}</p>
            <p className="text-sm text-muted-foreground">Por vencer (30 días)</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-destructive-light flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.expired}</p>
            <p className="text-sm text-muted-foreground">Vencidos</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.withExtensions}</p>
            <p className="text-sm text-muted-foreground">Con prórrogas</p>
          </div>
        </motion.div>
      </div>

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
              placeholder="Buscar por empleado o cargo..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <div className="flex gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="indefinite">Indefinido</SelectItem>
                <SelectItem value="fixed">Término Fijo</SelectItem>
                <SelectItem value="work_labor">Obra Labor</SelectItem>
                <SelectItem value="apprenticeship">Aprendizaje</SelectItem>
                <SelectItem value="services">Servicios</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Vigentes</SelectItem>
                <SelectItem value="expiring">Por vencer</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Contracts Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="card-elevated overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Empleado</th>
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Tipo</th>
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Fecha Inicio</th>
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Vigencia Actual</th>
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Salario</th>
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Prórrogas</th>
                <th className="text-left p-4 font-medium text-muted-foreground text-sm">Estado</th>
                <th className="text-right p-4 font-medium text-muted-foreground text-sm"></th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract, index) => {
                const status = getContractStatus(contract);
                const daysRemaining = calculateDaysRemaining(contract.currentEndDate);
                const StatusIcon = statusConfig[status].icon;
                
                return (
                  <motion.tr
                    key={contract.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={() => handleContractClick(contract)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{contract.employeeName}</span>
                          <p className="text-xs text-muted-foreground">{contract.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{contractTypeLabels[contract.contractType]}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {contract.startDate.toLocaleDateString('es-CO')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {contract.currentEndDate
                          ? contract.currentEndDate.toLocaleDateString('es-CO')
                          : 'Sin fecha fin'}
                      </span>
                      {contract.extensions.length > 0 && (
                        <p className="text-xs text-accent">Extendido</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-foreground">{formatCurrency(contract.salary)}</span>
                    </td>
                    <td className="p-4">
                      {contract.extensions.length > 0 ? (
                        <Badge variant="outline" className="bg-accent-light text-accent border-accent/20">
                          {contract.extensions.length} prórroga{contract.extensions.length > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={cn("gap-1", statusConfig[status].class)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[status].label}
                        {daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 30 && (
                          <span className="ml-1">({daysRemaining}d)</span>
                        )}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors inline-block" />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
