import { z } from 'zod';

// Employee Status
export type EmployeeStatus = 'active' | 'suspended' | 'retired' | 'en_retiro';

// Document Type
export type DocumentType = 'CC' | 'CE' | 'TI' | 'PA' | 'PEP';

// Gender
export type Gender = 'M' | 'F' | 'O';

// Blood Type
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

// Contract Type
export type ContractType = 'indefinido' | 'fijo' | 'obra_labor' | 'aprendizaje' | 'servicios';

// Shift Type
export type ShiftType = 'oficina' | 'turnos';

// Marital Status
export type MaritalStatus = 'soltero' | 'casado' | 'union_libre' | 'divorciado' | 'viudo';

// Education Level
export type EducationLevel = 'primaria' | 'bachillerato' | 'tecnico' | 'tecnologo' | 'profesional' | 'especializacion' | 'maestria' | 'doctorado';

// Employee Schema for validation
export const employeeFormSchema = z.object({
  // === Datos Personales ===
  documentType: z.enum(['CC', 'CE', 'TI', 'PA', 'PEP'], {
    required_error: 'Seleccione el tipo de documento',
  }),
  documentNumber: z.string().min(5, 'El documento debe tener al menos 5 caracteres').max(20, 'El documento no puede exceder 20 caracteres'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede exceder 50 caracteres'),
  middleName: z.string().max(50, 'El segundo nombre no puede exceder 50 caracteres').optional(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'El apellido no puede exceder 50 caracteres'),
  secondLastName: z.string().max(50, 'El segundo apellido no puede exceder 50 caracteres').optional(),
  birthDate: z.date({
    required_error: 'Seleccione la fecha de nacimiento',
  }),
  birthPlace: z.string().min(2, 'El lugar de nacimiento es requerido').max(100),
  gender: z.enum(['M', 'F', 'O'], {
    required_error: 'Seleccione el género',
  }),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  maritalStatus: z.enum(['soltero', 'casado', 'union_libre', 'divorciado', 'viudo'], {
    required_error: 'Seleccione el estado civil',
  }),
  nationality: z.string().min(2, 'La nacionalidad es requerida').max(50).default('Colombiana'),
  
  // === Datos de Contacto ===
  email: z.string().email('Ingrese un correo electrónico válido'),
  personalEmail: z.string().email('Ingrese un correo electrónico válido').optional().or(z.literal('')),
  phone: z.string().min(7, 'El teléfono debe tener al menos 7 dígitos').max(15),
  mobilePhone: z.string().min(10, 'El celular debe tener al menos 10 dígitos').max(15),
  address: z.string().min(5, 'La dirección es requerida').max(200),
  city: z.string().min(2, 'La ciudad es requerida').max(100),
  department: z.string().min(2, 'El departamento es requerido').max(100),
  neighborhood: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  
  // === Contacto de Emergencia ===
  emergencyContactName: z.string().min(2, 'El nombre del contacto es requerido').max(100),
  emergencyContactPhone: z.string().min(10, 'El teléfono del contacto es requerido').max(15),
  emergencyContactRelationship: z.string().min(2, 'La relación es requerida').max(50),
  
  // === Datos Laborales ===
  operationCenter: z.string({
    required_error: 'Seleccione el centro de operación',
  }),
  area: z.string().min(2, 'El área es requerida').max(100),
  position: z.string().min(2, 'El cargo es requerido').max(100),
  directSupervisor: z.string().max(100).optional(),
  contractType: z.enum(['indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'servicios'], {
    required_error: 'Seleccione el tipo de contrato',
  }),
  shiftType: z.enum(['oficina', 'turnos'], {
    required_error: 'Seleccione el tipo de jornada',
  }),
  startDate: z.date({
    required_error: 'Seleccione la fecha de ingreso',
  }),
  salary: z.string().min(1, 'El salario es requerido'),
  bankName: z.string().max(100).optional(),
  bankAccountType: z.enum(['ahorros', 'corriente']).optional(),
  bankAccountNumber: z.string().max(30).optional(),
  
  // === Información Adicional ===
  educationLevel: z.enum(['primaria', 'bachillerato', 'tecnico', 'tecnologo', 'profesional', 'especializacion', 'maestria', 'doctorado']).optional(),
  profession: z.string().max(100).optional(),
  hasChildren: z.boolean().default(false),
  numberOfChildren: z.number().min(0).max(20).optional(),
  hasVehicle: z.boolean().default(false),
  vehiclePlate: z.string().max(10).optional(),
  shirtSize: z.string().max(10).optional(),
  pantsSize: z.string().max(10).optional(),
  shoeSize: z.string().max(10).optional(),
  
  // === Estado ===
  status: z.enum(['active', 'suspended', 'retired', 'en_retiro']).default('active'),
  
  // === Observaciones ===
  observations: z.string().max(1000).optional(),
});

export type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// Full Employee type with ID
export interface Employee extends EmployeeFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string;
}

// Status configuration
export const statusConfig = {
  active: { label: 'Activo', class: 'bg-success-light text-success border-success/20' },
  suspended: { label: 'Suspendido', class: 'bg-warning-light text-warning-foreground border-warning/20' },
  en_retiro: { label: 'En Retiro', class: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
  retired: { label: 'Retirado', class: 'bg-muted text-muted-foreground border-border' },
};

// Document type labels
export const documentTypeLabels: Record<DocumentType, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  TI: 'Tarjeta de Identidad',
  PA: 'Pasaporte',
  PEP: 'PEP',
};

// Contract type labels
export const contractTypeLabels: Record<ContractType, string> = {
  indefinido: 'Indefinido',
  fijo: 'Término Fijo',
  obra_labor: 'Obra o Labor',
  aprendizaje: 'Aprendizaje',
  servicios: 'Prestación de Servicios',
};

// Shift type labels
export const shiftTypeLabels: Record<ShiftType, string> = {
  oficina: 'Horario de Oficina',
  turnos: 'Turnos Rotativos',
};

// Education level labels
export const educationLevelLabels: Record<EducationLevel, string> = {
  primaria: 'Primaria',
  bachillerato: 'Bachillerato',
  tecnico: 'Técnico',
  tecnologo: 'Tecnólogo',
  profesional: 'Profesional',
  especializacion: 'Especialización',
  maestria: 'Maestría',
  doctorado: 'Doctorado',
};

// Marital status labels
export const maritalStatusLabels: Record<MaritalStatus, string> = {
  soltero: 'Soltero(a)',
  casado: 'Casado(a)',
  union_libre: 'Unión Libre',
  divorciado: 'Divorciado(a)',
  viudo: 'Viudo(a)',
};
