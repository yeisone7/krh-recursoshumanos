import { motion } from 'framer-motion';
import { 
  User, 
  CreditCard, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  Heart,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmployeeV2WithRelations, 
  genderLabels, 
  maritalStatusLabels, 
  bloodTypeLabels,
  documentTypeLabels,
  familyRelationshipLabels,
} from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Tab360ProfileProps {
  employee: EmployeeV2WithRelations;
}

function InfoRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="text-muted-foreground shrink-0 mt-0.5">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground truncate">
          {value || <span className="text-muted-foreground italic">No registrado</span>}
        </p>
      </div>
    </div>
  );
}

export function Tab360Profile({ employee }: Tab360ProfileProps) {
  const birthDate = employee.birth_date 
    ? format(new Date(employee.birth_date), "d 'de' MMMM, yyyy", { locale: es })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {/* Identification */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Identificación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow 
            label="Tipo de Documento" 
            value={documentTypeLabels[employee.document_type] || employee.document_type} 
          />
          <InfoRow label="Número de Documento" value={employee.document_number} />
          <InfoRow label="Lugar de Expedición" value={employee.document_issue_city} />
          <InfoRow 
            label="Fecha de Expedición" 
            value={employee.document_issue_date 
              ? format(new Date(employee.document_issue_date), "d MMM yyyy", { locale: es })
              : null
            } 
          />
        </CardContent>
      </Card>

      {/* Personal Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Fecha de Nacimiento" value={birthDate} />
          <InfoRow 
            label="Lugar de Nacimiento" 
            value={[employee.birth_city, employee.birth_department, employee.birth_country]
              .filter(Boolean).join(', ') || null} 
          />
          <InfoRow 
            label="Género" 
            value={employee.gender ? genderLabels[employee.gender] : null} 
          />
          <InfoRow 
            label="Estado Civil" 
            value={employee.marital_status ? maritalStatusLabels[employee.marital_status] : null} 
          />
          <InfoRow 
            label="Tipo de Sangre" 
            value={employee.blood_type ? bloodTypeLabels[employee.blood_type] : null} 
          />
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow 
            label="Correo Corporativo" 
            value={employee.contact?.email}
            icon={<Mail className="w-4 h-4" />}
          />
          <InfoRow 
            label="Correo Personal" 
            value={employee.contact?.personal_email}
            icon={<Mail className="w-4 h-4" />}
          />
          <InfoRow 
            label="Celular" 
            value={employee.contact?.mobile}
            icon={<Phone className="w-4 h-4" />}
          />
          <InfoRow 
            label="Teléfono Fijo" 
            value={employee.contact?.phone}
            icon={<Phone className="w-4 h-4" />}
          />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Residencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Dirección" value={employee.contact?.residence_address} />
          <InfoRow label="Barrio, Vereda u otro." value={employee.contact?.residence_neighborhood} />
          <InfoRow 
            label="Ciudad" 
            value={[employee.contact?.residence_city, employee.contact?.residence_department]
              .filter(Boolean).join(', ') || null} 
          />
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            Contacto de Emergencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Nombre" value={employee.contact?.emergency_contact_name} />
          <InfoRow label="Teléfono" value={employee.contact?.emergency_contact_phone} />
          <InfoRow label="Parentesco" value={employee.contact?.emergency_contact_relationship} />
        </CardContent>
      </Card>

      {/* Family */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Núcleo Familiar (Personas a cargo)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {employee.family_members && employee.family_members.length > 0 ? (
            employee.family_members.map((member) => (
              <div key={member.id} className="border rounded-lg p-3 space-y-1 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {familyRelationshipLabels[member.relationship] || member.relationship}
                  </Badge>
                  {member.age != null && (
                    <span className="text-xs text-muted-foreground">{member.age} años</span>
                  )}
                </div>
                <InfoRow label="Nombre" value={member.full_name} />
                {member.gender && <InfoRow label="Sexo biológico" value={genderLabels[member.gender as keyof typeof genderLabels] || member.gender} />}
                {member.observations && <InfoRow label="Observaciones" value={member.observations} />}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">No hay familiares registrados</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
