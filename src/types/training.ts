// Training Module Types - Matching database schema

export type TrainingModality = 'presencial' | 'virtual' | 'mixto';
export type TrainingStatus = 'programado' | 'en_curso' | 'completado' | 'cancelado';
export type AttendanceStatus = 'inscrito' | 'asistio' | 'no_asistio' | 'justificado';
export type CertificateStatus = 'emitido' | 'vigente' | 'vencido';

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
  content: string | null;
  target_audience: string | null;
  prerequisites: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
  // Joined data
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
  enrolled_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
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
  // Joined data
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
  course?: TrainingCourse;
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
