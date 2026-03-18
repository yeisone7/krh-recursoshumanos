import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertTriangle, User, Send } from 'lucide-react';
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

const FIELD_CONFIG: Record<string, { label: string; type: string; section: string }> = {
  firstName: { label: 'Nombre', type: 'text', section: 'Personal' },
  lastName: { label: 'Apellido', type: 'text', section: 'Personal' },
  documentType: { label: 'Tipo de Documento', type: 'select', section: 'Personal' },
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

const REQUIRED_FIELDS = ['firstName', 'lastName', 'documentType', 'documentNumber'];

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

      // Fetch vacancy title
      if (token.vacancy_id) {
        const { data: vacancy } = await supabase
          .from('vacancies')
          .select('position_title')
          .eq('id', token.vacancy_id)
          .single();
        if (vacancy) setVacancyTitle((vacancy as any).position_title);
      }

      // Fetch company name
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

  const handleSubmit = async () => {
    // Validate required
    for (const key of REQUIRED_FIELDS) {
      if (!formData[key]?.trim()) {
        toast.error(`El campo "${FIELD_CONFIG[key]?.label}" es obligatorio`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_candidate_registration', {
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

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.error || 'Error al enviar');
        return;
      }

      setStep('done');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const enabledFields = tokenData?.enabled_fields || [];
  const sections = ['Personal', 'Contacto', 'Profesional'];

  const renderField = (key: string) => {
    const config = FIELD_CONFIG[key];
    if (!config) return null;
    const isRequired = REQUIRED_FIELDS.includes(key);

    if (config.type === 'select') {
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

    if (config.type === 'select-gender') {
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

    if (config.type === 'select-gender-identity') {
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
            <Input
              className="mt-2"
              placeholder="Especifique"
              value={formData.genderIdentityOther || ''}
              onChange={e => handleChange('genderIdentityOther', e.target.value)}
            />
          )}
        </div>
      );
    }

    if (config.type === 'select-education') {
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

    if (config.type === 'textarea') {
      return (
        <div key={key} className="space-y-1.5 col-span-full">
          <Label>{config.label}</Label>
          <Textarea
            rows={3}
            value={formData[key] || ''}
            onChange={e => handleChange(key, e.target.value)}
            placeholder={`Ingrese ${config.label.toLowerCase()}`}
          />
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1.5">
        <Label>{config.label}{isRequired && <span className="text-destructive ml-1">*</span>}</Label>
        <Input
          type={config.type}
          value={formData[key] || ''}
          onChange={e => handleChange(key, e.target.value)}
          placeholder={`Ingrese ${config.label.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-border/50">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Formulario de Registro</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                {companyName && `${companyName} • `}
                {vacancyTitle ? `Vacante: ${vacancyTitle}` : 'Registro de candidato'}
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
                  key => FIELD_CONFIG[key]?.section === section
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

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting}
              >
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
                Tu información ha sido enviada correctamente. El equipo de selección se pondrá en contacto contigo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
