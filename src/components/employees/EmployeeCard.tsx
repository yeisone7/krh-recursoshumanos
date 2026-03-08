import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MoreHorizontal,
  ChevronRight,
  MapPin,
  Briefcase,
  Calendar,
  Mail,
  Phone,
  ClipboardList,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getEmployeeFullName } from '@/types/employee';

interface EmployeeCardProps {
  employee: any;
  index: number;
  hasProfesiograma: boolean;
  onOpenDetail: (id: string) => void;
  onEdit: (employee: any) => void;
  onViewContract: (id: string) => void;
  onViewDocuments: (id: string) => void;
  onRehire?: (employee: any) => void;
}

export function EmployeeCard({
  employee,
  index,
  hasProfesiograma,
  onOpenDetail,
  onEdit,
  onViewContract,
  onViewDocuments,
}: EmployeeCardProps) {
  const navigate = useNavigate();

  const isNew = employee.created_at && (Date.now() - new Date(employee.created_at).getTime()) < 10 * 24 * 60 * 60 * 1000;

  return (
    <motion.div
      key={employee.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="card-elevated p-5 group cursor-pointer hover:border-primary/30"
      onClick={() => onOpenDetail(employee.id)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={employee.avatar_url || undefined} alt={getEmployeeFullName(employee)} />
              <AvatarFallback className="bg-primary-light text-primary text-lg font-semibold">
                {employee.first_name[0]}{employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
            {isNew && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-warning text-[8px] font-bold text-warning-foreground items-center justify-center">N</span>
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {getEmployeeFullName(employee)}
            </h3>
            <p className="text-sm text-muted-foreground">{employee.work_info?.position_name || 'Sin cargo'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); navigate(`/empleados/${employee.id}/360`); }}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            360
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetail(employee.id); }}>
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(employee); }}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewContract(employee.id); }}>
                Ver contrato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDocuments(employee.id); }}>
                Documentos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-secondary-light flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-secondary" />
          </div>
          <span className="text-foreground">{employee.areas?.name || 'Sin área'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-tertiary-light flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-tertiary" />
          </div>
          <span className="text-foreground">{employee.operation_centers?.name || 'Sin centro asignado'}</span>
        </div>
        {employee.work_info?.hire_date && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-violet-light flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-violet" />
            </div>
            <span className="text-foreground">Desde {new Date(employee.work_info.hire_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            employee.is_active 
              ? 'bg-success-light text-success border-success/20'
              : 'bg-rose-light text-rose border-rose/20'
          )}>
            {employee.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
          {isNew && (
            <Badge variant="outline" className="bg-warning-light text-warning border-warning/20 gap-1">
              ✨ Nuevo
            </Badge>
          )}
          {hasProfesiograma && (
            <Badge variant="outline" className="bg-primary-light text-primary border-primary/20 gap-1">
              <ClipboardList className="w-3 h-3" />
              Dotación
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {employee.contact?.email && (
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-indigo-light text-indigo hover:bg-indigo/20">
              <Mail className="w-4 h-4" />
            </Button>
          )}
          {employee.contact?.phone && (
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-teal-light text-teal hover:bg-teal/20">
              <Phone className="w-4 h-4" />
            </Button>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}
