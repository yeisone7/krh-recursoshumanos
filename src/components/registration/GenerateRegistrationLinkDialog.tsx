import { useState } from 'react';
import { addDays } from 'date-fns';
import { CalendarClock, Check, Copy, Link2, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
  { key: 'documentNumber', label: 'Número de Documento', section: 'Personal', required: true },
  { key: 'documentType', label: 'Tipo de Documento', section: 'Personal', required: true },
  { key: 'firstName', label: 'Nombre', section: 'Personal', required: true },
  { key: 'lastName', label: 'Apellido', section: 'Personal', required: true },
  { key: 'birthDate', label: 'Fecha de Nacimiento', section: 'Personal' },
  { key: 'gender', label: 'Sexo Biológico', section: 'Personal' },
  { key: 'genderIdentity', label: 'Sexo de Identificación', section: 'Personal' },
  { key: 'email', label: 'Email', section: 'Contacto' },
  { key: 'mobile', label: 'Celular', section: 'Contacto' },
  { key: 'phone', label: 'Teléfono Fijo', section: 'Contacto' },
  { key: 'city', label: 'Ciudad', section: 'Contacto' },
  { key: 'department', label: 'Departamento', section: 'Contacto' },
  { key: 'address', label: 'Dirección', section: 'Contacto' },
  { key: 'educationLevelId', label: 'Nivel Escolar', section: 'Profesional' },
  { key: 'professionId', label: 'Profesión / Título', section: 'Profesional' },
  { key: 'experienceYears', label: 'Años de Experiencia', section: 'Profesional' },
  { key: 'currentCompany', label: 'Empresa Actual', section: 'Profesional' },
  { key: 'currentPosition', label: 'Cargo Actual', section: 'Profesional' },
  { key: 'salaryExpectation', label: 'Expectativa Salarial', section: 'Profesional' },
  { key: 'generalNotes', label: 'Notas', section: 'Profesional' },
];

const EMPLOYEE_FIELDS = [
  { key: 'documentNumber', label: 'Número de Documento', section: 'Identidad', required: true },
  { key: 'documentType', label: 'Tipo de Documento', section: 'Identidad', required: true },
  { key: 'avatarUrl', label: 'Foto del Empleado', section: 'Identidad' },
  { key: 'firstName', label: 'Primer Nombre', section: 'Identidad', required: true },
  { key: 'middleName', label: 'Segundo Nombre (si aplica)', section: 'Identidad' },
  { key: 'lastName', label: 'Primer Apellido', section: 'Identidad', required: true },
  { key: 'secondLastName', label: 'Segundo Apellido (si aplica)', section: 'Identidad' },
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
  { key: 'spouseName', label: 'Nombre del Cónyuge', section: 'Familia' },
  { key: 'spouseBirthDate', label: 'Fecha Nacimiento Cónyuge', section: 'Familia' },
  { key: 'childrenCount', label: 'Número de Hijos', section: 'Familia' },
  { key: 'familyMembers', label: 'Personas a Cargo (Núcleo Familiar)', section: 'Familia' },
  { key: 'eps', label: 'EPS', section: 'Seguridad Social' },
  { key: 'afp', label: 'Fondo de Pensiones (AFP)', section: 'Seguridad Social' },
  { key: 'arl', label: 'ARL', section: 'Seguridad Social' },
  { key: 'ccf', label: 'Caja de Compensación', section: 'Seguridad Social' },
  { key: 'afc', label: 'AFC', section: 'Seguridad Social' },
  { key: 'ips', label: 'IPS de Atención', section: 'Seguridad Social' },
  { key: 'riskLevel', label: 'Nivel de Riesgo ARL', section: 'Seguridad Social' },
  { key: 'vaccines', label: 'Vacunas', section: 'Seguridad Social' },
  { key: 'bankName', label: 'Nombre del Banco', section: 'Información Bancaria' },
  { key: 'accountType', label: 'Tipo de Cuenta', section: 'Información Bancaria' },
  { key: 'accountNumber', label: 'Número de Cuenta', section: 'Información Bancaria' },
  { key: 'educationLevelId', label: 'Nivel Escolar', section: 'Perfil Profesional' },
  { key: 'professionId', label: 'Profesión / Título', section: 'Perfil Profesional' },
  { key: 'isFirstJob', label: 'Primer Empleo', section: 'Especificaciones' },
  { key: 'isHeadOfHousehold', label: 'Cabeza de Familia', section: 'Especificaciones' },
  { key: 'disabilityType', label: 'Tipo de Discapacidad', section: 'Especificaciones' },
  { key: 'ethnicGroup', label: 'Grupo Étnico', section: 'Especificaciones' },
  { key: 'isConflictVictim', label: 'Víctima del Conflicto', section: 'Especificaciones' },
  { key: 'isDemobilized', label: 'Desmovilizado', section: 'Especificaciones' },
];

const CANDIDATE_SECTIONS = ['Personal', 'Contacto', 'Profesional'];
const EMPLOYEE_SECTIONS = ['Identidad', 'Contacto', 'Familia', 'Seguridad Social', 'Información Bancaria', 'Perfil Profesional', 'Especificaciones'];

export function GenerateRegistrationLinkDialog({ open, onOpenChange, targetType, vacancyId }: Props) {
  const fields = targetType === 'employee' ? EMPLOYEE_FIELDS : CANDIDATE_FIELDS;
  const sections = targetType === 'employee' ? EMPLOYEE_SECTIONS : CANDIDATE_SECTIONS;
  const requiredKeys = fields.filter(f => f.required).map(f => f.key);
  const optionalKeys = fields.filter(f => !f.required).map(f => f.key);

  const [selectedFields, setSelectedFields] = useState<string[]>([...requiredKeys, ...optionalKeys]);
  const [linkName, setLinkName] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [reusable, setReusable] = useState(targetType === 'employee');
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
        name: linkName,
        vacancy_id: vacancyId,
        enabled_fields: selectedFields,
        expires_at: expirationDays === '0'
          ? null
          : addDays(new Date(), parseInt(expirationDays)).toISOString(),
        is_reusable: reusable,
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
    setLinkName('');
    setExpirationDays('7');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border-border/70 p-0">
        <DialogHeader className="border-b bg-muted/30 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            {currentCompany?.logo_url ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background">
                <img src={currentCompany.logo_url} alt={currentCompany.name} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black tracking-tight">Generar Enlace de Registro</DialogTitle>
              <DialogDescription className="truncate">
                {currentCompany?.name} - Para {targetType === 'candidate' ? 'candidatos' : 'empleados'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!generatedLink ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-5">
                <div className="rounded-2xl border border-border/70 bg-background p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                      <Label htmlFor="registration-link-name" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                        Nombre del enlace
                      </Label>
                      <p className="text-xs text-muted-foreground">Opcional. Te ayuda a identificar este token en la lista.</p>
                    </div>
                  </div>
                  <Input
                    id="registration-link-name"
                    value={linkName}
                    onChange={(event) => setLinkName(event.target.value)}
                    placeholder={targetType === 'employee' ? 'Ej. Registro empleados mayo' : 'Ej. Vacante almacenista'}
                    maxLength={80}
                    className="h-11 rounded-xl"
                  />
                </div>

                {sections.map(section => {
                  const sectionFields = fields.filter(f => f.section === section);
                  const optionalInSection = sectionFields.filter(f => !f.required);
                  const allOptionalSelected = optionalInSection.length > 0 && optionalInSection.every(f => selectedFields.includes(f.key));
                  const selectedInSection = sectionFields.filter(f => selectedFields.includes(f.key)).length;

                  return (
                    <div key={section} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-foreground">{section}</h4>
                          <p className="text-xs text-muted-foreground">
                            {selectedInSection} de {sectionFields.length} campos seleccionados
                          </p>
                        </div>
                        {optionalInSection.length > 0 && (
                          <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[10px] font-black uppercase tracking-widest" onClick={() => toggleSection(section)}>
                            {allOptionalSelected ? 'Desmarcar todos' : 'Marcar todos'}
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {sectionFields.map(field => (
                          <label
                            key={field.key}
                            className="flex min-h-[46px] cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                          >
                            <Checkbox
                              checked={selectedFields.includes(field.key)}
                              onCheckedChange={() => toggleField(field.key)}
                              disabled={field.required}
                              className="shrink-0"
                            />
                            <span className={field.required ? 'font-semibold leading-snug' : 'leading-snug'}>
                              {field.label}
                              {field.required && <span className="ml-1 text-destructive">*</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <div>
                        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Vigencia del enlace</Label>
                        <p className="text-xs text-muted-foreground">Tiempo disponible para usarlo.</p>
                      </div>
                    </div>
                    <Select value={expirationDays} onValueChange={setExpirationDays}>
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="1">1 día</SelectItem>
                        <SelectItem value="3">3 días</SelectItem>
                        <SelectItem value="7">7 días</SelectItem>
                        <SelectItem value="15">15 días</SelectItem>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="0">Sin expiración</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                    <Checkbox
                      id="reusable"
                      checked={reusable}
                      onCheckedChange={(checked) => setReusable(checked === true)}
                      className="mt-1 shrink-0"
                    />
                    <div className="grid gap-1 leading-none">
                      <span className="flex items-center gap-2 text-sm font-black leading-none">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        Permitir múltiples usos
                      </span>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        El enlace podrá ser usado por varios empleados hasta que expire.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Los campos con asterisco son obligatorios y permanecen bloqueados para proteger la consistencia del registro.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t bg-muted/30 px-5 py-4 sm:px-6">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={createToken.isPending}>
                {createToken.isPending ? 'Generando...' : 'Generar Enlace'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">
                Enlace generado exitosamente. Compartelo con el {targetType === 'candidate' ? 'candidato' : 'empleado'}:
              </p>
              <div className="flex gap-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Vigencia: {expirationDays === '0' ? 'Sin expiración' : `${expirationDays} día${parseInt(expirationDays) > 1 ? 's' : ''}`} - {reusable ? 'Múltiples usos' : 'Uso único'}
              </p>
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
