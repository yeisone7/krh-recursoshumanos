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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { getEmployeeFullName } from '@/types/employee';

interface EmployeeTableProps {
  employees: any[];
  hasProfesiogramaFn: (emp: any) => boolean;
  onOpenDetail: (id: string) => void;
  onEdit: (employee: any) => void;
  onViewContract: (id: string) => void;
  onViewDocuments: (id: string) => void;
  onRehire?: (employee: any) => void;
  onTransfer?: (employee: any) => void;
}

export function EmployeeTable({
  employees,
  hasProfesiogramaFn,
  onOpenDetail,
  onEdit,
  onViewContract,
  onViewDocuments,
  onRehire,
  onTransfer,
}: EmployeeTableProps) {
  const navigate = useNavigate();

  return (
    <div className="card-elevated overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            <TableHead className="w-[300px]">Empleado</TableHead>
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
            const isRetired = employee.status === 'retired' || employee.status === 'en_retiro' || !employee.is_active;
            const isEnRetiro = employee.status === 'en_retiro';
            const hasProfesiograma = hasProfesiogramaFn(employee);

            return (
              <TableRow 
                key={employee.id} 
                className="group cursor-pointer hover:bg-background"
                onClick={() => onOpenDetail(employee.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={employee.avatar_url || undefined} alt={getEmployeeFullName(employee)} />
                        <AvatarFallback className="bg-primary-light text-primary text-sm font-semibold">
                          {employee.first_name[0]}{employee.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      {isNew && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-warning text-[6px] font-bold text-warning-foreground items-center justify-center">N</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {getEmployeeFullName(employee)}
                      </span>
                      <span className="text-xs text-muted-foreground">C.C: {employee.document_number || 'N/A'}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                      {employee.work_info?.position_name || 'Sin cargo'}
                    </div>
                    <div className="text-xs text-muted-foreground ml-5">
                      {employee.areas?.name || 'Sin área'}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
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
                          : 'bg-background text-muted-foreground border-muted-foreground/20'
                        : employee.is_active 
                          ? 'bg-success-light text-success border-success/20'
                          : 'bg-rose-light text-rose border-rose/20'
                    )}>
                      {isEnRetiro ? 'En Retiro' : isRetired ? 'Retirado' : employee.is_active ? 'Activo' : 'Inactivo'}
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
                      <div className="w-7 h-7 rounded-full bg-indigo-light flex items-center justify-center text-indigo" title={employee.contact.email}>
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {employee.contact?.phone && (
                      <div className="w-7 h-7 rounded-full bg-teal-light flex items-center justify-center text-teal" title={employee.contact.phone}>
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
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={(e) => { e.stopPropagation(); navigate(`/empleados/${employee.id}/360`); }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
