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

interface Contract {
  id: string;
  employeeName: string;
  type: 'indefinite' | 'fixed' | 'work_labor' | 'apprenticeship' | 'services';
  startDate: string;
  endDate: string | null;
  currentEndDate: string | null;
  salary: number;
  status: 'active' | 'expiring' | 'expired' | 'terminated';
  extensions: number;
  daysRemaining?: number;
}

const mockContracts: Contract[] = [
  {
    id: '1',
    employeeName: 'María García López',
    type: 'indefinite',
    startDate: '2022-03-15',
    endDate: null,
    currentEndDate: null,
    salary: 4500000,
    status: 'active',
    extensions: 0,
  },
  {
    id: '2',
    employeeName: 'Carlos Rodríguez Mejía',
    type: 'fixed',
    startDate: '2023-06-01',
    endDate: '2024-02-01',
    currentEndDate: '2024-02-01',
    salary: 3800000,
    status: 'expiring',
    extensions: 2,
    daysRemaining: 15,
  },
  {
    id: '3',
    employeeName: 'Ana Martínez Suárez',
    type: 'fixed',
    startDate: '2023-01-10',
    endDate: '2024-01-10',
    currentEndDate: '2024-03-10',
    salary: 5200000,
    status: 'active',
    extensions: 1,
  },
  {
    id: '4',
    employeeName: 'Pedro López Hernández',
    type: 'work_labor',
    startDate: '2023-06-20',
    endDate: '2024-01-20',
    currentEndDate: '2024-01-20',
    salary: 2800000,
    status: 'expired',
    extensions: 0,
    daysRemaining: -5,
  },
  {
    id: '5',
    employeeName: 'Laura Sánchez Torres',
    type: 'indefinite',
    startDate: '2022-11-05',
    endDate: null,
    currentEndDate: null,
    salary: 6000000,
    status: 'active',
    extensions: 0,
  },
];

const typeLabels = {
  indefinite: 'Indefinido',
  fixed: 'Término Fijo',
  work_labor: 'Obra Labor',
  apprenticeship: 'Aprendizaje',
  services: 'Servicios',
};

const statusConfig = {
  active: { label: 'Vigente', class: 'bg-success-light text-success border-success/20', icon: CheckCircle },
  expiring: { label: 'Por vencer', class: 'bg-warning-light text-warning-foreground border-warning/20', icon: Clock },
  expired: { label: 'Vencido', class: 'bg-destructive-light text-destructive border-destructive/20', icon: AlertTriangle },
  terminated: { label: 'Terminado', class: 'bg-muted text-muted-foreground border-border', icon: FileText },
};

export default function Contratos() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
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
        <Button className="gradient-primary text-primary-foreground hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Contrato
        </Button>
      </motion.div>

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
            <p className="text-2xl font-display font-bold text-foreground">247</p>
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
            <p className="text-2xl font-display font-bold text-foreground">8</p>
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
            <p className="text-2xl font-display font-bold text-foreground">2</p>
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
            <p className="text-2xl font-display font-bold text-foreground">45</p>
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
              placeholder="Buscar por empleado o tipo de contrato..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>
          <div className="flex gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="indefinite">Indefinido</SelectItem>
                <SelectItem value="fixed">Término Fijo</SelectItem>
                <SelectItem value="work_labor">Obra Labor</SelectItem>
                <SelectItem value="apprenticeship">Aprendizaje</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
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
              {mockContracts.map((contract, index) => {
                const StatusIcon = statusConfig[contract.status].icon;
                return (
                  <motion.tr
                    key={contract.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{contract.employeeName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{typeLabels[contract.type]}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {new Date(contract.startDate).toLocaleDateString('es-CO')}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">
                        {contract.currentEndDate
                          ? new Date(contract.currentEndDate).toLocaleDateString('es-CO')
                          : 'Sin fecha fin'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-foreground">{formatCurrency(contract.salary)}</span>
                    </td>
                    <td className="p-4">
                      {contract.extensions > 0 ? (
                        <Badge variant="outline" className="bg-accent-light text-accent border-accent/20">
                          {contract.extensions} prórroga{contract.extensions > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={cn("gap-1", statusConfig[contract.status].class)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[contract.status].label}
                        {contract.daysRemaining !== undefined && contract.daysRemaining > 0 && (
                          <span className="ml-1">({contract.daysRemaining}d)</span>
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