import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Edit, 
  FileText, 
  Mail, 
  Phone, 
  MapPin,
  Briefcase,
  Calendar,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmployeeFormDialog } from '@/components/employees/EmployeeFormDialog';
import { EmployeeV2WithRelations, getEmployeeFullName, linkTypeLabels } from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Employee360HeaderProps {
  employee: EmployeeV2WithRelations;
}

export function Employee360Header({ employee }: Employee360HeaderProps) {
  const navigate = useNavigate();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fullName = getEmployeeFullName(employee);
  const initials = `${employee.first_name[0]}${employee.last_name[0]}`;
  const hireDate = employee.work_info?.hire_date 
    ? format(new Date(employee.work_info.hire_date), "d 'de' MMMM, yyyy", { locale: es })
    : null;

  // Access operation_centers from the composite type
  const operationCenter = employee.operation_centers;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-4 sm:p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Left section: Back button + Avatar + Info */}
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/empleados')}
              className="shrink-0 self-start sm:-ml-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <Avatar className="h-28 w-28 shrink-0 self-center sm:h-20 sm:w-20 sm:self-start">
              <AvatarImage src={employee.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 space-y-3 sm:space-y-2">
              <div className="space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
                <h1 className="break-words text-2xl font-display font-bold text-foreground sm:text-2xl">
                  {fullName}
                </h1>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'hidden sm:inline-flex',
                    employee.is_active 
                      ? 'bg-success-light text-success border-success/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
                <p className="min-w-0 break-words text-lg text-muted-foreground sm:text-lg">
                  {employee.work_info?.position_name || 'Sin cargo asignado'}
                </p>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'shrink-0 sm:hidden',
                    employee.is_active 
                      ? 'bg-success-light text-success border-success/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {employee.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {operationCenter?.name && (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span className="break-words">{operationCenter.name}</span>
                  </div>
                )}
                {employee.areas?.name && (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Briefcase className="w-4 h-4 shrink-0" />
                    <span className="break-words">{employee.areas.name}</span>
                  </div>
                )}
                {hireDate && (
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>Desde {hireDate}</span>
                  </div>
                )}
                {employee.work_info?.link_type && (
                  <Badge variant="secondary" className="text-xs">
                    {linkTypeLabels[employee.work_info.link_type] || employee.work_info.link_type}
                  </Badge>
                )}
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap items-center gap-4 text-sm pt-1">
                {employee.contact?.email && (
                  <a 
                    href={`mailto:${employee.contact.email}`}
                    className="flex min-w-0 items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="break-all">{employee.contact.email}</span>
                  </a>
                )}
                {employee.contact?.mobile && (
                  <a 
                    href={`tel:${employee.contact.mobile}`}
                    className="flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="w-4 h-4 shrink-0" />
                    <span>{employee.contact.mobile}</span>
                  </a>
                )}
                {employee.contact?.residence_city && (
                  <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span>{employee.contact.residence_city}, {employee.contact.residence_department}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center lg:shrink-0">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setIsEditOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button 
              className="w-full sm:w-auto"
              variant="outline" 
              onClick={() => navigate(`/empleados/${employee.id}/360?tab=documents`)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documentos
            </Button>
          </div>
        </div>
      </motion.div>

      <EmployeeFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        employee={employee}
      />
    </>
  );
}
