import { useState } from 'react';
import { addDays } from 'date-fns';
import { Copy, Link2, Check } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useCreateRegistrationToken } from '@/hooks/useRegistrationTokens';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: 'candidate' | 'employee';
  vacancyId?: string;
}

const CANDIDATE_FIELDS = [
  { key: 'firstName', label: 'Nombre', section: 'Personal', required: true },
  { key: 'lastName', label: 'Apellido', section: 'Personal', required: true },
  { key: 'documentType', label: 'Tipo de Documento', section: 'Personal', required: true },
  { key: 'documentNumber', label: 'Número de Documento', section: 'Personal', required: true },
  { key: 'birthDate', label: 'Fecha de Nacimiento', section: 'Personal' },
  { key: 'gender', label: 'Sexo Biológico', section: 'Personal' },
  { key: 'genderIdentity', label: 'Sexo de Identificación', section: 'Personal' },
  { key: 'email', label: 'Email', section: 'Contacto' },
  { key: 'mobile', label: 'Celular', section: 'Contacto' },
  { key: 'phone', label: 'Teléfono Fijo', section: 'Contacto' },
  { key: 'city', label: 'Ciudad', section: 'Contacto' },
  { key: 'department', label: 'Departamento', section: 'Contacto' },
  { key: 'address', label: 'Dirección', section: 'Contacto' },
  { key: 'educationLevel', label: 'Nivel Educativo', section: 'Profesional' },
  { key: 'profession', label: 'Profesión / Título', section: 'Profesional' },
  { key: 'experienceYears', label: 'Años de Experiencia', section: 'Profesional' },
  { key: 'currentCompany', label: 'Empresa Actual', section: 'Profesional' },
  { key: 'currentPosition', label: 'Cargo Actual', section: 'Profesional' },
  { key: 'salaryExpectation', label: 'Expectativa Salarial', section: 'Profesional' },
  { key: 'generalNotes', label: 'Notas', section: 'Profesional' },
];

const EMPLOYEE_FIELDS = [
  // Identidad
  { key: 'firstName', label: 'Primer Nombre', section: 'Identidad', required: true },
  { key: 'middleName', label: 'Segundo Nombre', section: 'Identidad' },
  { key: 'lastName', label: 'Primer Apellido', section: 'Identidad', required: true },
  { key: 'secondLastName', label: 'Segundo Apellido', section: 'Identidad' },
  { key: 'documentType', label: 'Tipo de Documento', section: 'Identidad', required: true },
  { key: 'documentNumber', label: 'Número de Documento', section: 'Identidad', required: true },
  { key: 'birthDate', label: 'Fecha de Nacimiento', section: 'Identidad' },
  { key: 'birthCity', label: 'Ciudad de Nacimiento', section: 'Identidad' },
  { key: 'birthDepartment', label: 'Departamento de Nacimiento', section: 'Identidad' },
  { key: 'birthCountry', label: 'País de Nacimiento', section: 'Identidad' },
  { key: 'gender', label: 'Sexo Biológico', section: 'Identidad' },
  { key: 'genderIdentity', label: 'Sexo de Identificación', section: 'Identidad' },
  { key: 'maritalStatus', label: 'Estado Civil', section: 'Identidad' },
  { key: 'bloodType', label: 'Tipo de Sangre', section: 'Identidad' },
  { key: 'documentIssueDate', label: 'Fecha de Expedición Documento', section: 'Identidad' },
  { key: 'documentIssueCity', label: 'Ciudad de Expedición', section: 'Identidad' },
  // Contacto
  { key: 'email', label: 'Email Corporativo', section: 'Contacto' },
  { key: 'personalEmail', label: 'Email Personal', section: 'Contacto' },
  { key: 'mobile', label: 'Celular', section: 'Contacto' },
  { key: 'phone', label: 'Teléfono Fijo', section: 'Contacto' },
  { key: 'residenceAddress', label: 'Dirección de Residencia', section: 'Contacto' },
  { key: 'residenceCity', label: 'Ciudad de Residencia', section: 'Contacto' },
  { key: 'residenceDepartment', label: 'Departamento de Residencia', section: 'Contacto' },
  { key: 'residenceNeighborhood', label: 'Barrio, Vereda u otro.', section: 'Contacto' },
  { key: 'emergencyContactName', label: 'Nombre Contacto de Emergencia', section: 'Contacto' },
  { key: 'emergencyContactPhone', label: 'Teléfono Contacto de Emergencia', section: 'Contacto' },
  { key: 'emergencyContactRelationship', label: 'Parentesco Contacto de Emergencia', section: 'Contacto' },
  // Familia
  { key: 'spouseName', label: 'Nombre del Cónyuge', section: 'Familia' },
  { key: 'spouseBirthDate', label: 'Fecha Nacimiento Cónyuge', section: 'Familia' },
  { key: 'childrenCount', label: 'Número de Hijos', section: 'Familia' },
  // Seguridad Social
  { key: 'eps', label: 'EPS', section: 'Seguridad Social' },
  { key: 'afp', label: 'Fondo de Pensiones (AFP)', section: 'Seguridad Social' },
  { key: 'arl', label: 'ARL', section: 'Seguridad Social' },
  { key: 'ccf', label: 'Caja de Compensación', section: 'Seguridad Social' },
  { key: 'afc', label: 'AFC', section: 'Seguridad Social' },
  { key: 'ips', label: 'IPS de Atención', section: 'Seguridad Social' },
  { key: 'riskLevel', label: 'Nivel de Riesgo ARL', section: 'Seguridad Social' },
  // Información Bancaria
  { key: 'bankName', label: 'Nombre del Banco', section: 'Información Bancaria' },
  { key: 'accountType', label: 'Tipo de Cuenta', section: 'Información Bancaria' },
  { key: 'accountNumber', label: 'Número de Cuenta', section: 'Información Bancaria' },
  // Especificaciones de la Persona
  { key: 'isFirstJob', label: 'Primer Empleo', section: 'Especificaciones' },
  { key: 'isHeadOfHousehold', label: 'Cabeza de Familia', section: 'Especificaciones' },
  { key: 'disabilityType', label: 'Tipo de Discapacidad', section: 'Especificaciones' },
  { key: 'ethnicGroup', label: 'Grupo Étnico', section: 'Especificaciones' },
  { key: 'isConflictVictim', label: 'Víctima del Conflicto', section: 'Especificaciones' },
  { key: 'isDemobilized', label: 'Desmovilizado', section: 'Especificaciones' },
];

const CANDIDATE_SECTIONS = ['Personal', 'Contacto', 'Profesional'];
const EMPLOYEE_SECTIONS = ['Identidad', 'Contacto', 'Familia', 'Seguridad Social', 'Información Bancaria', 'Especificaciones'];

export function GenerateRegistrationLinkDialog({ open, onOpenChange, targetType, vacancyId }: Props) {
  const fields = targetType === 'employee' ? EMPLOYEE_FIELDS : CANDIDATE_FIELDS;
  const sections = targetType === 'employee' ? EMPLOYEE_SECTIONS : CANDIDATE_SECTIONS;
  const requiredKeys = fields.filter(f => f.required).map(f => f.key);
  const optionalKeys = fields.filter(f => !f.required).map(f => f.key);

  const [selectedFields, setSelectedFields] = useState<string[]>([...requiredKeys, ...optionalKeys]);
  const [expirationDays, setExpirationDays] = useState('7');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { companies, currentCompanyId } = useAuth();
  const currentCompany = companies.find(c => c.id === currentCompanyId);
  const createToken = useCreateRegistrationToken();

  const toggleField = (key: string) => {
    if (requiredKeys.includes(key)) return;
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSection = (section: string) => {
    const sectionFields = fields.filter(f => f.section === section && !f.required);
    const allSelected = sectionFields.every(f => selectedFields.includes(f.key));
    if (allSelected) {
      setSelectedFields(prev => prev.filter(k => !sectionFields.find(f => f.key === k)));
    } else {
      setSelectedFields(prev => [...new Set([...prev, ...sectionFields.map(f => f.key)])]);
    }
  };

  const handleGenerate = async () => {
    try {
      const token = await createToken.mutateAsync({
        target_type: targetType,
        vacancy_id: vacancyId,
        enabled_fields: selectedFields,
        expires_at: expirationDays === '0' 
          ? addDays(new Date(), 365 * 10).toISOString() 
          : addDays(new Date(), parseInt(expirationDays)).toISOString(),
      });
      const baseUrl = window.location.origin;
      setGeneratedLink(`${baseUrl}/registro?token=${(token as any).token}`);
    } catch {
      toast.error('Error al generar el enlace');
    }
  };

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setCopied(false);
    setSelectedFields([...requiredKeys, ...optionalKeys]);
    setExpirationDays('7');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            {currentCompany?.logo_url ? (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border">
                <img src={currentCompany.logo_url} alt={currentCompany.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Link2 className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle>Generar Enlace de Registro</DialogTitle>
              <DialogDescription>
                {currentCompany?.name} • Para {targetType === 'candidate' ? 'candidatos' : 'empleados'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!generatedLink ? (
          <>
            <div className="space-y-4">
              {sections.map(section => {
                const sectionFields = fields.filter(f => f.section === section);
                const optionalInSection = sectionFields.filter(f => !f.required);
                const allOptionalSelected = optionalInSection.length > 0 && optionalInSection.every(f => selectedFields.includes(f.key));

                return (
                  <div key={section}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-foreground">{section}</h4>
                      {optionalInSection.length > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => toggleSection(section)}>
                          {allOptionalSelected ? 'Desmarcar todos' : 'Marcar todos'}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sectionFields.map(field => (
                        <label
                          key={field.key}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={selectedFields.includes(field.key)}
                            onCheckedChange={() => toggleField(field.key)}
                            disabled={field.required}
                          />
                          <span className={field.required ? 'font-medium' : ''}>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                );
              })}

              <div className="space-y-2">
                <Label>Vigencia del enlace</Label>
                <Select value={expirationDays} onValueChange={setExpirationDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="0">Un solo uso (sin expiración)</SelectItem>
                    <SelectItem value="1">1 día</SelectItem>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={createToken.isPending}>
                {createToken.isPending ? 'Generando...' : 'Generar Enlace'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-3">
              <p className="text-sm text-muted-foreground">Enlace generado exitosamente. Compártelo con el {targetType === 'candidate' ? 'candidato' : 'empleado'}:</p>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Vigencia: {expirationDays === '0' ? 'Un solo uso (sin expiración)' : `${expirationDays} día${parseInt(expirationDays) > 1 ? 's' : ''}`} • Uso único
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
