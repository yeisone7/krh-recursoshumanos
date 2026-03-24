export interface EmployeeUserLink {
  id: string;
  employee_id: string;
  user_id: string;
  linked_at: string;
  linked_by: string | null;
  is_active: boolean;
}

export interface EmployeeChangeRequest {
  id: string;
  employee_id: string;
  company_id: string;
  requested_by: string;
  request_type: string;
  field_name: string;
  current_value: string | null;
  requested_value: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const requestTypeLabels: Record<string, string> = {
  contact: 'Datos de Contacto',
  family: 'Información Familiar',
  emergency_contact: 'Contacto de Emergencia',
  bank_info: 'Información Bancaria',
  social_security: 'Seguridad Social',
};

export const fieldLabels: Record<string, string> = {
  // Contact
  residence_department: 'Departamento de Residencia',
  residence_city: 'Ciudad de Residencia',
  residence_address: 'Dirección',
  residence_neighborhood: 'Barrio, Vereda u otro.',
  phone: 'Teléfono Fijo',
  mobile: 'Celular',
  personal_email: 'Correo Personal',
  // Emergency contact
  emergency_contact_name: 'Nombre Contacto Emergencia',
  emergency_contact_phone: 'Teléfono Contacto Emergencia',
  emergency_contact_relationship: 'Parentesco Contacto Emergencia',
  // Family
  spouse_name: 'Nombre del Cónyuge',
  spouse_birth_date: 'Fecha Nacimiento Cónyuge',
  children_count: 'Número de Hijos',
  // Bank
  bank_name: 'Banco',
  account_type: 'Tipo de Cuenta',
  account_number: 'Número de Cuenta',
  // Social Security
  eps: 'EPS',
  afp: 'Fondo de Pensiones',
  afc: 'Fondo de Cesantías',
  ccf: 'Caja de Compensación',
};

export const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const statusColors: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
};
