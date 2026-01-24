import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase, 
  Building, 
  Heart,
  FileText,
  Stethoscope,
  Package,
  AlertCircle,
  CheckCircle,
  Loader2,
  Pencil
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useEmployee } from '@/hooks/useEmployees';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import type { Database } from '@/integrations/supabase/types';

type EmployeeStatus = Database['public']['Enums']['employee_status'];

const statusConfig: Record<EmployeeStatus, { label: string; class: string }> = {
  active: { label: 'Activo', class: 'bg-success-light text-success border-success/20' },
  suspended: { label: 'Suspendido', class: 'bg-warning-light text-warning-foreground border-warning/20' },
  en_retiro: { label: 'En Retiro', class: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  retired: { label: 'Retirado', class: 'bg-muted text-muted-foreground border-border' },
};

const documentTypeLabels: Record<string, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  TI: 'Tarjeta de Identidad',
  PA: 'Pasaporte',
  PEP: 'PEP',
};

const contractTypeLabels: Record<string, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término Fijo',
  obra_labor: 'Obra o Labor',
  aprendizaje: 'Aprendizaje',
  servicios: 'Prestación de Servicios',
};

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

export function EmployeeDetailDialog({ open, onOpenChange, employeeId }: EmployeeDetailDialogProps) {
  const { data: employee, isLoading } = useEmployee(employeeId || undefined);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (!employeeId) return null;

  const activeContract = employee?.contracts?.find(c => !c.is_terminated);

  const handleEditSuccess = () => {
    setIsEditOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Ficha del Empleado
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !employee ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No se encontró el empleado</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header with Avatar and Status */}
            <div className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-semibold text-primary">
                  {employee.first_name[0]}{employee.last_name[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-semibold text-foreground">
                    {employee.first_name} {employee.last_name}
                  </h2>
                  <Badge variant="outline" className={cn(statusConfig[employee.status].class)}>
                    {statusConfig[employee.status].label}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{employee.position}</p>
                {employee.operation_centers && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="w-3.5 h-3.5" />
                    {employee.operation_centers.name}
                    {employee.operation_centers.city && ` - ${employee.operation_centers.city}`}
                  </p>
                )}
              </div>
            </div>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal" className="text-xs sm:text-sm">
                  <User className="w-4 h-4 mr-1 hidden sm:inline" />
                  Personal
                </TabsTrigger>
                <TabsTrigger value="labor" className="text-xs sm:text-sm">
                  <Briefcase className="w-4 h-4 mr-1 hidden sm:inline" />
                  Laboral
                </TabsTrigger>
                <TabsTrigger value="health" className="text-xs sm:text-sm">
                  <Stethoscope className="w-4 h-4 mr-1 hidden sm:inline" />
                  Salud
                </TabsTrigger>
                <TabsTrigger value="dotation" className="text-xs sm:text-sm">
                  <Package className="w-4 h-4 mr-1 hidden sm:inline" />
                  Dotación
                </TabsTrigger>
              </TabsList>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Info */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documento
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Tipo:</span>
                        <span className="font-medium text-sm">{documentTypeLabels[employee.document_type] || employee.document_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Número:</span>
                        <span className="font-medium text-sm">{employee.document_number}</span>
                      </div>
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Información Personal
                    </h3>
                    <div className="space-y-2">
                      {employee.birth_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Nacimiento:</span>
                          <span className="font-medium text-sm">{format(new Date(employee.birth_date), 'PPP', { locale: es })}</span>
                        </div>
                      )}
                      {employee.gender && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Género:</span>
                          <span className="font-medium text-sm">{employee.gender === 'M' ? 'Masculino' : employee.gender === 'F' ? 'Femenino' : 'Otro'}</span>
                        </div>
                      )}
                      {employee.blood_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Tipo de sangre:</span>
                          <span className="font-medium text-sm">{employee.blood_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Contacto
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{employee.email}</span>
                      </div>
                    )}
                    {employee.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{employee.phone}</span>
                      </div>
                    )}
                    {employee.mobile && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{employee.mobile} (Móvil)</span>
                      </div>
                    )}
                    {employee.address && (
                      <div className="flex items-center gap-2 md:col-span-2">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">
                          {employee.address}
                          {employee.city && `, ${employee.city}`}
                          {employee.department && ` - ${employee.department}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                {employee.emergency_contact_name && (
                  <div className="bg-warning-light/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-warning-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Contacto de Emergencia
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Nombre:</span>
                        <span className="font-medium text-sm">{employee.emergency_contact_name}</span>
                      </div>
                      {employee.emergency_contact_relationship && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Relación:</span>
                          <span className="font-medium text-sm">{employee.emergency_contact_relationship}</span>
                        </div>
                      )}
                      {employee.emergency_contact_phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Teléfono:</span>
                          <span className="font-medium text-sm">{employee.emergency_contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Labor Tab */}
              <TabsContent value="labor" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Employment Info */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Datos Laborales
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Cargo:</span>
                        <span className="font-medium text-sm">{employee.position}</span>
                      </div>
                      {employee.department_area && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Área:</span>
                          <span className="font-medium text-sm">{employee.department_area}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Ingreso:</span>
                        <span className="font-medium text-sm">{format(new Date(employee.hire_date), 'PPP', { locale: es })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Tipo contrato:</span>
                        <span className="font-medium text-sm">{contractTypeLabels[employee.contract_type] || employee.contract_type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Contract */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Contrato Actual
                    </h3>
                    {activeContract ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-success" />
                          <span className="text-sm text-success">Contrato vigente</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Inicio:</span>
                          <span className="font-medium text-sm">{format(new Date(activeContract.start_date), 'PP', { locale: es })}</span>
                        </div>
                        {activeContract.end_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Fin:</span>
                            <span className="font-medium text-sm">{format(new Date(activeContract.end_date), 'PP', { locale: es })}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin contrato activo</p>
                    )}
                  </div>
                </div>

                {/* Social Security */}
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Seguridad Social
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {employee.eps && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">EPS:</span>
                        <span className="font-medium text-sm">{employee.eps}</span>
                      </div>
                    )}
                    {employee.afp && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">AFP:</span>
                        <span className="font-medium text-sm">{employee.afp}</span>
                      </div>
                    )}
                    {employee.arl && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">ARL:</span>
                        <span className="font-medium text-sm">{employee.arl}</span>
                      </div>
                    )}
                    {employee.caja_compensacion && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Caja:</span>
                        <span className="font-medium text-sm">{employee.caja_compensacion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Health Tab */}
              <TabsContent value="health" className="space-y-4 mt-4">
                {employee.medical_exams && employee.medical_exams.length > 0 ? (
                  <div className="space-y-3">
                    {employee.medical_exams.slice(0, 5).map((exam: any) => (
                      <div key={exam.id} className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{exam.exam_type}</span>
                          <Badge variant={exam.result === 'apto' ? 'default' : 'secondary'} className="text-xs">
                            {exam.result}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(exam.exam_date), 'PP', { locale: es })}
                          </span>
                          {exam.expiration_date && (
                            <span className="flex items-center gap-1">
                              Vence: {format(new Date(exam.expiration_date), 'PP', { locale: es })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Stethoscope className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No hay exámenes médicos registrados</p>
                  </div>
                )}
              </TabsContent>

              {/* Dotation Tab */}
              <TabsContent value="dotation" className="space-y-4 mt-4">
                {employee.dotation_deliveries && employee.dotation_deliveries.length > 0 ? (
                  <div className="space-y-3">
                    {employee.dotation_deliveries.slice(0, 5).map((delivery: any) => {
                      const isExpired = new Date(delivery.expiration_date) < new Date();
                      return (
                        <div key={delivery.id} className={cn(
                          "p-4 rounded-lg",
                          isExpired ? "bg-destructive-light" : "bg-muted/50"
                        )}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{delivery.item_name}</span>
                            <Badge variant={isExpired ? 'destructive' : 'outline'} className="text-xs">
                              {isExpired ? 'Vencido' : 'Vigente'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Cantidad: {delivery.quantity}</span>
                            {delivery.size && <span>Talla: {delivery.size}</span>}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(delivery.delivery_date), 'PP', { locale: es })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No hay entregas de dotación registradas</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button onClick={() => setIsEditOpen(true)} className="gap-2">
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
            </div>

            {/* Edit Form Dialog */}
            <EmployeeFormDialog
              open={isEditOpen}
              onOpenChange={setIsEditOpen}
              employee={employee}
              onSuccess={handleEditSuccess}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}