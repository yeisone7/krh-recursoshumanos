import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertTriangle, User, Send, Building } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'loading' | 'error' | 'form' | 'done';

interface TokenData {
  id: string;
  token: string;
  target_type: string;
  vacancy_id: string | null;
  enabled_fields: string[];
  company_id: string;
  is_used: boolean;
  expires_at: string;
}

// Candidate fields config
const CANDIDATE_FIELD_CONFIG: Record<string, { label: string; type: string; section: string }> = {
  firstName: { label: 'Nombre', type: 'text', section: 'Personal' },
  lastName: { label: 'Apellido', type: 'text', section: 'Personal' },
  documentType: { label: 'Tipo de Documento', type: 'select-doc-type', section: 'Personal' },
  documentNumber: { label: 'Número de Documento', type: 'text', section: 'Personal' },
  birthDate: { label: 'Fecha de Nacimiento', type: 'date', section: 'Personal' },
  gender: { label: 'Sexo Biológico', type: 'select-gender', section: 'Personal' },
  genderIdentity: { label: 'Sexo de Identificación', type: 'select-gender-identity', section: 'Personal' },
  email: { label: 'Email', type: 'email', section: 'Contacto' },
  mobile: { label: 'Celular', type: 'tel', section: 'Contacto' },
  phone: { label: 'Teléfono Fijo', type: 'tel', section: 'Contacto' },
  city: { label: 'Ciudad', type: 'text', section: 'Contacto' },
  department: { label: 'Departamento', type: 'text', section: 'Contacto' },
  address: { label: 'Dirección', type: 'text', section: 'Contacto' },
  educationLevel: { label: 'Nivel Educativo', type: 'select-education', section: 'Profesional' },
  profession: { label: 'Profesión / Título', type: 'text', section: 'Profesional' },
  experienceYears: { label: 'Años de Experiencia', type: 'number', section: 'Profesional' },
  currentCompany: { label: 'Empresa Actual', type: 'text', section: 'Profesional' },
  currentPosition: { label: 'Cargo Actual', type: 'text', section: 'Profesional' },
  salaryExpectation: { label: 'Expectativa Salarial', type: 'text', section: 'Profesional' },
  generalNotes: { label: 'Notas Adicionales', type: 'textarea', section: 'Profesional' },
};

// Employee fields config
const EMPLOYEE_FIELD_CONFIG: Record<string, { label: string; type: string; section: string }> = {
  firstName: { label: 'Primer Nombre', type: 'text', section: 'Identidad' },
  middleName: { label: 'Segundo Nombre', type: 'text', section: 'Identidad' },
  lastName: { label: 'Primer Apellido', type: 'text', section: 'Identidad' },
  secondLastName: { label: 'Segundo Apellido', type: 'text', section: 'Identidad' },
  documentType: { label: 'Tipo de Documento', type: 'select-doc-type', section: 'Identidad' },
  documentNumber: { label: 'Número de Documento', type: 'text', section: 'Identidad' },
  birthDate: { label: 'Fecha de Nacimiento', type: 'date', section: 'Identidad' },
  birthCity: { label: 'Ciudad de Nacimiento', type: 'text', section: 'Identidad' },
  birthDepartment: { label: 'Departamento de Nacimiento', type: 'text', section: 'Identidad' },
  birthCountry: { label: 'País de Nacimiento', type: 'text', section: 'Identidad' },
  gender: { label: 'Sexo Biológico', type: 'select-gender', section: 'Identidad' },
  genderIdentity: { label: 'Sexo de Identificación', type: 'select-gender-identity', section: 'Identidad' },
  maritalStatus: { label: 'Estado Civil', type: 'select-marital', section: 'Identidad' },
  bloodType: { label: 'Tipo de Sangre', type: 'select-blood', section: 'Identidad' },
  documentIssueDate: { label: 'Fecha de Expedición', type: 'date', section: 'Identidad' },
  documentIssueCity: { label: 'Ciudad de Expedición', type: 'text', section: 'Identidad' },
  // Contacto
  email: { label: 'Email Corporativo', type: 'email', section: 'Contacto' },
  personalEmail: { label: 'Email Personal', type: 'email', section: 'Contacto' },
  mobile: { label: 'Celular', type: 'tel', section: 'Contacto' },
  phone: { label: 'Teléfono Fijo', type: 'tel', section: 'Contacto' },
  residenceAddress: { label: 'Dirección de Residencia', type: 'text', section: 'Contacto' },
  residenceCity: { label: 'Ciudad de Residencia', type: 'text', section: 'Contacto' },
  residenceDepartment: { label: 'Departamento de Residencia', type: 'text', section: 'Contacto' },
  residenceNeighborhood: { label: 'Barrio', type: 'text', section: 'Contacto' },
  emergencyContactName: { label: 'Nombre Contacto de Emergencia', type: 'text', section: 'Contacto' },
  emergencyContactPhone: { label: 'Teléfono Contacto de Emergencia', type: 'tel', section: 'Contacto' },
  emergencyContactRelationship: { label: 'Parentesco', type: 'text', section: 'Contacto' },
  // Familia
  spouseName: { label: 'Nombre del Cónyuge', type: 'text', section: 'Familia' },
  spouseBirthDate: { label: 'Fecha Nacimiento Cónyuge', type: 'date', section: 'Familia' },
  childrenCount: { label: 'Número de Hijos', type: 'number', section: 'Familia' },
  // Seguridad Social
  eps: { label: 'EPS', type: 'text', section: 'Seguridad Social' },
  afp: { label: 'Fondo de Pensiones (AFP)', type: 'text', section: 'Seguridad Social' },
  arl: { label: 'ARL', type: 'text', section: 'Seguridad Social' },
  ccf: { label: 'Caja de Compensación', type: 'text', section: 'Seguridad Social' },
  afc: { label: 'AFC', type: 'text', section: 'Seguridad Social' },
  ips: { label: 'IPS de Atención', type: 'text', section: 'Seguridad Social' },
  riskLevel: { label: 'Nivel de Riesgo ARL', type: 'select-risk-level', section: 'Seguridad Social' },
  // Información Bancaria
  bankName: { label: 'Nombre del Banco', type: 'text', section: 'Información Bancaria' },
  accountType: { label: 'Tipo de Cuenta', type: 'select-account-type', section: 'Información Bancaria' },
  accountNumber: { label: 'Número de Cuenta', type: 'text', section: 'Información Bancaria' },
  // Especificaciones
  isFirstJob: { label: 'Primer Empleo', type: 'select-yes-no', section: 'Especificaciones' },
  isHeadOfHousehold: { label: 'Cabeza de Familia', type: 'select-yes-no', section: 'Especificaciones' },
  disabilityType: { label: 'Tipo de Discapacidad', type: 'select-disability', section: 'Especificaciones' },
  ethnicGroup: { label: 'Grupo Étnico', type: 'select-ethnic', section: 'Especificaciones' },
  isConflictVictim: { label: 'Víctima del Conflicto', type: 'select-yes-no', section: 'Especificaciones' },
  isDemobilized: { label: 'Desmovilizado', type: 'select-yes-no', section: 'Especificaciones' },
};

const CANDIDATE_REQUIRED = ['firstName', 'lastName', 'documentType', 'documentNumber'];
const EMPLOYEE_REQUIRED = ['firstName', 'lastName', 'documentType', 'documentNumber'];

const CANDIDATE_SECTIONS = ['Personal', 'Contacto', 'Profesional'];
const EMPLOYEE_SECTIONS = ['Identidad', 'Contacto', 'Familia', 'Seguridad Social', 'Información Bancaria', 'Especificaciones'];

export default function RegistroPublico() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({ documentType: 'CC' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tokenParam) {
      setErrorMsg('No se proporcionó un enlace válido.');
      setStep('error');
      return;
    }
    validateToken();
  }, [tokenParam]);

  const validateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('self_registration_tokens')
        .select('*')
        .eq('token', tokenParam!)
        .single();

      if (error || !data) {
        setErrorMsg('El enlace no es válido.');
        setStep('error');
        return;
      }

      const token = data as unknown as TokenData;

      if (token.is_used) {
        setErrorMsg('Este enlace ya fue utilizado.');
        setStep('error');
        return;
      }

      if (new Date(token.expires_at) < new Date()) {
        setErrorMsg('Este enlace ha expirado.');
        setStep('error');
        return;
      }

      setTokenData(token);

      if (token.vacancy_id) {
        const { data: vacancy } = await supabase
          .from('vacancies')
          .select('position_title')
          .eq('id', token.vacancy_id)
          .single();
        if (vacancy) setVacancyTitle((vacancy as any).position_title);
      }

      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', token.company_id)
        .single();
      if (company) setCompanyName(company.name);

      setStep('form');
    } catch {
      setErrorMsg('Error al validar el enlace.');
      setStep('error');
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const isEmployee = tokenData?.target_type === 'employee';
  const fieldConfig = isEmployee ? EMPLOYEE_FIELD_CONFIG : CANDIDATE_FIELD_CONFIG;
  const requiredFields = isEmployee ? EMPLOYEE_REQUIRED : CANDIDATE_REQUIRED;
  const sections = isEmployee ? EMPLOYEE_SECTIONS : CANDIDATE_SECTIONS;
  const enabledFields = tokenData?.enabled_fields || [];

  const handleSubmit = async () => {
    for (const key of requiredFields) {
      if (!formData[key]?.trim()) {
        toast.error(`El campo "${fieldConfig[key]?.label}" es obligatorio`);
        return;
      }
    }

    setSubmitting(true);
    try {
      let result: any;

      if (isEmployee) {
        const { data } = await supabase.rpc('submit_employee_registration', {
          p_token: tokenParam!,
          p_first_name: formData.firstName || '',
          p_last_name: formData.lastName || '',
          p_middle_name: formData.middleName || null,
          p_second_last_name: formData.secondLastName || null,
          p_document_type: formData.documentType || 'CC',
          p_document_number: formData.documentNumber || '',
          p_birth_date: formData.birthDate || null,
          p_birth_city: formData.birthCity || null,
          p_birth_department: formData.birthDepartment || null,
          p_birth_country: formData.birthCountry || null,
          p_gender: formData.gender || null,
          p_gender_identity: formData.genderIdentity || null,
          p_gender_identity_other: formData.genderIdentityOther || null,
          p_marital_status: formData.maritalStatus || null,
          p_blood_type: formData.bloodType || null,
          p_document_issue_date: formData.documentIssueDate || null,
          p_document_issue_city: formData.documentIssueCity || null,
          p_email: formData.email || null,
          p_personal_email: formData.personalEmail || null,
          p_mobile: formData.mobile || null,
          p_phone: formData.phone || null,
          p_residence_address: formData.residenceAddress || null,
          p_residence_city: formData.residenceCity || null,
          p_residence_department: formData.residenceDepartment || null,
          p_residence_neighborhood: formData.residenceNeighborhood || null,
          p_emergency_contact_name: formData.emergencyContactName || null,
          p_emergency_contact_phone: formData.emergencyContactPhone || null,
          p_emergency_contact_relationship: formData.emergencyContactRelationship || null,
          p_spouse_name: formData.spouseName || null,
          p_spouse_birth_date: formData.spouseBirthDate || null,
          p_children_count: formData.childrenCount ? parseInt(formData.childrenCount) : null,
        });
        result = data;
      } else {
        const { data } = await supabase.rpc('submit_candidate_registration', {
          p_token: tokenParam!,
          p_first_name: formData.firstName || '',
          p_last_name: formData.lastName || '',
          p_document_type: formData.documentType || 'CC',
          p_document_number: formData.documentNumber || '',
          p_email: formData.email || null,
          p_phone: formData.phone || null,
          p_mobile: formData.mobile || null,
          p_address: formData.address || null,
          p_city: formData.city || null,
          p_department: formData.department || null,
          p_birth_date: formData.birthDate || null,
          p_gender: formData.gender || null,
          p_gender_identity: formData.genderIdentity || null,
          p_gender_identity_other: formData.genderIdentityOther || null,
          p_education_level: formData.educationLevel || null,
          p_profession: formData.profession || null,
          p_experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
          p_current_company: formData.currentCompany || null,
          p_current_position: formData.currentPosition || null,
          p_salary_expectation: formData.salaryExpectation ? parseFloat(formData.salaryExpectation.replace(/[^0-9.-]+/g, '')) : null,
          p_general_notes: formData.generalNotes || null,
        });
        result = data;
      }

      if (!(result as any)?.success) {
        toast.error((result as any)?.error || 'Error al enviar');
        return;
      }

      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSelectField = (key: string, type: string, isRequired: boolean) => {
    const config = fieldConfig[key];

    if (type === 'select-doc-type') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}{isRequired && <span className="text-destructive ml-1">*</span>}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
              <SelectItem value="CE">Cédula de Extranjería</SelectItem>
              <SelectItem value="PA">Pasaporte</SelectItem>
              <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
              <SelectItem value="PEP">PEP</SelectItem>
              <SelectItem value="PPT">PPT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-gender') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="femenino">Femenino</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-gender-identity') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="femenino">Femenino</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="trans">Trans</SelectItem>
              <SelectItem value="otro">Otro</SelectItem>
            </SelectContent>
          </Select>
          {formData[key] === 'otro' && (
            <Input className="mt-2" placeholder="Especifique" value={formData.genderIdentityOther || ''} onChange={e => handleChange('genderIdentityOther', e.target.value)} />
          )}
        </div>
      );
    }

    if (type === 'select-education') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="bachiller">Bachiller</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="tecnologo">Tecnólogo</SelectItem>
              <SelectItem value="profesional">Profesional</SelectItem>
              <SelectItem value="especializacion">Especialización</SelectItem>
              <SelectItem value="maestria">Maestría</SelectItem>
              <SelectItem value="doctorado">Doctorado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-marital') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="soltero">Soltero/a</SelectItem>
              <SelectItem value="casado">Casado/a</SelectItem>
              <SelectItem value="union_libre">Unión Libre</SelectItem>
              <SelectItem value="divorciado">Divorciado/a</SelectItem>
              <SelectItem value="viudo">Viudo/a</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-blood') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="O+">O+</SelectItem>
              <SelectItem value="O-">O-</SelectItem>
              <SelectItem value="A+">A+</SelectItem>
              <SelectItem value="A-">A-</SelectItem>
              <SelectItem value="B+">B+</SelectItem>
              <SelectItem value="B-">B-</SelectItem>
              <SelectItem value="AB+">AB+</SelectItem>
              <SelectItem value="AB-">AB-</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-risk-level') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="I">Nivel I - Mínimo</SelectItem>
              <SelectItem value="II">Nivel II - Bajo</SelectItem>
              <SelectItem value="III">Nivel III - Medio</SelectItem>
              <SelectItem value="IV">Nivel IV - Alto</SelectItem>
              <SelectItem value="V">Nivel V - Máximo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-account-type') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="ahorros">Ahorros</SelectItem>
              <SelectItem value="corriente">Corriente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-yes-no') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-disability') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="ninguna">Ninguna</SelectItem>
              <SelectItem value="fisica">Física</SelectItem>
              <SelectItem value="auditiva">Auditiva</SelectItem>
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="cognitiva">Cognitiva</SelectItem>
              <SelectItem value="mental">Mental</SelectItem>
              <SelectItem value="multiple">Múltiple</SelectItem>
              <SelectItem value="sordoceguera">Sordoceguera</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === 'select-ethnic') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <Select value={formData[key] || ''} onValueChange={v => handleChange(key, v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="ninguno">Ninguno</SelectItem>
              <SelectItem value="indigena">Indígena</SelectItem>
              <SelectItem value="rom_gitano">Rom / Gitano</SelectItem>
              <SelectItem value="raizal">Raizal</SelectItem>
              <SelectItem value="palenquero">Palenquero</SelectItem>
              <SelectItem value="negro_afrocolombiano">Negro / Afrocolombiano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    return null;
  };

  const renderField = (key: string) => {
    const config = fieldConfig[key];
    if (!config) return null;
    const isRequired = requiredFields.includes(key);

    if (config.type.startsWith('select')) {
      return renderSelectField(key, config.type, isRequired);
    }

    if (config.type === 'textarea') {
      return (
        <div key={key} className="space-y-1.5 col-span-full">
          <Label>{config.label}</Label>
          <Textarea rows={3} value={formData[key] || ''} onChange={e => handleChange(key, e.target.value)} placeholder={`Ingrese ${config.label.toLowerCase()}`} />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1.5">
        <Label>{config.label}{isRequired && <span className="text-destructive ml-1">*</span>}</Label>
        <Input type={config.type} value={formData[key] || ''} onChange={e => handleChange(key, e.target.value)} placeholder={`Ingrese ${config.label.toLowerCase()}`} />
      </div>
    );
  };

  const HeaderIcon = isEmployee ? Building : User;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-border/50">
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <HeaderIcon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {isEmployee ? 'Registro de Empleado' : 'Formulario de Registro'}
              </CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {companyName && `${companyName} • `}
                {vacancyTitle ? `Vacante: ${vacancyTitle}` : isEmployee ? 'Complete su información personal' : 'Registro de candidato'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {step === 'loading' && (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-muted-foreground">Validando enlace...</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center py-12">
              <AlertTriangle className="w-12 h-12 text-destructive mb-3" />
              <p className="font-medium text-lg mb-1">Enlace no válido</p>
              <p className="text-muted-foreground text-center">{errorMsg}</p>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-6">
              {sections.map(section => {
                const sectionFields = enabledFields.filter(
                  key => fieldConfig[key]?.section === section
                );
                if (sectionFields.length === 0) return null;

                return (
                  <div key={section}>
                    <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                      {section}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sectionFields.map(key => renderField(key))}
                    </div>
                  </div>
                );
              })}

              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Enviar Registro</>
                )}
              </Button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <p className="font-semibold text-xl mb-2">¡Registro Exitoso!</p>
              <p className="text-muted-foreground text-center">
                Tu información ha sido enviada correctamente. {isEmployee ? 'Tu empleador recibirá tu información.' : 'El equipo de selección se pondrá en contacto contigo.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
