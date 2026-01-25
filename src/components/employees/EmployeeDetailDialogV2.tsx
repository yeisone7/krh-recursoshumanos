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
  Pencil,
  CreditCard,
  Shield,
  Clock,
  Syringe,
  Award,
  Users as UsersIcon
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
import { useEmployeeV2 } from '@/hooks/useEmployeesV2';
import { EmployeeFormDialogV2 } from './EmployeeFormDialogV2';
import {
  documentTypeLabels,
  genderLabels,
  maritalStatusLabels,
  linkTypeLabels,
  riskLevelLabels,
  accountTypeLabels,
  payrollTypeLabels,
  certificationTypeLabels,
  vaccineTypeLabels,
  getEmployeeFullName,
} from '@/types/employeeV2';

interface EmployeeDetailDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
}

export function EmployeeDetailDialogV2({ open, onOpenChange, employeeId }: EmployeeDetailDialogV2Props) {
  const { data: employee, isLoading } = useEmployeeV2(employeeId || undefined);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (!employeeId) return null;

  const handleEditSuccess = () => {
    setIsEditOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    {getEmployeeFullName(employee)}
                  </h2>
                  <Badge variant="outline" className={cn(
                    employee.is_active 
                      ? 'bg-success-light text-success border-success/20'
                      : 'bg-muted text-muted-foreground border-border'
                  )}>
                    {employee.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">{employee.work_info?.position_name}</p>
                {employee.operation_centers && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Building className="w-3.5 h-3.5" />
                    {employee.operation_centers.name}
                    {employee.operation_centers.city && ` - ${employee.operation_centers.city}`}
                  </p>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={() => setIsEditOpen(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>

            <Tabs defaultValue="identity" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="identity" className="text-xs sm:text-sm">
                  <User className="w-4 h-4 mr-1 hidden sm:inline" />
                  Identidad
                </TabsTrigger>
                <TabsTrigger value="labor" className="text-xs sm:text-sm">
                  <Briefcase className="w-4 h-4 mr-1 hidden sm:inline" />
                  Laboral
                </TabsTrigger>
                <TabsTrigger value="security" className="text-xs sm:text-sm">
                  <Shield className="w-4 h-4 mr-1 hidden sm:inline" />
                  SS & Banco
                </TabsTrigger>
                <TabsTrigger value="health" className="text-xs sm:text-sm">
                  <Stethoscope className="w-4 h-4 mr-1 hidden sm:inline" />
                  Salud
                </TabsTrigger>
                <TabsTrigger value="family" className="text-xs sm:text-sm">
                  <Heart className="w-4 h-4 mr-1 hidden sm:inline" />
                  Familia
                </TabsTrigger>
              </TabsList>

              {/* IDENTITY TAB */}
              <TabsContent value="identity" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Document Info */}
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Documento de Identidad
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
                      {employee.document_issue_city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Expedido en:</span>
                          <span className="font-medium text-sm">{employee.document_issue_city}</span>
                        </div>
                      )}
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
                      {employee.birth_city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Lugar:</span>
                          <span className="font-medium text-sm">{employee.birth_city}{employee.birth_department && `, ${employee.birth_department}`}</span>
                        </div>
                      )}
                      {employee.gender && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Género:</span>
                          <span className="font-medium text-sm">{genderLabels[employee.gender]}</span>
                        </div>
                      )}
                      {employee.blood_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Tipo de sangre:</span>
                          <span className="font-medium text-sm">{employee.blood_type}</span>
                        </div>
                      )}
                      {employee.marital_status && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Estado civil:</span>
                          <span className="font-medium text-sm">{maritalStatusLabels[employee.marital_status]}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                {employee.contact && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Contacto
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {employee.contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{employee.contact.email}</span>
                        </div>
                      )}
                      {employee.contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{employee.contact.phone}</span>
                        </div>
                      )}
                      {employee.contact.mobile && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{employee.contact.mobile} (Móvil)</span>
                        </div>
                      )}
                      {employee.contact.residence_address && (
                        <div className="flex items-center gap-2 md:col-span-2">
                          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm">
                            {employee.contact.residence_address}
                            {employee.contact.residence_city && `, ${employee.contact.residence_city}`}
                            {employee.contact.residence_department && ` - ${employee.contact.residence_department}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {employee.contact?.emergency_contact_name && (
                  <div className="bg-warning-light/50 p-4 rounded-lg space-y-3">
                    <h3 className="text-sm font-medium text-warning-foreground flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Contacto de Emergencia
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-muted-foreground text-sm block">Nombre:</span>
                        <span className="font-medium text-sm">{employee.contact.emergency_contact_name}</span>
                      </div>
                      {employee.contact.emergency_contact_relationship && (
                        <div>
                          <span className="text-muted-foreground text-sm block">Relación:</span>
                          <span className="font-medium text-sm">{employee.contact.emergency_contact_relationship}</span>
                        </div>
                      )}
                      {employee.contact.emergency_contact_phone && (
                        <div>
                          <span className="text-muted-foreground text-sm block">Teléfono:</span>
                          <span className="font-medium text-sm">{employee.contact.emergency_contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* LABOR TAB */}
              <TabsContent value="labor" className="space-y-4 mt-4">
                {employee.work_info && (
                  <>
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
                            <span className="font-medium text-sm">{employee.work_info.position_name}</span>
                          </div>
                          {employee.areas && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Área:</span>
                              <span className="font-medium text-sm">{employee.areas.name}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Ingreso:</span>
                            <span className="font-medium text-sm">{format(new Date(employee.work_info.hire_date), 'PPP', { locale: es })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Vinculación:</span>
                            <span className="font-medium text-sm">{linkTypeLabels[employee.work_info.link_type]}</span>
                          </div>
                          {employee.work_info.work_city && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Ciudad:</span>
                              <span className="font-medium text-sm">{employee.work_info.work_city}</span>
                            </div>
                          )}
                          {employee.work_info.cost_center && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Centro costos:</span>
                              <span className="font-medium text-sm">{employee.work_info.cost_center}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Schedule */}
                      {employee.schedule && (
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Jornada y Nómina
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Tipo nómina:</span>
                              <span className="font-medium text-sm">{payrollTypeLabels[employee.schedule.payroll_type]}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground text-sm">Horario:</span>
                              <span className="font-medium text-sm">{employee.schedule.is_office_schedule ? 'Oficina' : 'Turnos'}</span>
                            </div>
                            {employee.schedule.rest_day && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground text-sm">Descanso:</span>
                                <span className="font-medium text-sm capitalize">{employee.schedule.rest_day}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {employee.work_info.observations && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">Observaciones</h3>
                        <p className="text-sm">{employee.work_info.observations}</p>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* SECURITY & BANK TAB */}
              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Social Security */}
                  {employee.social_security && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Seguridad Social
                      </h3>
                      <div className="space-y-2">
                        {employee.social_security.risk_level && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Riesgo:</span>
                            <span className="font-medium text-sm">{riskLevelLabels[employee.social_security.risk_level]}</span>
                          </div>
                        )}
                        {employee.social_security.eps && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">EPS:</span>
                            <span className="font-medium text-sm">{employee.social_security.eps}</span>
                          </div>
                        )}
                        {employee.social_security.afp && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">AFP:</span>
                            <span className="font-medium text-sm">{employee.social_security.afp}</span>
                          </div>
                        )}
                        {employee.social_security.arl && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">ARL:</span>
                            <span className="font-medium text-sm">{employee.social_security.arl}</span>
                          </div>
                        )}
                        {employee.social_security.ccf && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Caja:</span>
                            <span className="font-medium text-sm">{employee.social_security.ccf}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bank Info */}
                  {employee.bank_info && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Información Bancaria
                      </h3>
                      <div className="space-y-2">
                        {employee.bank_info.bank_name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Banco:</span>
                            <span className="font-medium text-sm">{employee.bank_info.bank_name}</span>
                          </div>
                        )}
                        {employee.bank_info.account_type && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Tipo:</span>
                            <span className="font-medium text-sm">{accountTypeLabels[employee.bank_info.account_type]}</span>
                          </div>
                        )}
                        {employee.bank_info.account_number && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Cuenta:</span>
                            <span className="font-medium text-sm">{employee.bank_info.account_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2">
                          {employee.bank_info.account_registered ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-warning" />
                          )}
                          <span className="text-sm">
                            {employee.bank_info.account_registered ? 'Cuenta verificada' : 'Cuenta no verificada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* HEALTH TAB - Certifications & Vaccinations */}
              <TabsContent value="health" className="space-y-4 mt-4">
                {/* Certifications */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Certificaciones y Licencias
                  </h3>
                  {employee.certifications && employee.certifications.length > 0 ? (
                    <div className="space-y-2">
                      {employee.certifications.map((cert) => (
                        <div key={cert.id} className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">
                              {certificationTypeLabels[cert.certification_type]}
                              {cert.license_category && ` (${cert.license_category})`}
                            </span>
                            {cert.issue_date && (
                              <span className="text-xs text-muted-foreground block">
                                Emitido: {format(new Date(cert.issue_date), 'PP', { locale: es })}
                              </span>
                            )}
                          </div>
                          {cert.expiry_date && (
                            <Badge variant={new Date(cert.expiry_date) < new Date() ? 'destructive' : 'outline'}>
                              Vence: {format(new Date(cert.expiry_date), 'PP', { locale: es })}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin certificaciones registradas</p>
                  )}
                </div>

                <Separator />

                {/* Vaccinations */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Syringe className="w-4 h-4" />
                    Historial de Vacunación
                  </h3>
                  {employee.vaccinations && employee.vaccinations.length > 0 ? (
                    <div className="space-y-2">
                      {employee.vaccinations.map((vac) => (
                        <div key={vac.id} className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="font-medium text-sm">
                              {vaccineTypeLabels[vac.vaccine_type]} - Dosis {vac.dose_number}
                            </span>
                            <span className="text-xs text-muted-foreground block">
                              Aplicada: {format(new Date(vac.application_date), 'PP', { locale: es })}
                              {vac.provider && ` • ${vac.provider}`}
                            </span>
                          </div>
                          {vac.next_dose_date && (
                            <Badge variant="outline">
                              Próxima: {format(new Date(vac.next_dose_date), 'PP', { locale: es })}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin vacunas registradas</p>
                  )}
                </div>
              </TabsContent>

              {/* FAMILY TAB */}
              <TabsContent value="family" className="space-y-4 mt-4">
                {employee.family && (
                  <div className="space-y-4">
                    {/* Spouse */}
                    {employee.family.spouse_name && (
                      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Heart className="w-4 h-4" />
                          Cónyuge / Pareja
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <span className="text-muted-foreground text-sm block">Nombre:</span>
                            <span className="font-medium text-sm">{employee.family.spouse_name}</span>
                          </div>
                          {employee.family.spouse_gender && (
                            <div>
                              <span className="text-muted-foreground text-sm block">Género:</span>
                              <span className="font-medium text-sm">{genderLabels[employee.family.spouse_gender]}</span>
                            </div>
                          )}
                          {employee.family.spouse_birth_date && (
                            <div>
                              <span className="text-muted-foreground text-sm block">Nacimiento:</span>
                              <span className="font-medium text-sm">{format(new Date(employee.family.spouse_birth_date), 'PPP', { locale: es })}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground text-sm block">Trabaja:</span>
                            <span className="font-medium text-sm">{employee.family.spouse_works ? 'Sí' : 'No'}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Children */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <UsersIcon className="w-4 h-4" />
                        Hijos
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">{employee.family.children_count || 0}</span>
                        <span className="text-muted-foreground">hijos registrados</span>
                      </div>
                    </div>
                  </div>
                )}

                {!employee.family && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay información familiar registrada</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>

      {/* Edit Dialog */}
      {employee && (
        <EmployeeFormDialogV2
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          employee={employee}
          onSuccess={handleEditSuccess}
        />
      )}
    </Dialog>
  );
}
