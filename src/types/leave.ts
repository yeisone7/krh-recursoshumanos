// Leave Types
export type LeaveType =
  | 'calamidad_domestica'
  | 'cita_medica'
  | 'licencia_maternidad'
  | 'licencia_paternidad'
  | 'licencia_luto'
  | 'permiso_sindical'
  | 'permiso_estudio'
  | 'permiso_personal'
  | 'licencia_no_remunerada'
  | 'otro';

export type LeaveRequestStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

export type LeaveDurationType = 'dias_completos' | 'medio_dia' | 'horas';

// Leave Type Labels
export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  calamidad_domestica: 'Calamidad Doméstica',
  cita_medica: 'Cita Médica',
  licencia_maternidad: 'Licencia de Maternidad',
  licencia_paternidad: 'Licencia de Paternidad',
  licencia_luto: 'Licencia de Luto',
  permiso_sindical: 'Permiso Sindical',
  permiso_estudio: 'Permiso de Estudio',
  permiso_personal: 'Permiso Personal',
  licencia_no_remunerada: 'Licencia No Remunerada',
  otro: 'Otro Permiso',
};

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export const LEAVE_DURATION_TYPE_LABELS: Record<LeaveDurationType, string> = {
  dias_completos: 'Días Completos',
  medio_dia: 'Medio Día',
  horas: 'Horas',
};

// Leave Type Config
export interface LeaveTypeConfig {
  id: string;
  company_id: string;
  leave_type: LeaveType;
  display_name: string;
  description?: string;
  max_days_per_year?: number;
  is_paid: boolean;
  requires_document: boolean;
  document_description?: string;
  min_days_advance: number;
  allows_half_day: boolean;
  allows_hours: boolean;
  is_active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

// Leave Balance
export interface LeaveBalance {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type: LeaveType;
  year: number;
  entitled_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  created_at: string;
  updated_at: string;
  // Joined data
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

// Leave Request
export interface LeaveRequest {
  id: string;
  employee_id: string;
  company_id: string;
  leave_type: LeaveType;
  duration_type: LeaveDurationType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  total_days: number;
  total_hours?: number;
  reason: string;
  document_url?: string;
  document_name?: string;
  status: LeaveRequestStatus;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  review_notes?: string;
  rejection_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
  leave_type_config?: LeaveTypeConfig;
}

// Form Data Types
export interface LeaveRequestFormData {
  employee_id: string;
  leave_type: LeaveType;
  duration_type: LeaveDurationType;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason: string;
  document_url?: string;
  document_name?: string;
}

export interface LeaveTypeConfigFormData {
  leave_type: LeaveType;
  display_name: string;
  description?: string;
  max_days_per_year?: number;
  is_paid: boolean;
  requires_document: boolean;
  document_description?: string;
  min_days_advance: number;
  allows_half_day: boolean;
  allows_hours: boolean;
  is_active: boolean;
  color: string;
}

// Calendar Event for Leaves
export interface LeaveCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: LeaveType;
  status: LeaveRequestStatus;
  employeeName: string;
  color: string;
}
