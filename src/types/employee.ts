import { z } from 'zod';

// =====================================================
// ENUMS AND TYPES - Matching database schema
// =====================================================

export type GenderType = 'M' | 'F' | 'O';
export type MaritalStatusType = 'soltero' | 'casado' | 'union_libre' | 'divorciado' | 'viudo';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type AccountType = 'ahorros' | 'corriente';
export type RiskLevel = 'I' | 'II' | 'III' | 'IV' | 'V';
export type CertificationType = 'licencia_conduccion' | 'manejo_defensivo' | 'manipulacion_alimentos' | 'psicosensometrico' | 'bpm' | 'trabajo_alturas' | 'primeros_auxilios' | 'otro';
export type VaccineType = 'TT' | 'HA' | 'HB' | 'FA' | 'TIFO' | 'COVID' | 'INFLUENZA' | 'otro';
export type PayrollType = 'quincenal' | 'mensual';
export type EmployeeDocumentType = 'contrato' | 'hoja_vida' | 'cedula' | 'certificado_laboral' | 'certificado_estudio' | 'antecedentes' | 'carta_residencia' | 'carta_banco' | 'otro';
export type LinkType = 'indefinido' | 'fijo' | 'obra_labor' | 'aprendizaje' | 'servicios' | 'temporal';
export type DocumentType = 'CC' | 'CE' | 'TI' | 'PA' | 'PEP';

// =====================================================
// LABEL CONFIGURATIONS
// =====================================================

export const genderLabels: Record<GenderType, string> = {
  M: 'Masculino',
  F: 'Femenino',
  O: 'Otro',
};

export const maritalStatusLabels: Record<MaritalStatusType, string> = {
  soltero: 'Soltero(a)',
  casado: 'Casado(a)',
  union_libre: 'Unión Libre',
  divorciado: 'Divorciado(a)',
  viudo: 'Viudo(a)',
};

export const bloodTypeLabels: Record<BloodType, string> = {
  'A+': 'A+', 'A-': 'A-',
  'B+': 'B+', 'B-': 'B-',
  'AB+': 'AB+', 'AB-': 'AB-',
  'O+': 'O+', 'O-': 'O-',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  TI: 'Tarjeta de Identidad',
  PA: 'Pasaporte',
  PEP: 'PEP',
};

export const linkTypeLabels: Record<LinkType, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término Fijo',
  obra_labor: 'Obra o Labor',
  aprendizaje: 'Aprendizaje',
  servicios: 'Prestación de Servicios',
  temporal: 'Temporal',
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  I: 'Nivel I - Mínimo',
  II: 'Nivel II - Bajo',
  III: 'Nivel III - Medio',
  IV: 'Nivel IV - Alto',
  V: 'Nivel V - Máximo',
};

export const accountTypeLabels: Record<AccountType, string> = {
  ahorros: 'Ahorros',
  corriente: 'Corriente',
};

export const certificationTypeLabels: Record<CertificationType, string> = {
  licencia_conduccion: 'Licencia de Conducción',
  manejo_defensivo: 'Manejo Defensivo',
  manipulacion_alimentos: 'Manipulación de Alimentos',
  psicosensometrico: 'Psicosensométrico',
  bpm: 'BPM',
  trabajo_alturas: 'Trabajo en Alturas',
  primeros_auxilios: 'Primeros Auxilios',
  otro: 'Otro',
};

export const vaccineTypeLabels: Record<VaccineType, string> = {
  TT: 'Tétano',
  HA: 'Hepatitis A',
  HB: 'Hepatitis B',
  FA: 'Fiebre Amarilla',
  TIFO: 'Tifoidea',
  COVID: 'COVID-19',
  INFLUENZA: 'Influenza',
  otro: 'Otro',
};

export const payrollTypeLabels: Record<PayrollType, string> = {
  quincenal: 'Quincenal',
  mensual: 'Mensual',
};

export const employeeDocumentTypeLabels: Record<EmployeeDocumentType, string> = {
  contrato: 'Contrato',
  hoja_vida: 'Hoja de Vida',
  cedula: 'Cédula',
  certificado_laboral: 'Certificado Laboral',
  certificado_estudio: 'Certificado de Estudio',
  antecedentes: 'Antecedentes',
  carta_residencia: 'Carta de Residencia',
  carta_banco: 'Carta del Banco',
  otro: 'Otro',
};

// =====================================================
// ZOD SCHEMAS FOR FORM VALIDATION
// =====================================================

// A. Core Employee Schema
export const employeeCoreSchema = z.object({
  // Identification
  documentType: z.enum(['CC', 'CE', 'TI', 'PA', 'PEP'], {
    required_error: 'Seleccione el tipo de documento',
  }),
  documentNumber: z.string()
    .min(5, 'El documento debe tener al menos 5 caracteres')
    .max(20, 'El documento no puede exceder 20 caracteres'),
  documentIssueCity: z.string().max(100).optional(),
  documentIssueDate: z.date().optional(),
  
  // Names
  firstName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  middleName: z.string().max(50).optional(),
  lastName: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres'),
  secondLastName: z.string().max(50).optional(),
  
  // Birth
  birthCountry: z.string().max(100).default('Colombia'),
  birthDepartment: z.string().max(100).optional(),
  birthCity: z.string().max(100).optional(),
  birthDate: z.date({ required_error: 'La fecha de nacimiento es requerida' }),
  
  // Characteristics
  gender: z.enum(['M', 'F', 'O'], { required_error: 'Seleccione el género' }),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  maritalStatus: z.enum(['soltero', 'casado', 'union_libre', 'divorciado', 'viudo'], { required_error: 'Seleccione el estado civil' }),
});

// B. Contact Schema
export const employeeContactSchema = z.object({
  residenceDepartment: z.string().max(100).optional(),
  residenceCity: z.string().max(100).optional(),
  residenceAddress: z.string().max(200).optional(),
  residenceNeighborhood: z.string().max(100).optional(),
  
  email: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  personalEmail: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  phone: z.string().max(15).optional(),
  mobile: z.string().max(15).optional(),
  
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(15).optional(),
  emergencyContactRelationship: z.string().max(50).optional(),
  
  residenceLetterUrl: z.string().optional(),
  residenceLetterExpiry: z.date().optional(),
});

// C. Family Schema
export const employeeFamilySchema = z.object({
  spouseName: z.string().max(100).optional(),
  spouseGender: z.enum(['M', 'F', 'O']).nullable().optional(),
  spouseBirthDate: z.date().optional(),
  spouseWorks: z.boolean().default(false),
  childrenCount: z.number().min(0).max(20).default(0),
});

// D. Work Info Schema
export const employeeWorkInfoSchema = z.object({
  operationCenterId: z.string().uuid({ message: 'Seleccione el centro de operación' }),
  costCenter: z.string().min(1, 'El centro de costos es requerido').max(50),
  areaId: z.string().uuid({ message: 'Seleccione el área' }),
  positionId: z.string().uuid().optional(),
  positionName: z.string().min(2, 'El cargo es requerido').max(100),
  workCity: z.string().max(100).optional(),
  hireDate: z.date({ required_error: 'La fecha de ingreso es requerida' }),
  terminationDate: z.date().optional(),
  linkType: z.enum(['indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'servicios', 'temporal']).default('indefinido'),
  observations: z.string().max(500).optional(),
});

// E. Social Security Schema
export const employeeSocialSecuritySchema = z.object({
  riskLevel: z.enum(['I', 'II', 'III', 'IV', 'V'], { required_error: 'Seleccione el nivel de riesgo ARL' }),
  arl: z.string().min(1, 'Seleccione la ARL').max(100),
  eps: z.string().min(1, 'Seleccione la EPS').max(100),
  afp: z.string().min(1, 'Seleccione la AFP').max(100),
  ccf: z.string().min(1, 'Seleccione la Caja de Compensación').max(100),
  afc: z.string().min(1, 'Seleccione la AFC').max(100),
  ips: z.string().max(100).optional(),
});

// F. Bank Info Schema
export const employeeBankInfoSchema = z.object({
  bankName: z.string().min(1, 'Seleccione el banco').max(100),
  accountType: z.enum(['ahorros', 'corriente'], { required_error: 'Seleccione el tipo de cuenta' }),
  accountNumber: z.string().min(1, 'El número de cuenta es requerido').max(30),
  bankLetterUrl: z.string().optional(),
  accountRegistered: z.boolean().default(false),
});

// J. Schedule Schema
export const employeeScheduleSchema = z.object({
  payrollType: z.enum(['quincenal', 'mensual'], { required_error: 'Seleccione el tipo de nómina' }).default('quincenal'),
  shiftTypeId: z.string().uuid().optional(),
  isOfficeSchedule: z.boolean().default(true),
  restDay: z.string().min(1, 'Seleccione el día de descanso').max(20),
});

// K. Time Mode Schema (Modalidad de Tiempo)
export const employeeTimeModeSchema = z.object({
  timeMode: z.enum(['administrative', 'shift'], {
    required_error: 'Seleccione una modalidad de tiempo',
  }),
  workScheduleId: z.string().uuid().optional(),
  shiftCycleId: z.string().uuid().optional(),
  cycleStartDate: z.date().optional(),
  timeModeStartDate: z.date({ required_error: 'Fecha de vigencia requerida' }),
  timeModeNotes: z.string().max(500).optional(),
}).refine((data) => {
  if (data.timeMode === 'administrative') {
    return !!data.workScheduleId;
  }
  if (data.timeMode === 'shift') {
    return !!data.shiftCycleId;
  }
  return false;
}, {
  message: 'Seleccione un horario o ciclo según la modalidad',
  path: ['workScheduleId'],
});

// Combined Form Schema for creating/editing employees
// We need to handle the time mode validation separately due to refinement
const baseFormSchema = z.object({
  // A. Core
  ...employeeCoreSchema.shape,
  // B. Contact
  ...employeeContactSchema.shape,
  // C. Family
  ...employeeFamilySchema.shape,
  // D. Work Info
  ...employeeWorkInfoSchema.shape,
  // E. Social Security
  ...employeeSocialSecuritySchema.shape,
  // F. Bank Info
  ...employeeBankInfoSchema.shape,
  // J. Schedule
  ...employeeScheduleSchema.shape,
  // K. Time Mode (inline without refinement for base)
  timeMode: z.enum(['administrative', 'shift'], {
    required_error: 'Seleccione una modalidad de tiempo',
  }),
  workScheduleId: z.string().uuid().optional(),
  shiftCycleId: z.string().uuid().optional(),
  cycleStartDate: z.date().optional(),
  timeModeStartDate: z.date({ required_error: 'Fecha de vigencia requerida' }),
  timeModeNotes: z.string().max(500).optional(),
});

export const employeeFullFormSchema = baseFormSchema.refine((data) => {
  if (data.timeMode === 'administrative') {
    return !!data.workScheduleId;
  }
  if (data.timeMode === 'shift') {
    return !!data.shiftCycleId;
  }
  return false;
}, {
  message: 'Seleccione un horario o ciclo según la modalidad',
  path: ['workScheduleId'],
});

export type EmployeeFullFormData = z.infer<typeof employeeFullFormSchema>;

// =====================================================
// DATABASE ROW TYPES
// =====================================================

export interface EmployeeV2 {
  id: string;
  company_id: string;
  document_type: DocumentType;
  document_number: string;
  document_issue_city: string | null;
  document_issue_date: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  birth_country: string | null;
  birth_department: string | null;
  birth_city: string | null;
  birth_date: string | null;
  gender: GenderType | null;
  blood_type: BloodType | null;
  marital_status: MaritalStatusType | null;
  is_active: boolean;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeContact {
  id: string;
  employee_id: string;
  residence_department: string | null;
  residence_city: string | null;
  residence_address: string | null;
  residence_neighborhood: string | null;
  email: string | null;
  personal_email: string | null;
  phone: string | null;
  mobile: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  residence_letter_url: string | null;
  residence_letter_expiry: string | null;
  is_current: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFamily {
  id: string;
  employee_id: string;
  spouse_name: string | null;
  spouse_gender: GenderType | null;
  spouse_birth_date: string | null;
  spouse_works: boolean | null;
  children_count: number | null;
  is_current: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeWorkInfo {
  id: string;
  employee_id: string;
  company_id: string;
  operation_center_id: string | null;
  cost_center: string | null;
  area_id: string | null;
  position_id: string | null;
  position_name: string;
  work_city: string | null;
  hire_date: string;
  termination_date: string | null;
  link_type: LinkType;
  observations: string | null;
  is_current: boolean;
  valid_from: string;
  valid_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSocialSecurity {
  id: string;
  employee_id: string;
  risk_level: RiskLevel | null;
  arl: string | null;
  eps: string | null;
  afp: string | null;
  ccf: string | null;
  afc: string | null;
  ips: string | null;
  is_current: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeBankInfo {
  id: string;
  employee_id: string;
  bank_name: string | null;
  account_type: AccountType | null;
  account_number: string | null;
  bank_letter_url: string | null;
  account_registered: boolean | null;
  is_current: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  company_id: string;
  document_type: EmployeeDocumentType;
  document_name: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  upload_date: string;
  expiry_date: string | null;
  is_valid: boolean;
  observations: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeCertification {
  id: string;
  employee_id: string;
  certification_type: CertificationType;
  certification_name: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  license_category: string | null;
  document_url: string | null;
  applies_to_position: boolean | null;
  is_valid: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeVaccination {
  id: string;
  employee_id: string;
  vaccine_type: VaccineType;
  vaccine_name: string | null;
  dose_number: number;
  application_date: string;
  next_dose_date: string | null;
  document_url: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSchedule {
  id: string;
  employee_id: string;
  payroll_type: PayrollType;
  shift_type_id: string | null;
  is_office_schedule: boolean | null;
  rest_day: string | null;
  is_current: boolean;
  valid_from: string;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// COMPOSITE TYPES (for joined queries)
// =====================================================

export interface EmployeeV2WithRelations extends EmployeeV2 {
  contact?: EmployeeContact | null;
  family?: EmployeeFamily | null;
  work_info?: EmployeeWorkInfo | null;
  social_security?: EmployeeSocialSecurity | null;
  bank_info?: EmployeeBankInfo | null;
  schedule?: EmployeeSchedule | null;
  documents?: EmployeeDocument[];
  certifications?: EmployeeCertification[];
  vaccinations?: EmployeeVaccination[];
  // Joined tables
  operation_centers?: { id: string; name: string; city?: string | null } | null;
  areas?: { id: string; name: string } | null;
  positions?: { id: string; name: string } | null;
}

// Helper to get full name
export function getEmployeeFullName(employee: Pick<EmployeeV2, 'first_name' | 'middle_name' | 'last_name' | 'second_last_name'>): string {
  return [
    employee.first_name,
    employee.middle_name,
    employee.last_name,
    employee.second_last_name,
  ].filter(Boolean).join(' ');
}
