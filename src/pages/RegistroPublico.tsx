import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertTriangle, User, Send, Building, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEducationLevels } from '@/hooks/useEducationLevels';
import { useProfessions } from '@/hooks/useProfessions';
import { useIdentificationTypes } from '@/hooks/useSystemConfig';
import { motion } from 'framer-motion';
import { AvatarUpload } from '@/components/employees/AvatarUpload';
import { Plus, Trash2 } from 'lucide-react';
import { CitySelect, CityDepartmentSelect } from '@/components/ui/city-department-select';
import { SearchableSelect } from '@/components/ui/searchable-select';

type Step = 'loading' | 'error' | 'form' | 'done';

interface TokenData {
  id: string;
  token: string;
  target_type: string;
  vacancy_id: string | null;
  enabled_fields: string[];
  company_id: string;
  is_used: boolean;
  is_reusable: boolean;
  expires_at: string;
}

// Candidate fields config
const CANDIDATE_FIELD_CONFIG: Record<string, { label: string; type: string; section: string; placeholder?: string }> = {
  documentNumber: { label: 'Número de Documento', type: 'text', section: 'Personal' },
  documentType: { label: 'Tipo de Documento', type: 'select-doc-type', section: 'Personal' },
  firstName: { label: 'Nombre', type: 'text', section: 'Personal' },
  lastName: { label: 'Apellido', type: 'text', section: 'Personal' },
  documentIssueDate: { label: 'Fecha de Expedición', type: 'date', section: 'Personal' },
  documentIssueCity: { label: 'Lugar de Expedición', type: 'text', section: 'Personal' },
  birthDate: { label: 'Fecha de Nacimiento', type: 'date', section: 'Personal' },
  gender: { label: 'Sexo Biológico', type: 'select-gender', section: 'Personal' },
  genderIdentity: { label: 'Sexo de Identificación', type: 'select-gender-identity', section: 'Personal' },
  maritalStatus: { label: 'Estado Civil', type: 'select-marital', section: 'Personal' },
  bloodType: { label: 'Tipo de Sangre', type: 'select-blood', section: 'Personal' },
  email: { label: 'Email', type: 'email', section: 'Contacto' },
  mobile: { label: 'Celular', type: 'tel', section: 'Contacto' },
  phone: { label: 'Teléfono Fijo', type: 'tel', section: 'Contacto' },
  city: { label: 'Ciudad', type: 'text', section: 'Contacto' },
  department: { label: 'Departamento', type: 'text', section: 'Contacto' },
  address: { label: 'Dirección', type: 'text', section: 'Contacto' },
  neighborhood: { label: 'Barrio, Vereda u Otro.', type: 'text', section: 'Contacto', placeholder: 'Nombre del barrio, vereda, otro...' },
  emergencyContactName: { label: 'Nombre Contacto de Emergencia', type: 'text', section: 'Contacto' },
  emergencyContactPhone: { label: 'Teléfono Contacto de Emergencia', type: 'tel', section: 'Contacto' },
  emergencyContactRelationship: { label: 'Parentesco', type: 'text', section: 'Contacto' },
  educationLevelId: { label: 'Nivel Educativo', type: 'select-education-id', section: 'Profesional' },
  professionId: { label: 'Profesión / Título', type: 'select-profession-id', section: 'Profesional' },
  experienceYears: { label: 'Años de Experiencia', type: 'number', section: 'Profesional' },
  currentCompany: { label: 'Empresa Actual', type: 'text', section: 'Profesional' },
  currentPosition: { label: 'Cargo Actual', type: 'text', section: 'Profesional' },
  salaryExpectation: { label: 'Expectativa Salarial', type: 'text', section: 'Profesional' },
  generalNotes: { label: 'Notas Adicionales', type: 'textarea', section: 'Profesional' },
  isFirstJob: { label: 'Primer Empleo', type: 'select-yes-no', section: 'Especificaciones' },
  isHeadOfHousehold: { label: 'Cabeza de Familia', type: 'select-yes-no', section: 'Especificaciones' },
  disabilityType: { label: 'Tipo de Discapacidad', type: 'select-disability', section: 'Especificaciones' },
  ethnicGroup: { label: 'Grupo Étnico', type: 'select-ethnic', section: 'Especificaciones' },
  isConflictVictim: { label: 'Víctima del Conflicto', type: 'select-yes-no', section: 'Especificaciones' },
  isDemobilized: { label: 'Desmovilizado', type: 'select-yes-no', section: 'Especificaciones' },
};

// Employee fields config
const EMPLOYEE_FIELD_CONFIG: Record<string, { label: string; type: string; section: string; placeholder?: string }> = {
  documentNumber: { label: 'Número de Documento', type: 'text', section: 'Identidad' },
  documentType: { label: 'Tipo de Documento', type: 'select-doc-type', section: 'Identidad' },
  avatarUrl: { label: 'Foto del Empleado', type: 'avatar', section: 'Identidad' },
  firstName: { label: 'Primer Nombre', type: 'text', section: 'Identidad' },
  middleName: { label: 'Segundo Nombre', type: 'text', section: 'Identidad' },
  lastName: { label: 'Primer Apellido', type: 'text', section: 'Identidad' },
  secondLastName: { label: 'Segundo Apellido', type: 'text', section: 'Identidad' },
  birthDate: { label: 'Fecha de Nacimiento', type: 'date', section: 'Identidad' },
  birthCity: { label: 'Ciudad de Nacimiento', type: 'city-birth', section: 'Identidad' },
  birthDepartment: { label: 'Departamento de Nacimiento', type: 'hidden-dept', section: 'Identidad' },
  birthCountry: { label: 'País de Nacimiento', type: 'select-country', section: 'Identidad' },
  gender: { label: 'Sexo Biológico', type: 'select-gender', section: 'Identidad' },
  genderIdentity: { label: 'Sexo de Identificación', type: 'select-gender-identity', section: 'Identidad' },
  maritalStatus: { label: 'Estado Civil', type: 'select-marital', section: 'Identidad' },
  bloodType: { label: 'Tipo de Sangre', type: 'select-blood', section: 'Identidad' },
  documentIssueDate: { label: 'Fecha de Expedición', type: 'date', section: 'Identidad' },
  documentIssueCity: { label: 'Ciudad de Expedición', type: 'city-single', section: 'Identidad' },
  // Contacto
  email: { label: 'Email Corporativo', type: 'email', section: 'Contacto' },
  personalEmail: { label: 'Email Personal', type: 'email', section: 'Contacto' },
  mobile: { label: 'Celular', type: 'tel', section: 'Contacto' },
  phone: { label: 'Teléfono Fijo', type: 'tel', section: 'Contacto' },
  residenceAddress: { label: 'Dirección de Residencia', type: 'text', section: 'Contacto' },
  residenceCity: { label: 'Ciudad de Residencia', type: 'city-residence', section: 'Contacto' },
  residenceDepartment: { label: 'Departamento de Residencia', type: 'hidden-dept', section: 'Contacto' },
  residenceNeighborhood: { label: 'Barrio, Vereda u otro.', type: 'text', section: 'Contacto', placeholder: 'Nombre del barrio, vereda, otro...' },
  emergencyContactName: { label: 'Nombre Contacto de Emergencia', type: 'text', section: 'Contacto' },
  emergencyContactPhone: { label: 'Teléfono Contacto de Emergencia', type: 'tel', section: 'Contacto' },
  emergencyContactRelationship: { label: 'Parentesco', type: 'text', section: 'Contacto' },
  // Familia
  spouseName: { label: 'Nombre del Cónyuge', type: 'text', section: 'Familia' },
  spouseBirthDate: { label: 'Fecha Nacimiento Cónyuge', type: 'date', section: 'Familia' },
  childrenCount: { label: 'Número de Hijos', type: 'number', section: 'Familia' },
  familyMembers: { label: 'Personas a Cargo (Núcleo Familiar)', type: 'array', section: 'Familia' },
  // Seguridad Social
  eps: { label: 'EPS', type: 'select-catalog-eps', section: 'Seguridad Social' },
  afp: { label: 'Fondo de Pensiones (AFP)', type: 'select-catalog-afp', section: 'Seguridad Social' },
  arl: { label: 'ARL', type: 'select-catalog-arl', section: 'Seguridad Social' },
  ccf: { label: 'Caja de Compensación', type: 'select-catalog-ccf', section: 'Seguridad Social' },
  afc: { label: 'AFC', type: 'select-catalog-afc', section: 'Seguridad Social' },
  ips: { label: 'IPS de Atención', type: 'select-catalog-ips', section: 'Seguridad Social' },
  riskLevel: { label: 'Nivel de Riesgo ARL', type: 'select-risk-level', section: 'Seguridad Social' },
  vaccines: { label: 'Vacunas', type: 'array', section: 'Seguridad Social' },
  // Información Bancaria
  bankName: { label: 'Nombre del Banco', type: 'select-catalog-banks', section: 'Información Bancaria' },
  accountType: { label: 'Tipo de Cuenta', type: 'select-account-type', section: 'Información Bancaria' },
  accountNumber: { label: 'Número de Cuenta', type: 'text', section: 'Información Bancaria' },
  // Perfil Profesional
  educationLevelId: { label: 'Nivel Escolar', type: 'select-education-id', section: 'Perfil Profesional' },
  professionId: { label: 'Profesión / Título', type: 'select-profession-id', section: 'Perfil Profesional' },
  // Especificaciones
  isFirstJob: { label: 'Primer Empleo', type: 'select-yes-no', section: 'Especificaciones' },
  isHeadOfHousehold: { label: 'Cabeza de Familia', type: 'select-yes-no', section: 'Especificaciones' },
  disabilityType: { label: 'Tipo de Discapacidad', type: 'select-disability', section: 'Especificaciones' },
  ethnicGroup: { label: 'Grupo Étnico', type: 'select-ethnic', section: 'Especificaciones' },
  isConflictVictim: { label: 'Víctima del Conflicto', type: 'select-yes-no', section: 'Especificaciones' },
  isDemobilized: { label: 'Desmovilizado', type: 'select-yes-no', section: 'Especificaciones' },
};

const CANDIDATE_REQUIRED = ['firstName', 'lastName', 'identificationTypeId', 'documentNumber', 'educationLevelId', 'professionId'];
const EMPLOYEE_REQUIRED = ['firstName', 'lastName', 'identificationTypeId', 'documentNumber'];

const CANDIDATE_SECTIONS = ['Personal', 'Contacto', 'Profesional', 'Especificaciones'];
const EMPLOYEE_SECTIONS = ['Identidad', 'Contacto', 'Familia', 'Seguridad Social', 'Información Bancaria', 'Perfil Profesional', 'Especificaciones'];

export default function RegistroPublico() {
  const [searchParams] = useSearchParams();
  const tokenParam = searchParams.get('token');

  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [vacancyTitle, setVacancyTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({ documentType: 'CC', identificationTypeId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  // Catalog data for dropdowns
  const [catalogData, setCatalogData] = useState<Record<string, any[]>>({
    eps: [], afp: [], arl: [], ccf: [], afc: [], ips: [], banks: []
  });
  
  // Use company_id from token for catalogs if not authenticated
  const targetCompanyId = tokenData?.company_id;
  const { data: identificationTypes = [] } = useIdentificationTypes(targetCompanyId);
  const { data: educationLevels = [] } = useEducationLevels(targetCompanyId);
  const { data: professions = [] } = useProfessions(targetCompanyId);

  // Fetch catalog data when token is validated
  useEffect(() => {
    if (!targetCompanyId) return;
    const catalogTables = ['catalog_eps', 'catalog_afp', 'catalog_arl', 'catalog_ccf', 'catalog_afc', 'catalog_ips', 'catalog_banks'];
    const shortNames = ['eps', 'afp', 'arl', 'ccf', 'afc', 'ips', 'banks'];
    Promise.all(
      catalogTables.map(table =>
        supabase.from(table).select('*').eq('company_id', targetCompanyId).eq('is_active', true).order('name')
      )
    ).then(results => {
      const newCatalogData: Record<string, any[]> = {};
      results.forEach((res, i) => {
        newCatalogData[shortNames[i]] = res.data || [];
      });
      setCatalogData(newCatalogData);
    });
  }, [targetCompanyId]);

  // Set default identification type when loaded
  useEffect(() => {
    if (identificationTypes.length > 0 && !formData.identificationTypeId) {
      const ccType = identificationTypes.find(t => t.code === 'CC' || t.name?.includes('Cédula'));
      const defaultType = ccType || identificationTypes[0];
      setFormData(prev => ({ 
        ...prev, 
        identificationTypeId: defaultType.id,
        documentType: defaultType.code || 'CC'
      }));
    }
  }, [identificationTypes]);

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

      if (token.is_used && !token.is_reusable) {
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
        .select('name, logo_url')
        .eq('id', token.company_id)
        .single();
      if (company) {
        setCompanyName(company.name);
        setCompanyLogo(company.logo_url);
      }

      setStep('form');
    } catch (err) {
      console.error('Error validating token:', err);
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

    const mapGender = (val: string | undefined) => {
      if (!val) return null;
      if (val === 'femenino') return 'F';
      if (val === 'masculino') return 'M';
      if (val === 'trans' || val === 'otro') return 'O';
      return val.length === 1 ? val : null;
    };

    setSubmitting(true);
    try {
      let result: any;

      if (isEmployee) {
        let employeeId = formData.employeeId;

        if (!employeeId) {
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
            p_gender: mapGender(formData.gender),
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
            // Social Security
            p_eps: formData.eps || null,
            p_afp: formData.afp || null,
            p_arl: formData.arl || null,
            p_ccf: formData.ccf || null,
            p_afc: formData.afc || null,
            p_ips: formData.ips || null,
            p_risk_level: formData.riskLevel || null,
            // Bank Info
            p_bank_name: formData.bankName || null,
            p_account_type: formData.accountType || null,
            p_account_number: formData.accountNumber || null,
            // Specifications
            p_is_first_job: formData.isFirstJob === 'true' ? true : formData.isFirstJob === 'false' ? false : null,
            p_is_head_of_household: formData.isHeadOfHousehold === 'true' ? true : formData.isHeadOfHousehold === 'false' ? false : null,
            p_disability_type: formData.disabilityType || null,
            p_ethnic_group: formData.ethnicGroup || null,
            p_is_conflict_victim: formData.isConflictVictim === 'true' ? true : formData.isConflictVictim === 'false' ? false : null,
            p_is_demobilized: formData.isDemobilized === 'true' ? true : formData.isDemobilized === 'false' ? false : null,
            p_identification_type_id: formData.identificationTypeId || null,
            p_education_level_id: formData.educationLevelId || null,
            p_profession_id: formData.professionId || null,
          });
          result = data;
          
          if ((result as any)?.success && (result as any)?.employee_id) {
            employeeId = (result as any).employee_id;
          }
        }
        
        if (employeeId && ((result as any)?.success !== false || formData.employeeId)) {
          // If we have an employeeId (either existing or just created), update with full info
          const { data } = await supabase.rpc('update_employee_from_registration', {
            p_token: tokenParam!,
            p_employee_id: employeeId,
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
            p_gender: mapGender(formData.gender),
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
            p_children_count: (formData.childrenCount !== undefined && formData.childrenCount !== '') ? parseInt(formData.childrenCount) : null,
            // Social Security
            p_eps: formData.eps || null,
            p_afp: formData.afp || null,
            p_arl: formData.arl || null,
            p_ccf: formData.ccf || null,
            p_afc: formData.afc || null,
            p_ips: formData.ips || null,
            p_risk_level: formData.riskLevel || null,
            // Bank Info
            p_bank_name: formData.bankName || null,
            p_account_type: formData.accountType || null,
            p_account_number: formData.accountNumber || null,
            // Specifications
            p_is_first_job: formData.isFirstJob === 'true' ? true : formData.isFirstJob === 'false' ? false : null,
            p_is_head_of_household: formData.isHeadOfHousehold === 'true' ? true : formData.isHeadOfHousehold === 'false' ? false : null,
            p_disability_type: formData.disabilityType || null,
            p_ethnic_group: formData.ethnicGroup || null,
            p_is_conflict_victim: formData.isConflictVictim === 'true' ? true : formData.isConflictVictim === 'false' ? false : null,
            p_is_demobilized: formData.isDemobilized === 'true' ? true : formData.isDemobilized === 'false' ? false : null,
            p_identification_type_id: formData.identificationTypeId || null,
            p_education_level_id: formData.educationLevelId || null,
            p_profession_id: formData.professionId || null,
            p_avatar_url: formData.avatarUrl || null,
            p_vaccines: Array.isArray(formData.vaccines) ? formData.vaccines.map(v => ({
              ...v,
              vaccine_type: v.vaccine_type === 'covid19' ? 'COVID' : v.vaccine_type
            })) : [],
            p_family_members: Array.isArray(formData.familyMembers) ? formData.familyMembers.map(m => ({
              ...m,
              document_type: m.document_type || 'CC',
              document_number: m.document_number || ''
            })) : []
          } as any);
          result = data;
        }
      } else {
        const parsedSalary = formData.salaryExpectation 
          ? parseFloat(formData.salaryExpectation.replace(/[^0-9.-]+/g, '')) 
          : null;

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
          p_neighborhood: formData.neighborhood || null,
          p_city: formData.city || null,
          p_department: formData.department || null,
          p_birth_date: formData.birthDate || null,
          p_gender: mapGender(formData.gender),
          p_gender_identity: formData.genderIdentity || null,
          p_gender_identity_other: formData.genderIdentityOther || null,
          p_document_issue_date: formData.documentIssueDate || null,
          p_document_issue_city: formData.documentIssueCity || null,
          p_marital_status: formData.maritalStatus || null,
          p_blood_type: formData.bloodType || null,
          p_emergency_contact_name: formData.emergencyContactName || null,
          p_emergency_contact_phone: formData.emergencyContactPhone || null,
          p_emergency_contact_relationship: formData.emergencyContactRelationship || null,
          p_education_level_id: formData.educationLevelId || null,
          p_profession_id: formData.professionId || null,
          p_experience_years: formData.experienceYears ? parseInt(formData.experienceYears) : 0,
          p_current_company: formData.currentCompany || null,
          p_current_position: formData.currentPosition || null,
          p_salary_expectation: isNaN(parsedSalary as any) ? null : parsedSalary,
          p_general_notes: formData.generalNotes || null,
          p_is_first_job: formData.isFirstJob === 'true' ? true : formData.isFirstJob === 'false' ? false : null,
          p_is_head_of_household: formData.isHeadOfHousehold === 'true' ? true : formData.isHeadOfHousehold === 'false' ? false : null,
          p_disability_type: formData.disabilityType || null,
          p_ethnic_group: formData.ethnicGroup || null,
          p_is_conflict_victim: formData.isConflictVictim === 'true' ? true : formData.isConflictVictim === 'false' ? false : null,
          p_is_demobilized: formData.isDemobilized === 'true' ? true : formData.isDemobilized === 'false' ? false : null,
          p_identification_type_id: formData.identificationTypeId || null,
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
          <SearchableSelect
            options={identificationTypes.map(t => ({ value: t.id, label: t.name }))}
            value={formData.identificationTypeId || ''}
            onValueChange={v => {
              const selected = identificationTypes.find(t => t.id === v);
              setFormData(prev => ({ 
                ...prev, 
                identificationTypeId: v,
                documentType: selected?.code || prev.documentType 
              }));
            }}
            placeholder="Seleccionar tipo de documento"
          />
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

    if (type === 'select-education-id') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <SearchableSelect
            options={educationLevels.map(level => ({ value: level.id, label: level.name }))}
            value={formData[key] || ''}
            onValueChange={v => handleChange(key, v)}
            placeholder="Seleccionar nivel de estudios"
          />
        </div>
      );
    }

    if (type === 'select-profession-id') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <SearchableSelect
            options={professions.map(prof => ({ value: prof.id, label: prof.name }))}
            value={formData[key] || ''}
            onValueChange={v => handleChange(key, v)}
            placeholder="Seleccionar profesión"
          />
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
          <SearchableSelect
            options={[
              { value: 'I', label: 'Nivel I - Mínimo' },
              { value: 'II', label: 'Nivel II - Bajo' },
              { value: 'III', label: 'Nivel III - Medio' },
              { value: 'IV', label: 'Nivel IV - Alto' },
              { value: 'V', label: 'Nivel V - Máximo' },
            ]}
            value={formData[key] || ''}
            onValueChange={v => handleChange(key, v)}
            placeholder="Seleccionar nivel de riesgo"
          />
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

  const renderCatalogSelect = (key: string, catalogKey: string, label: string) => {
    const options = (catalogData[catalogKey] || []).map((opt: any) => ({
      value: opt.name,
      label: opt.name
    }));
    return (
      <div key={key} className="space-y-1.5">
        <Label>{label}</Label>
        <SearchableSelect
          options={options}
          value={formData[key] || ''}
          onValueChange={v => handleChange(key, v)}
          placeholder={`Seleccionar ${label}`}
          searchPlaceholder={`Buscar ${label.toLowerCase()}...`}
        />
      </div>
    );
  };

  const renderField = (key: string) => {
    const config = fieldConfig[key];
    if (!config) return null;
    const isRequired = requiredFields.includes(key);

    // Hidden department fields (auto-set by city selectors)
    if (config.type === 'hidden-dept') return null;

    if (config.type.startsWith('select')) {
      // Catalog selects
      if (config.type === 'select-catalog-eps') return renderCatalogSelect(key, 'eps', config.label);
      if (config.type === 'select-catalog-afp') return renderCatalogSelect(key, 'afp', config.label);
      if (config.type === 'select-catalog-arl') return renderCatalogSelect(key, 'arl', config.label);
      if (config.type === 'select-catalog-ccf') return renderCatalogSelect(key, 'ccf', config.label);
      if (config.type === 'select-catalog-afc') return renderCatalogSelect(key, 'afc', config.label);
      if (config.type === 'select-catalog-ips') return renderCatalogSelect(key, 'ips', config.label);
      if (config.type === 'select-catalog-banks') return renderCatalogSelect(key, 'banks', config.label);
      if (config.type === 'select-country') {
        return (
          <div key={key} className="space-y-1.5">
            <Label>{config.label}</Label>
            <SearchableSelect
              options={[
                { value: 'Colombia', label: 'Colombia' },
                { value: 'Venezuela', label: 'Venezuela' },
                { value: 'Ecuador', label: 'Ecuador' },
                { value: 'Perú', label: 'Perú' },
                { value: 'Brasil', label: 'Brasil' },
                { value: 'Chile', label: 'Chile' },
                { value: 'Argentina', label: 'Argentina' },
                { value: 'México', label: 'México' },
                { value: 'Estados Unidos', label: 'Estados Unidos' },
                { value: 'España', label: 'España' },
                { value: 'Otro', label: 'Otro' },
              ]}
              value={formData[key] || 'Colombia'}
              onValueChange={v => handleChange(key, v)}
              placeholder="Seleccionar país"
            />
          </div>
        );
      }
      return renderSelectField(key, config.type, isRequired);
    }

    // City with department auto-fill (birth)
    if (config.type === 'city-birth') {
      return (
        <div key={key} className="space-y-1.5 col-span-full">
          <CityDepartmentSelect
            departmentValue={formData.birthDepartment || ''}
            cityValue={formData.birthCity || ''}
            onDepartmentChange={(dept) => {
              setFormData(prev => ({ ...prev, birthDepartment: dept }));
            }}
            onCityChange={(city) => setFormData(prev => ({ ...prev, birthCity: city }))}
            departmentLabel="Departamento de Nacimiento"
            cityLabel="Ciudad de Nacimiento"
          />
        </div>
      );
    }

    // City with department auto-fill (residence)
    if (config.type === 'city-residence') {
      return (
        <div key={key} className="space-y-1.5 col-span-full">
          <CityDepartmentSelect
            departmentValue={formData.residenceDepartment || ''}
            cityValue={formData.residenceCity || ''}
            onDepartmentChange={(dept) => {
              setFormData(prev => ({ ...prev, residenceDepartment: dept }));
            }}
            onCityChange={(city) => setFormData(prev => ({ ...prev, residenceCity: city }))}
            departmentLabel="Departamento de Residencia"
            cityLabel="Ciudad de Residencia"
          />
        </div>
      );
    }

    // Single city select (expedición)
    if (config.type === 'city-single') {
      return (
        <div key={key} className="space-y-1.5">
          <Label>{config.label}</Label>
          <CitySelect
            value={formData[key] || ''}
            onValueChange={(city) => handleChange(key, city)}
            placeholder="Buscar ciudad..."
          />
        </div>
      );
    }

    if (config.type === 'textarea') {
      return (
        <div key={key} className="space-y-1.5 col-span-full">
          <Label>{config.label}</Label>
          <Textarea rows={3} value={formData[key] || ''} onChange={e => handleChange(key, e.target.value)} placeholder={`Ingrese ${config.label.toLowerCase()}`} />
        </div>
      );
    }

    if (key === 'avatarUrl') {
      return (
        <div key={key} className="space-y-1.5 col-span-full mb-4">
          <Label>{config.label}</Label>
          <div className="bg-card dark:bg-slate-900/40 border dark:border-slate-800 rounded-lg p-6 flex justify-center items-center">
            <AvatarUpload
              currentAvatarUrl={formData[key]}
              onAvatarChange={(url) => handleChange(key, url || '')}
              employeeName={formData.firstName ? `${formData.firstName} ${formData.lastName || ''}` : 'Empleado'}
              employeeId={formData.employeeId}
            />
          </div>
        </div>
      );
    }

    if (key === 'vaccines' || key === 'familyMembers') {
      const items = Array.isArray(formData[key]) ? formData[key] : [];
      const isVaccine = key === 'vaccines';

      return (
        <div key={key} className="col-span-full space-y-3 mt-2 border border-border/50 dark:border-slate-800/80 bg-muted/20 dark:bg-slate-950/20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <Label className="text-base font-semibold">{config.label}</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => {
                const newItem = isVaccine 
                  ? { vaccine_name: '', dose_number: 1, vaccine_type: 'COVID' } 
                  : { full_name: '', relationship: '', document_type: 'CC', document_number: '' };
                handleChange(key, [...items, newItem]);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          </div>
          
          <div className="space-y-3">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-end bg-background dark:bg-slate-900/60 p-3 rounded-md border dark:border-slate-800 shadow-sm">
                {isVaccine ? (
                  <>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nombre de Vacuna</Label>
                      <Input value={item.vaccine_name || ''} onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], vaccine_name: e.target.value };
                        handleChange(key, newItems);
                      }} placeholder="Ej: COVID-19" />
                    </div>
                    <div className="w-full sm:w-24 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Dosis</Label>
                      <Input type="number" min={1} value={item.dose_number || 1} onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], dose_number: parseInt(e.target.value) || 1 };
                        handleChange(key, newItems);
                      }} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nombre Completo</Label>
                      <Input value={item.full_name || ''} onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], full_name: e.target.value };
                        handleChange(key, newItems);
                      }} placeholder="Nombre del familiar" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Parentesco</Label>
                      <Input value={item.relationship || ''} onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], relationship: e.target.value };
                        handleChange(key, newItems);
                      }} placeholder="Hijo, Esposo(a)..." />
                    </div>
                    <div className="w-full sm:w-32 space-y-1.5">
                      <Label className="text-xs text-muted-foreground">N° Documento</Label>
                      <Input value={item.document_number || ''} onChange={e => {
                        const newItems = [...items];
                        newItems[idx] = { ...newItems[idx], document_number: e.target.value };
                        handleChange(key, newItems);
                      }} placeholder="Cédula" />
                    </div>
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" className="shrink-0 self-end sm:self-auto" onClick={() => {
                  const newItems = items.filter((_, i) => i !== idx);
                  handleChange(key, newItems);
                }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 bg-background dark:bg-slate-900/40 border dark:border-slate-800 rounded-md">
                No hay registros agregados.
              </p>
            )}
          </div>
        </div>
      );
    }

    const handleDocumentBlur = key === 'documentNumber' ? async () => {
      const docNum = formData[key]?.trim();
      if (docNum && docNum.length >= 4 && tokenData?.company_id && !prefilled) {
        try {
          if (isEmployee) {
            const { data } = await supabase.rpc('get_employee_by_token_and_document', {
              p_token: tokenParam!,
              p_document_number: docNum
            });
            const result = data as any;
            if (result?.success && result?.found) {
              const emp = result.employee;
              const contact = result.contact;
              const family = result.family;
              const social = result.social;
              const bank = result.bank;
              const updates: Record<string, any> = {
                employeeId: emp.id,
                firstName: emp.first_name,
                middleName: emp.middle_name,
                lastName: emp.last_name,
                secondLastName: emp.second_last_name,
                birthDate: emp.birth_date,
                birthCity: emp.birth_city,
                birthDepartment: emp.birth_department,
                birthCountry: emp.birth_country,
                gender: emp.gender === 'M' ? 'masculino' : emp.gender === 'F' ? 'femenino' : (emp.gender ? 'otro' : ''),
                genderIdentity: emp.gender_identity,
                maritalStatus: emp.marital_status,
                bloodType: emp.blood_type,
                documentIssueDate: emp.document_issue_date,
                documentIssueCity: emp.document_issue_city,
                isFirstJob: emp.is_first_job ? 'true' : 'false',
                isHeadOfHousehold: emp.is_head_of_household ? 'true' : 'false',
                disabilityType: emp.disability_type,
                ethnicGroup: emp.ethnic_group,
                isConflictVictim: emp.is_conflict_victim ? 'true' : 'false',
                isDemobilized: emp.is_demobilized ? 'true' : 'false',
                identificationTypeId: emp.identification_type_id,
                documentType: emp.document_type,
                educationLevelId: emp.education_level_id,
                professionId: emp.profession_id,
                avatarUrl: emp.avatar_url,
              };

              if (contact) {
                updates.email = contact.email;
                updates.personalEmail = contact.personal_email;
                updates.mobile = contact.mobile;
                updates.phone = contact.phone;
                updates.residenceAddress = contact.residence_address;
                updates.residenceCity = contact.residence_city;
                updates.residenceDepartment = contact.residence_department;
                updates.residenceNeighborhood = contact.residence_neighborhood;
                updates.emergencyContactName = contact.emergency_contact_name;
                updates.emergencyContactPhone = contact.emergency_contact_phone;
                updates.emergencyContactRelationship = contact.emergency_contact_relationship;
              }

              if (family) {
                updates.spouseName = family.spouse_name;
                updates.spouseBirthDate = family.spouse_birth_date;
                updates.childrenCount = family.children_count?.toString();
              }

              if (social) {
                updates.eps = social.eps;
                updates.afp = social.afp;
                updates.arl = social.arl;
                updates.ccf = social.ccf;
                updates.afc = social.afc;
                updates.ips = social.ips;
                updates.riskLevel = social.risk_level;
              }

              if (bank) {
                updates.bankName = bank.bank_name;
                updates.accountType = bank.account_type;
                updates.accountNumber = bank.account_number;
              }
              
              if (result.vaccinations) {
                updates.vaccines = result.vaccinations;
              }

              // Remove nulls so we don't overwrite user input if they typed something while it was fetching
              Object.keys(updates).forEach(k => {
                if (updates[k] === null || updates[k] === undefined) delete updates[k];
              });

              setFormData(prev => ({ ...prev, ...updates }));
              setPrefilled(true);
              toast.info('Se encontró información de tu perfil. Los campos han sido pre-llenados.');
            }
          } else {
            const { data } = await supabase.rpc('check_candidate_background', {
              p_document_number: docNum,
              p_company_id: tokenData.company_id,
            } as any);
            const result = data as any;
            if (result?.previous_candidacies?.length > 0) {
              const latest = result.previous_candidacies[0];
              const updates: Record<string, string> = {};
              if (!formData.firstName && latest.first_name) updates.firstName = latest.first_name;
              if (!formData.lastName && latest.last_name) updates.lastName = latest.last_name;
              if (!formData.email && latest.email) updates.email = latest.email;
              if (!formData.mobile && latest.mobile) updates.mobile = latest.mobile;
              if (!formData.phone && latest.phone) updates.phone = latest.phone;
              if (!formData.address && latest.address) updates.address = latest.address;
              if (!formData.city && latest.city) updates.city = latest.city;
              if (!formData.department && latest.department) updates.department = latest.department;
              if (!formData.neighborhood && latest.neighborhood) updates.neighborhood = latest.neighborhood;
              if (!formData.gender && latest.gender) updates.gender = latest.gender;
              if (Object.keys(updates).length > 0) {
                setFormData(prev => ({ ...prev, ...updates }));
                setPrefilled(true);
                toast.info('Se encontró información previa asociada a este documento. Los campos han sido pre-llenados.');
              }
            }
          }
        } catch { /* silent */ }
      }
    } : undefined;

    return (
      <div key={key} className="space-y-1.5">
        <Label>{config.label}{isRequired && <span className="text-destructive ml-1">*</span>}</Label>
        <Input
          type={config.type}
          value={formData[key] || ''}
          onChange={e => handleChange(key, e.target.value)}
          onBlur={handleDocumentBlur}
          placeholder={config.placeholder || `Ingrese ${config.label.toLowerCase()}`}
        />
      </div>
    );
  };

  const HeaderIcon = isEmployee ? Building : User;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex items-center justify-center p-4 py-12 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-none dark:border dark:border-slate-800/80 shadow-2xl shadow-slate-200/50 dark:shadow-none rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 transition-colors duration-300">
          {/* Header with Logo */}
          <div className="w-full flex flex-col items-center pt-10 pb-6 bg-white dark:bg-slate-900 relative transition-colors duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
            {companyLogo ? (
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                src={companyLogo}
                alt={companyName}
                className="max-h-24 max-w-[280px] object-contain mb-6 rounded-2xl shadow-sm bg-white p-1"
              />
            ) : (
              <div className="w-20 h-20 rounded-[2rem] bg-primary/5 flex items-center justify-center mb-6 border border-primary/10 dark:border-primary/20">
                <Building className="w-10 h-10 text-primary" />
              </div>
            )}
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight uppercase">{companyName}</h2>
            <div className="h-1 w-12 bg-primary/30 rounded-full mt-2" />
          </div>

          {/* Welcome image for candidates */}
          {!isEmployee && step === 'form' && (
            <div className="w-full px-8">
              <div className="rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
                <img
                  src="/images/IMAGEN_PROCESO_DE_SELECCION.png"
                  alt="Proceso de Selección"
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          )}

          <div className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 transition-colors duration-300">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                <HeaderIcon className="w-7 h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                  {isEmployee ? 'REGISTRO DE EMPLEADO' : 'FORMULARIO DE REGISTRO'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-0.5 truncate">
                  {vacancyTitle ? `Vacante: ${vacancyTitle}` : isEmployee ? 'Información Personal y Laboral' : 'Postulación de Candidato'}
                </p>
              </div>
            </div>
          </div>

          <CardContent className="px-8 pb-10 pt-4">
            {step === 'loading' && (
              <div className="flex flex-col items-center py-20">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 rounded-full bg-primary/5" />
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest mt-6">Validando enlace seguro...</p>
              </div>
            )}

            {step === 'error' && (
              <div className="flex flex-col items-center py-16 text-center space-y-4">
                <div className="h-20 w-20 rounded-[2rem] bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">ENLACE NO VÁLIDO</p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto mt-2">{errorMsg}</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl border-slate-200 dark:border-slate-800 font-bold uppercase tracking-widest text-[10px]">
                  Reintentar
                </Button>
              </div>
            )}

            {step === 'form' && (
              <div className="space-y-10">
                {prefilled && (
                  <Alert className="border-none bg-blue-50/70 dark:bg-blue-950/20 rounded-2xl py-4">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-sm text-blue-800 dark:text-blue-300 font-bold pl-2">
                      Se encontró información previa. Los campos han sido auto-completados.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-12">
                  {sections.map(section => {
                    const sectionFields = Object.keys(fieldConfig).filter(
                      key => fieldConfig[key]?.section === section && enabledFields.includes(key)
                    );
                    if (sectionFields.length === 0) return null;

                    return (
                      <div key={section} className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-1 bg-primary rounded-full" />
                          <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            {section}
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                          {sectionFields.map(key => renderField(key))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                  <Button 
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 font-black text-lg uppercase tracking-widest transition-all active:scale-[0.98] group" 
                    onClick={handleSubmit} 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="w-6 h-6 mr-3 animate-spin" /> PROCESANDO...</>
                    ) : (
                      <><Send className="w-5 h-5 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> ENVIAR REGISTRO</>
                    )}
                  </Button>
                  <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-6">
                    Al enviar este formulario aceptas nuestra política de tratamiento de datos
                  </p>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="flex flex-col items-center py-20 text-center space-y-6">
                <div className="h-24 w-24 rounded-[2.5rem] bg-emerald-500/10 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight uppercase">¡REGISTRO EXITOSO!</p>
                  <p className="text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                    Tu información ha sido enviada correctamente. {isEmployee ? 'Tu empleador recibirá tu información en breve.' : 'El equipo de selección se pondrá en contacto contigo muy pronto.'}
                  </p>
                </div>
                <div className="pt-4">
                  <div className="h-1 w-16 bg-emerald-500/30 dark:bg-emerald-500/10 rounded-full mx-auto" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
