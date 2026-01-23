import { motion } from 'framer-motion';
import { useState } from 'react';
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
  Phone
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

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
  department: string;
  operationCenter: string;
  contractType: string;
  status: 'active' | 'suspended' | 'retired';
  startDate: string;
  avatar?: string;
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    firstName: 'María',
    lastName: 'García López',
    email: 'maria.garcia@empresa.com',
    phone: '+57 310 123 4567',
    position: 'Analista de Sistemas',
    department: 'Tecnología',
    operationCenter: 'Bogotá Centro',
    contractType: 'Indefinido',
    status: 'active',
    startDate: '2022-03-15',
  },
  {
    id: '2',
    firstName: 'Carlos',
    lastName: 'Rodríguez Mejía',
    email: 'carlos.rodriguez@empresa.com',
    phone: '+57 315 234 5678',
    position: 'Contador Senior',
    department: 'Finanzas',
    operationCenter: 'Medellín Norte',
    contractType: 'Indefinido',
    status: 'active',
    startDate: '2021-08-01',
  },
  {
    id: '3',
    firstName: 'Ana',
    lastName: 'Martínez Suárez',
    email: 'ana.martinez@empresa.com',
    phone: '+57 320 345 6789',
    position: 'Coordinadora RRHH',
    department: 'Recursos Humanos',
    operationCenter: 'Bogotá Centro',
    contractType: 'Fijo',
    status: 'active',
    startDate: '2023-01-10',
  },
  {
    id: '4',
    firstName: 'Pedro',
    lastName: 'López Hernández',
    email: 'pedro.lopez@empresa.com',
    phone: '+57 318 456 7890',
    position: 'Operador de Planta',
    department: 'Operaciones',
    operationCenter: 'Cali Sur',
    contractType: 'Obra Labor',
    status: 'suspended',
    startDate: '2023-06-20',
  },
  {
    id: '5',
    firstName: 'Laura',
    lastName: 'Sánchez Torres',
    email: 'laura.sanchez@empresa.com',
    phone: '+57 312 567 8901',
    position: 'Diseñadora UX',
    department: 'Tecnología',
    operationCenter: 'Bogotá Centro',
    contractType: 'Indefinido',
    status: 'active',
    startDate: '2022-11-05',
  },
];

const statusConfig = {
  active: { label: 'Activo', class: 'bg-success-light text-success border-success/20' },
  suspended: { label: 'Suspendido', class: 'bg-warning-light text-warning-foreground border-warning/20' },
  retired: { label: 'Retirado', class: 'bg-muted text-muted-foreground border-border' },
};

export default function Empleados() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = mockEmployees.filter(
    (emp) =>
      emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Button className="gradient-primary text-primary-foreground hover:opacity-90 gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Empleado
        </Button>
      </motion.div>

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
              placeholder="Buscar por nombre, cargo, departamento..."
              className="w-full h-10 pl-10 pr-4 rounded-lg bg-muted/50 border border-transparent focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-[160px] h-10 text-sm border-border">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="suspended">Suspendidos</SelectItem>
                <SelectItem value="retired">Retirados</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-[180px] h-10 text-sm border-border">
                <SelectValue placeholder="Centro de operación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los centros</SelectItem>
                <SelectItem value="bogota">Bogotá Centro</SelectItem>
                <SelectItem value="medellin">Medellín Norte</SelectItem>
                <SelectItem value="cali">Cali Sur</SelectItem>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-2xl font-display font-bold text-foreground">247</p>
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
            <p className="text-2xl font-display font-bold text-foreground">238</p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
            <Users className="w-5 h-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">6</p>
            <p className="text-sm text-muted-foreground">Suspendidos</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="card-elevated p-4 flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">3</p>
            <p className="text-sm text-muted-foreground">Retirados este mes</p>
          </div>
        </motion.div>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.map((employee, index) => (
          <motion.div
            key={employee.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="card-elevated p-5 group cursor-pointer hover:border-primary/30"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{employee.position}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Ver perfil</DropdownMenuItem>
                  <DropdownMenuItem>Editar</DropdownMenuItem>
                  <DropdownMenuItem>Ver contrato</DropdownMenuItem>
                  <DropdownMenuItem>Documentos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span>{employee.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{employee.operationCenter}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Desde {new Date(employee.startDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Badge variant="outline" className={cn(statusConfig[employee.status].class)}>
                {statusConfig[employee.status].label}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Mail className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <Phone className="w-4 h-4" />
                </Button>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}