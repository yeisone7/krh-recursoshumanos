// Training Module Types - Matching database schema

export type TrainingModality = 'presencial' | 'virtual' | 'mixto';
export type TrainingStatus = 'programado' | 'en_curso' | 'completado' | 'cancelado';
export type AttendanceStatus = 'inscrito' | 'asistio' | 'no_asistio' | 'justificado';
export type CertificateStatus = 'emitido' | 'vigente' | 'vencido' | 'por_vencer';
export type CourseStatus = 'borrador' | 'publicado' | 'completado';
export type AccessType = 'solo_link' | 'link_cedula';
export type UsageType = 'unico' | 'multiple';
export type MediaType = 'imagen' | 'video' | 'documento' | 'infografia' | 'audio';

export interface TrainingCourseContent {
  introduccion?: string;
  objetivos?: string[];
  contenido?: string; // markdown
  puntosClave?: string[];
  evaluacion?: TrainingQuizQuestion[];
  isManual?: boolean;
}

export interface TrainingQuizQuestion {
  pregunta: string;
  respuestaCorrecta: string;
  opciones: string[];
}

export interface TrainingCourse {
  id: string;
  company_id: string;
  code: string | null;
  name: string;
  description: string | null;
  category: string;
  modality: TrainingModality;
  duration_hours: number;
  is_mandatory: boolean;
  requires_certification: boolean;
  validity_months: number | null;
  provider: string | null;
  objectives: string | null;
  content: TrainingCourseContent | null;
  target_audience: string | null;
  prerequisites: string | null;
  level: string;
  audience: string | null;
  objective: string | null;
  legal_framework: string | null;
  risk_level: string;
  language: string;
  status: CourseStatus;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  media_count?: number;
}

export interface TrainingSession {
  id: string;
  course_id: string;
  company_id: string;
  session_code: string | null;
  instructor_name: string | null;
  instructor_id: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  max_participants: number | null;
  status: TrainingStatus;
  observations: string | null;
  materials_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  course?: TrainingCourse;
}

export interface TrainingAttendance {
  id: string;
  session_id: string;
  employee_id: string;
  enrollment_date: string;
  attendance_status: AttendanceStatus;
  attendance_date: string | null;
  score: number | null;
  passed: boolean | null;
  observations: string | null;
  signature_data: string | null;
  enrolled_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
  session?: TrainingSession;
}

export interface TrainingCertificate {
  id: string;
  company_id: string;
  employee_id: string;
  course_id: string;
  session_id: string | null;
  certificate_number: string;
  issue_date: string;
  expiry_date: string | null;
  status: CertificateStatus;
  certificate_url: string | null;
  issued_by: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
  course?: TrainingCourse;
}

export interface TrainingAccessToken {
  id: string;
  company_id: string;
  course_id: string;
  token: string;
  access_type: AccessType;
  usage_type: UsageType;
  max_uses: number | null;
  uses_count: number;
  expires_at: string;
  is_active: boolean;
  requires_evaluation: boolean;
  created_by: string;
  created_at: string;
  operation_center_id: string | null;
  course?: TrainingCourse;
  center?: { id: string; name: string; code: string | null };
}

export interface TrainingCompletion {
  id: string;
  company_id: string;
  course_id: string;
  token_id: string | null;
  employee_id: string | null;
  completed_at: string;
  operator_name: string;
  operator_cedula: string | null;
  signature_data: string;
  quiz_score: number | null;
  ip_address: string | null;
  user_agent: string | null;
  course?: TrainingCourse;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
    employee_work_info?: Array<{
      id: string;
      employee_id: string;
      position_name: string | null;
      is_current: boolean | null;
    }>;
  } | null;
}

export interface TrainingMedia {
  id: string;
  course_id: string;
  type: MediaType;
  title: string;
  description: string | null;
  file_url: string;
  file_size: number | null;
  duration: number | null;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
}

export interface TrainingPlan {
  id: string;
  company_id: string;
  year: number;
  name: string;
  description: string | null;
  budget: number | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: TrainingPlanItem[];
}

export interface TrainingPlanItem {
  id: string;
  plan_id: string;
  course_id: string;
  scheduled_month: number | null;
  target_participants: number | null;
  estimated_cost: number | null;
  priority: string | null;
  target_areas: string[] | null;
  observations: string | null;
  is_completed: boolean;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  course?: TrainingCourse;
}

// Form data types
export interface CreateCourseData {
  name: string;
  code?: string;
  category: string;
  description?: string;
  modality: TrainingModality;
  durationHours: number;
  isMandatory: boolean;
  requiresCertification: boolean;
  validityMonths?: number;
  provider?: string;
  objectives?: string;
  prerequisites?: string;
  level?: string;
  audience?: string;
  objective?: string;
  legalFramework?: string;
  riskLevel?: string;
  language?: string;
}

export interface CreateSessionData {
  courseId: string;
  instructorName?: string;
  startDate: Date;
  endDate: Date;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxParticipants?: number;
  observations?: string;
}

export interface EnrollEmployeeData {
  sessionId: string;
  employeeId: string;
}

export interface RecordAttendanceData {
  attendanceId: string;
  status: AttendanceStatus;
  score?: number;
  passed?: boolean;
  observations?: string;
}
