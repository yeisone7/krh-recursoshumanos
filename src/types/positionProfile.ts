export interface PositionProfile {
  id: string;
  company_id: string;
  position_id: string;
  version: number;
  is_current: boolean;
  purpose: string | null;
  reports_to: string | null;
  supervises: string | null;
  num_positions: number | null;
  education_level: string | null;
  education_detail: string | null;
  experience: string | null;
  specific_knowledge: SpecificKnowledge[];
  skills: Skill[];
  functions: string[];
  responsibilities: Responsibilities;
  working_conditions: WorkingConditions;
  elaborated_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  effective_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SpecificKnowledge {
  topic: string;
  level: 'básico' | 'intermedio' | 'avanzado';
}

export interface Skill {
  name: string;
  level: 'bajo' | 'medio' | 'alto';
}

export interface Responsibilities {
  equipment?: string;
  materials?: string;
  money?: string;
  information?: string;
  internal_relationships?: string;
  external_relationships?: string;
}

export interface WorkingConditions {
  physical_effort?: string;
  mental_effort?: string;
  work_environment?: string;
  risks?: string;
}

export interface PositionProfileFormData {
  purpose: string;
  reports_to: string;
  supervises: string;
  num_positions: number;
  education_level: string;
  education_detail: string;
  experience: string;
  specific_knowledge: SpecificKnowledge[];
  skills: Skill[];
  functions: string[];
  responsibilities: Responsibilities;
  working_conditions: WorkingConditions;
  elaborated_by: string;
  reviewed_by: string;
  approved_by: string;
  effective_date: string;
}

export interface PositionProfileAnnex {
  id: string;
  company_id: string;
  profile_id: string;
  operation_center_id: string;
  purpose: string | null;
  reports_to: string | null;
  supervises: string | null;
  num_positions: number | null;
  education_level: string | null;
  education_detail: string | null;
  experience: string | null;
  specific_knowledge: SpecificKnowledge[] | null;
  skills: Skill[] | null;
  functions: string[] | null;
  responsibilities: Responsibilities | null;
  working_conditions: WorkingConditions | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  operation_centers?: { id: string; name: string };
}

export interface PositionProfileAnnexFormData {
  operation_center_id: string;
  purpose: string | null;
  reports_to: string | null;
  supervises: string | null;
  num_positions: number | null;
  education_level: string | null;
  education_detail: string | null;
  experience: string | null;
  specific_knowledge: SpecificKnowledge[] | null;
  skills: Skill[] | null;
  functions: string[] | null;
  responsibilities: Responsibilities | null;
  working_conditions: WorkingConditions | null;
  notes: string | null;
}
