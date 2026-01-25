import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, MapPin, Phone, Mail, Heart, Building2, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EmployeeV2WithRelations } from '@/types/employee';
import { 
  genderLabels, 
  maritalStatusLabels, 
  bloodTypeLabels, 
  documentTypeLabels,
  getEmployeeFullName 
} from '@/types/employee';

interface PortalPersonalInfoProps {
  employee: EmployeeV2WithRelations;
}

export function PortalPersonalInfo({ employee }: PortalPersonalInfoProps) {
  const fullName = getEmployeeFullName(employee);
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={employee.avatar_url || undefined} alt={fullName} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <p className="text-muted-foreground">
                {employee.work_info?.position_name || 'Sin cargo asignado'}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                {employee.is_active ? (
                  <Badge variant="default" className="bg-green-500">Activo</Badge>
                ) : (
                  <Badge variant="secondary">Inactivo</Badge>
                )}
                {employee.operation_centers?.name && (
                  <Badge variant="outline">
                    <Building2 className="h-3 w-3 mr-1" />
                    {employee.operation_centers.name}
                  </Badge>
                )}
                {employee.areas?.name && (
                  <Badge variant="outline">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {employee.areas.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Identificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow 
              label="Tipo de Documento" 
              value={employee.document_type ? documentTypeLabels[employee.document_type] : '-'} 
            />
            <InfoRow label="Número de Documento" value={employee.document_number} />
            <InfoRow 
              label="Fecha de Nacimiento" 
              value={employee.birth_date ? format(new Date(employee.birth_date), 'PPP', { locale: es }) : '-'} 
            />
            <InfoRow 
              label="Género" 
              value={employee.gender ? genderLabels[employee.gender] : '-'} 
            />
            <InfoRow 
              label="Estado Civil" 
              value={employee.marital_status ? maritalStatusLabels[employee.marital_status] : '-'} 
            />
            <InfoRow 
              label="Tipo de Sangre" 
              value={employee.blood_type ? bloodTypeLabels[employee.blood_type] : '-'} 
            />
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Celular" value={employee.contact?.mobile} />
            <InfoRow label="Teléfono Fijo" value={employee.contact?.phone} />
            <InfoRow label="Correo Corporativo" value={employee.contact?.email} />
            <InfoRow label="Correo Personal" value={employee.contact?.personal_email} />
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Departamento" value={employee.contact?.residence_department} />
            <InfoRow label="Ciudad" value={employee.contact?.residence_city} />
            <InfoRow label="Dirección" value={employee.contact?.residence_address} />
            <InfoRow label="Barrio" value={employee.contact?.residence_neighborhood} />
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Contacto de Emergencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nombre" value={employee.contact?.emergency_contact_name} />
            <InfoRow label="Teléfono" value={employee.contact?.emergency_contact_phone} />
            <InfoRow label="Parentesco" value={employee.contact?.emergency_contact_relationship} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || '-'}</span>
    </div>
  );
}
