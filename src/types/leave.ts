// Leave Types
export type DefaultLeaveType =
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

export type LeaveType = string;

export type LeaveRequestStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';

export type LeaveApprovalStage = 'pending_manager' | 'pending_area_leader' | 'approved' | 'rejected';

export type LeaveDurationType = 'dias_completos' | 'medio_dia' | 'horas';

// Leave Type Labels
export const LEAVE_TYPE_LABELS: Record<DefaultLeaveType, string> = {
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

export function getLeaveTypeLabel(
  leaveType: LeaveType,
  configs?: Array<Pick<LeaveTypeConfig, 'leave_type' | 'display_name'>>,
): string {
  const configuredLabel = configs?.find((config) => config.leave_type === leaveType)?.display_name;
  if (configuredLabel) return configuredLabel;
  if (leaveType in LEAVE_TYPE_LABELS) return LEAVE_TYPE_LABELS[leaveType as DefaultLeaveType];

  return leaveType
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function createLeaveTypeKey(displayName: string): string {
  return displayName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  cancelado: 'Cancelado',
};

export const LEAVE_APPROVAL_STAGE_LABELS: Record<LeaveApprovalStage, string> = {
  pending_manager: 'Pendiente de jefe inmediato',
  pending_area_leader: 'Pendiente de líder de área',
  approved: 'Flujo aprobado',
  rejected: 'Flujo cerrado',
};

export const LEAVE_DURATION_TYPE_LABELS: Record<LeaveDurationType, string> = {
  dias_completos: 'Días Completos',
  medio_dia: 'Medio Día',
  horas: 'Horas',
};

export function getAllowedLeaveDurations(
  config?: Pick<LeaveTypeConfig, 'allows_half_day' | 'allows_hours'> | null,
): LeaveDurationType[] {
  return [
    'dias_completos',
    ...(config?.allows_half_day ? ['medio_dia' as const] : []),
    ...(config?.allows_hours ? ['horas' as const] : []),
  ];
}

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
  approval_stage: LeaveApprovalStage;
  manager_approved: boolean | null;
  manager_approved_by: string | null;
  manager_approved_at: string | null;
  manager_approver_name: string | null;
  manager_observations: string | null;
  area_leader_approved: boolean | null;
  area_leader_approved_by: string | null;
  area_leader_approved_at: string | null;
  area_leader_approver_name: string | null;
  area_leader_observations: string | null;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_name?: string;
  review_notes?: string;
  rejection_reason?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  annulled_as_unused?: boolean;
  unused_reason?: string;
  created_by?: string;
  submission_source: 'internal' | 'employee_portal' | 'public_link';
  public_reference?: string | null;
  public_access_token_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
    avatar_url?: string | null;
    employee_work_info?: Array<{
      operation_center_id: string | null;
      is_current: boolean;
      operation_centers?: {
        id: string;
        name: string;
      } | null;
    }>;
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
