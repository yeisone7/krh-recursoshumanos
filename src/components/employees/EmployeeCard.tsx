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
  RotateCcw,
  ArrowRightLeft,
  FileBadge,
  FileText,
  Eye,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmployeeAvatarZoom } from '@/components/employees/EmployeeAvatarZoom';
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
  onViewCv: (id: string) => void;
  onRehire?: (employee: any) => void;
  onTransfer?: (employee: any) => void;
  onIssueCertificate?: (employee: any) => void;
  onToggleActive?: (employee: any) => void;
  onStartTermination?: (employee: any) => void;
}

export function EmployeeCard({
  employee,
  index,
  hasProfesiograma,
  onOpenDetail,
  onEdit,
  onViewContract,
  onViewDocuments,
  onViewCv,
  onRehire,
  onTransfer,
  onIssueCertificate,
  onToggleActive,
  onStartTermination,
}: EmployeeCardProps) {
  const navigate = useNavigate();

  const isNew = employee.created_at && (Date.now() - new Date(employee.created_at).getTime()) < 10 * 24 * 60 * 60 * 1000;
  const isLegacyRetired = !employee.is_active && employee.status === 'active';
  const isRetired = employee.status === 'retired' || employee.status === 'en_retiro' || isLegacyRetired;
  const isFinalRetired = employee.status === 'retired' || isLegacyRetired;
  const isEnRetiro = employee.status === 'en_retiro';
  const isSuspended = employee.status === 'suspended' || (!employee.is_active && !isRetired);
  const employeeName = getEmployeeFullName(employee);
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`;

  return (
    <motion.div
      key={employee.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "card-elevated p-4 group cursor-pointer hover:border-primary/30",
        isFinalRetired && "employee-retired-card"
      )}
      style={isFinalRetired ? { background: '#fff7f7', backgroundColor: '#fff7f7', borderColor: '#fee2e2' } : undefined}
      onClick={() => onOpenDetail(employee.id)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative">
            <EmployeeAvatarZoom
              imageUrl={employee.avatar_url}
              name={employeeName}
              initials={initials}
              avatarClassName="h-10 w-10"
              fallbackClassName="bg-primary-light text-primary text-base font-semibold"
            />
            {isNew && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-warning text-[8px] font-bold text-warning-foreground items-center justify-center">N</span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground group-hover:text-primary transition-colors">
              {employeeName}
            </h3>
            <p className="text-xs text-muted-foreground">{employee.work_info?.position_name || 'Sin cargo'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs font-medium opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); navigate(`/empleados/${employee.id}/360`); }}
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            360
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs font-medium opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); onViewCv(employee.id); }}
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            CV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetail(employee.id); }}>
                Ver perfil
              </DropdownMenuItem>
              {!isRetired && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(employee); }}>
                  Editar
                </DropdownMenuItem>
              )}
              {!isRetired && onToggleActive && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onToggleActive(employee); }}
                  className={isSuspended ? 'text-success font-medium' : 'text-rose font-medium'}
                >
                  {isSuspended ? (
                    <UserCheck className="w-4 h-4 mr-2" />
                  ) : (
                    <UserX className="w-4 h-4 mr-2" />
                  )}
                  {isSuspended ? 'Reactivar empleado' : 'Suspender empleado'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewContract(employee.id); }}>
                Ver contrato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDocuments(employee.id); }}>
                Documentos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewCv(employee.id); }}>
                <FileText className="w-4 h-4 mr-2 text-primary" />
                Ver CV
              </DropdownMenuItem>
              {onStartTermination && (!isRetired || isEnRetiro) && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onStartTermination(employee); }}
                  className="text-destructive font-medium"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  {isEnRetiro ? 'Continuar retiro' : 'Iniciar retiro'}
                </DropdownMenuItem>
              )}
              {onIssueCertificate && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onIssueCertificate(employee); }}>
                  <FileBadge className="w-4 h-4 mr-2 text-primary" />
                  Expedir Certificación
                </DropdownMenuItem>
              )}
              {!isRetired && onTransfer && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onTransfer(employee); }}
                  className="text-primary font-medium"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Trasladar a otra empresa
                </DropdownMenuItem>
              )}
              {isRetired && onRehire && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onRehire(employee); }}
                  className="text-primary font-medium"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recontratar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="w-5 h-5 rounded-md bg-secondary-light flex items-center justify-center">
            <Briefcase className="w-3.5 h-3.5 text-secondary-foreground" />
          </div>
          <span className="text-foreground">{employee.areas?.name || 'Sin área'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-5 h-5 rounded-md bg-tertiary-light flex items-center justify-center">
            <MapPin className="w-3.5 h-3.5 text-tertiary" />
          </div>
          <span className="text-foreground">{employee.operation_centers?.name || 'Sin centro asignado'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-5 h-5 rounded-md bg-violet-light flex items-center justify-center">
            <Calendar className="w-3.5 h-3.5 text-violet" />
          </div>
          <span className="text-foreground">
            {employee.work_info?.hire_date 
              ? `Desde ${new Date(employee.work_info.hire_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}`
              : 'Sin fecha de ingreso'}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn(
            isRetired
              ? isEnRetiro
                ? 'bg-warning-light text-warning border-warning/20'
                : 'bg-red-100 text-red-700 border-red-200'
              : !isSuspended
                ? 'bg-success-light text-success border-success/20'
                : 'bg-rose-light text-rose border-rose/20'
          )}>
            {isEnRetiro ? '⏳ En Retiro' : isRetired ? '🚪 Retirado' : isSuspended ? 'Inactivo' : 'Activo'}
          </Badge>
          {isNew && (
            <Badge variant="outline" className="bg-warning-light text-warning border-warning/20 gap-1">
              ✨ Nuevo
            </Badge>
          )}
          {employee.proceso_exclusivo_pcd && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 gap-1 font-semibold">
              PcD
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
