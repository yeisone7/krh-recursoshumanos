import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  Eye,
  RotateCcw,
  ArrowRightLeft,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  FileBadge,
  FileText,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmployeeAvatarZoom } from '@/components/employees/EmployeeAvatarZoom';
import { cn } from '@/lib/utils';
import { getEmployeeFullName } from '@/types/employee';

interface EmployeeTableProps {
  employees: any[];
  hasProfesiogramaFn: (emp: any) => boolean;
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

export function EmployeeTable({
  employees,
  hasProfesiogramaFn,
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
}: EmployeeTableProps) {
  const navigate = useNavigate();

  return (
    <div className="employee-document-table card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50">
            <TableHead className="w-[280px]">Empleado</TableHead>
            <TableHead>Cargo y Área</TableHead>
            <TableHead>Centro de Operación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => {
            const isNew = employee.created_at && (Date.now() - new Date(employee.created_at).getTime()) < 10 * 24 * 60 * 60 * 1000;
            const isLegacyRetired = !employee.is_active && employee.status === 'active';
            const isRetired = employee.status === 'retired' || employee.status === 'en_retiro' || isLegacyRetired;
            const isFinalRetired = employee.status === 'retired' || isLegacyRetired;
            const isEnRetiro = employee.status === 'en_retiro';
            const isSuspended = employee.status === 'suspended' || (!employee.is_active && !isRetired);
            const hasProfesiograma = hasProfesiogramaFn(employee);
            const employeeName = getEmployeeFullName(employee);
            const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`;

            return (
              <TableRow 
                key={employee.id} 
                className={cn(
                  "group cursor-pointer transition-colors",
                  isFinalRetired ? "employee-retired-card" : "hover:bg-slate-50/80"
                )}
                style={isFinalRetired ? { background: '#fff7f7', backgroundColor: '#fff7f7' } : undefined}
                onClick={() => onOpenDetail(employee.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <EmployeeAvatarZoom
                        imageUrl={employee.avatar_url}
                        name={employeeName}
                        initials={initials}
                        avatarClassName="h-8 w-8 border border-border"
                        fallbackClassName="bg-primary-light text-primary text-sm font-semibold"
                      />
                      {isNew && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-warning text-[6px] font-bold text-warning-foreground items-center justify-center">N</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
                        {employeeName}
                      </span>
                      <span className="text-xs text-muted-foreground">C.C: {employee.document_number || 'N/A'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[13px] text-foreground font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                      {employee.work_info?.position_name || 'Sin cargo'}
                    </div>
                    <div className="text-xs text-muted-foreground ml-5">
                      {employee.areas?.name || 'Sin área'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-[13px]">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-foreground">{employee.operation_centers?.name || 'Sin asignar'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={cn(
                      "text-[10px] h-5 px-1.5",
                      isRetired
                        ? isEnRetiro
                          ? 'bg-warning-light text-warning border-warning/20'
                          : 'bg-red-100 text-red-700 border-red-200'
                        : !isSuspended
                          ? 'bg-success-light text-success border-success/20'
                          : 'bg-rose-light text-rose border-rose/20'
                    )}>
                      {isEnRetiro ? 'En Retiro' : isRetired ? 'Retirado' : isSuspended ? 'Inactivo' : 'Activo'}
                    </Badge>
                    {hasProfesiograma && (
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-primary-light text-primary border-primary/20">
                        Dotación
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {employee.contact?.email && (
                       <div className="w-6 h-6 rounded-md bg-indigo-light flex items-center justify-center text-indigo" title={employee.contact.email}>
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {employee.contact?.phone && (
                       <div className="w-6 h-6 rounded-md bg-teal-light flex items-center justify-center text-teal" title={employee.contact.phone}>
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                       className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); onViewCv(employee.id); }}
                      title="Ver CV"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                       className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); navigate(`/empleados/${employee.id}/360`); }}
                      title="Ver 360"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7">
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
                            Trasladar
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
