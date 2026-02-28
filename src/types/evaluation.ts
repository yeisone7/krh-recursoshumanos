export type EvaluationType = 'self' | 'manager' | 'peer' | '360';
export type EvaluationCycleStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type EvaluationStatus = 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'approved';

export interface RatingScaleItem {
  label: string;
  min: number;
  max: number;
  description: string;
}

export const DEFAULT_QUALITATIVE_QUESTIONS = [
  '¿Qué aportes ha hecho usted a la empresa, área o campo donde se desempeña?',
  '¿En qué aspectos opina usted que debe mejorar?',
  'Teniendo en cuenta los aspectos en donde la calificación no es muy buena, ¿Qué compromisos va a adquirir para mejorar?',
];

export const DEFAULT_RATING_SCALE: RatingScaleItem[] = [
  { label: 'Sobresaliente', min: 91, max: 100, description: 'Mantener el compromiso hasta ahora alcanzado' },
  { label: 'Bueno', min: 75, max: 90, description: 'Trabajar en mejora continua' },
  { label: 'Aceptable', min: 60, max: 74, description: 'Requiere capacitación continua' },
  { label: 'Deficiente', min: 0, max: 59, description: 'Requiere cumplimiento inmediato' },
];

export interface EvaluationTemplate {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean | null;
  position_id?: string | null;
  qualitative_questions?: string[] | null;
  rating_scale?: RatingScaleItem[] | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  criteria?: EvaluationCriteria[];
  position?: { id: string; name: string } | null;
}

export interface EvaluationCriteria {
  id: string;
  template_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  weight?: number | null;
  max_score?: number | null;
  sort_order?: number | null;
  level_4_description?: string | null;
  level_3_description?: string | null;
  level_2_description?: string | null;
  level_1_description?: string | null;
  created_at: string;
}

export interface EvaluationCycle {
  id: string;
  company_id: string;
  template_id?: string | null;
  name: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  self_evaluation_deadline?: string | null;
  manager_evaluation_deadline?: string | null;
  status: EvaluationCycleStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  template?: EvaluationTemplate | null;
}

export interface PerformanceEvaluation {
  id: string;
  cycle_id: string;
  employee_id: string;
  evaluator_id?: string | null;
  evaluation_type: EvaluationType;
  status: EvaluationStatus;
  overall_score?: number | null;
  overall_rating?: string | null;
  strengths?: string | null;
  areas_to_improve?: string | null;
  general_comments?: string | null;
  employee_comments?: string | null;
  development_plan?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
  cycle?: EvaluationCycle | null;
  scores?: EvaluationScore[];
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  criteria_id: string;
  score: number;
  comments?: string | null;
  created_at: string;
  criteria?: EvaluationCriteria | null;
}

export interface PerformanceGoal {
  id: string;
  employee_id: string;
  cycle_id?: string | null;
  title: string;
  description?: string | null;
  target_value?: string | null;
  achieved_value?: string | null;
  weight?: number | null;
  due_date?: string | null;
  status?: string | null;
  progress_percentage?: number | null;
  manager_feedback?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export const EVALUATION_TYPE_LABELS: Record<EvaluationType, string> = {
  self: 'Autoevaluación',
  manager: 'Evaluación del Jefe',
  peer: 'Evaluación de Pares',
  '360': 'Evaluación 360°',
};

export const CYCLE_STATUS_LABELS: Record<EvaluationCycleStatus, string> = {
  draft: 'Borrador',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  submitted: 'Enviada',
  reviewed: 'Revisada',
  approved: 'Aprobada',
};
