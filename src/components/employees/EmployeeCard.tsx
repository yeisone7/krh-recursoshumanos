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
  CreditCard,
  Building,
  Link2,
  Droplets,
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
import { getEmployeeFullName, documentTypeLabels, linkTypeLabels } from '@/types/employee';

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
  onRehire,
}: EmployeeCardProps) {
  const navigate = useNavigate();

  const isNew = employee.created_at && (Date.now() - new Date(employee.created_at).getTime()) < 10 * 24 * 60 * 60 * 1000;
  const isRetired = employee.status === 'retired' || employee.status === 'en_retiro';
  const isEnRetiro = employee.status === 'en_retiro';

  return (
    <motion.div
      key={employee.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="card-elevated p-5 group cursor-pointer hover:border-primary/30"
      onClick={() => onOpenDetail(employee.id)}
    >
      {/* Header: Avatar + Name + Actions */}
      <div className="flex items-start justify-between mb-3">
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
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {getEmployeeFullName(employee)}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{employee.work_info?.position_name || 'Sin cargo'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
              {!isRetired && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(employee); }}>
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewContract(employee.id); }}>
                Ver contrato
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDocuments(employee.id); }}>
                Documentos
              </DropdownMenuItem>
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

      {/* Document Number */}
      {employee.document_number && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1">
          <CreditCard className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {documentTypeLabels[employee.document_type as keyof typeof documentTypeLabels] || employee.document_type}: {employee.document_number}
          </span>
        </div>
      )}

      {/* Info Grid */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-secondary-light flex items-center justify-center shrink-0">
            <Briefcase className="w-3.5 h-3.5 text-secondary" />
          </div>
          <span className="text-foreground truncate">{employee.areas?.name || 'Sin área'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-tertiary-light flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-tertiary" />
          </div>
          <span className="text-foreground truncate">{employee.operation_centers?.name || 'Sin centro asignado'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-violet-light flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-violet" />
          </div>
          <span className="text-foreground">
            {employee.work_info?.hire_date 
              ? `Desde ${new Date(employee.work_info.hire_date).toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}`
              : 'Sin fecha de ingreso'}
          </span>
        </div>
        {employee.work_info?.link_type && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-primary-light flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-foreground">
              {linkTypeLabels[employee.work_info.link_type as keyof typeof linkTypeLabels] || employee.work_info.link_type}
            </span>
          </div>
        )}
      </div>

      {/* Contact Info */}
      {(employee.contact?.email || employee.contact?.mobile || employee.contact?.phone) && (
        <div className="space-y-1 mb-3 px-1">
          {employee.contact?.email && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5 shrink-0 text-indigo" />
              <span className="truncate">{employee.contact.email}</span>
            </div>
          )}
          {(employee.contact?.mobile || employee.contact?.phone) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3.5 h-3.5 shrink-0 text-teal" />
              <span className="truncate">{employee.contact.mobile || employee.contact.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer: Badges */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn(
            "text-[11px]",
            isRetired
              ? isEnRetiro
                ? 'bg-warning-light text-warning border-warning/20'
                : 'bg-muted text-muted-foreground border-muted-foreground/20'
              : employee.is_active 
                ? 'bg-success-light text-success border-success/20'
                : 'bg-rose-light text-rose border-rose/20'
          )}>
            {isEnRetiro ? '⏳ En Retiro' : isRetired ? '🚪 Retirado' : employee.is_active ? 'Activo' : 'Inactivo'}
          </Badge>
          {isNew && (
            <Badge variant="outline" className="bg-warning-light text-warning border-warning/20 gap-1 text-[11px]">
              ✨ Nuevo
            </Badge>
          )}
          {hasProfesiograma && (
            <Badge variant="outline" className="bg-primary-light text-primary border-primary/20 gap-1 text-[11px]">
              <ClipboardList className="w-3 h-3" />
              Dotación
            </Badge>
          )}
          {employee.blood_type && (
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[11px]">
              <Droplets className="w-3 h-3" />
              {employee.blood_type}
            </Badge>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </div>
    </motion.div>
  );
}
