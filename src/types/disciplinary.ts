import { z } from 'zod';

// Enums
export type FaultType = 'leve' | 'grave' | 'gravisima';

export type DisciplinaryStatus = 
  | 'apertura'
  | 'investigacion'
  | 'citacion_descargos'
  | 'descargos'
  | 'analisis'
  | 'decision'
  | 'apelacion'
  | 'cerrado';

export type SanctionType = 
  | 'amonestacion_verbal'
  | 'amonestacion_escrita'
  | 'suspension_1_3_dias'
  | 'suspension_4_8_dias'
  | 'terminacion_justa_causa'
  | 'sin_sancion';

// Labels for UI
export const faultTypeLabels: Record<FaultType, string> = {
  leve: 'Leve',
  grave: 'Grave',
  gravisima: 'Gravísima',
};

export const disciplinaryStatusLabels: Record<DisciplinaryStatus, string> = {
  apertura: 'Apertura',
  investigacion: 'Investigación',
  citacion_descargos: 'Citación a Descargos',
  descargos: 'Descargos',
  analisis: 'Análisis',
  decision: 'Decisión',
  apelacion: 'Apelación',
  cerrado: 'Cerrado',
};

export const sanctionTypeLabels: Record<SanctionType, string> = {
  amonestacion_verbal: 'Amonestación Verbal',
  amonestacion_escrita: 'Amonestación Escrita',
  suspension_1_3_dias: 'Suspensión 1-3 días',
  suspension_4_8_dias: 'Suspensión 4-8 días',
  terminacion_justa_causa: 'Terminación con Justa Causa',
  sin_sancion: 'Sin Sanción',
};

// Status flow for workflow
export const statusFlow: DisciplinaryStatus[] = [
  'apertura',
  'investigacion',
  'citacion_descargos',
  'descargos',
  'analisis',
  'decision',
  'apelacion',
  'cerrado',
];

// Types
export interface DisciplinaryProcess {
  id: string;
  company_id: string;
  employee_id: string;
  case_number: string;
  status: DisciplinaryStatus;
  fault_type: FaultType;
  fault_date: string;
  facts_description: string;
  article_violated: string | null;
  witnesses: string | null;
  opening_date: string;
  notification_date: string | null;
  hearing_date: string | null;
  decision_date: string | null;
  closing_date: string | null;
  sanction_type: SanctionType | null;
  sanction_days: number | null;
  sanction_start_date: string | null;
  sanction_end_date: string | null;
  decision_summary: string | null;
  has_appeal: boolean;
  appeal_date: string | null;
  appeal_resolution: string | null;
  appeal_decision_date: string | null;
  investigator_name: string | null;
  investigator_id: string | null;
  decision_maker_name: string | null;
  decision_maker_id: string | null;
  opening_document_url: string | null;
  notification_document_url: string | null;
  hearing_document_url: string | null;
  decision_document_url: string | null;
  appeal_document_url: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryProcessWithEmployee extends DisciplinaryProcess {
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  } | null;
  operation_center_name?: string | null;
  evidence?: DisciplinaryEvidence[];
  timeline?: DisciplinaryTimeline[];
  defenses?: DisciplinaryDefense[];
}

export interface DisciplinaryEvidence {
  id: string;
  process_id: string;
  evidence_type: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
  collected_date: string;
  collected_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryTimeline {
  id: string;
  process_id: string;
  action_type: string;
  action_date: string;
  previous_status: DisciplinaryStatus | null;
  new_status: DisciplinaryStatus | null;
  description: string;
  performed_by: string | null;
  performed_by_name: string | null;
  document_url: string | null;
  created_at: string;
}

export interface DisciplinaryDefense {
  id: string;
  process_id: string;
  defense_date: string;
  defense_type: string;
  content: string;
  received_by: string | null;
  received_by_id: string | null;
  document_url: string | null;
  submitted_via_token: boolean;
  created_at: string;
  updated_at: string;
}

export interface DisciplinaryDefenseToken {
  id: string;
  process_id: string;
  company_id: string;
  token: string;
  employee_id: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

// Form schemas
export const disciplinaryFormSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  fault_type: z.enum(['leve', 'grave', 'gravisima'] as const),
  fault_date: z.date(),
  facts_description: z.string().min(10, 'Describa los hechos detalladamente'),
  article_violated: z.string().optional(),
  witnesses: z.string().optional(),
  investigator_name: z.string().optional(),
  observations: z.string().optional(),
});

export type DisciplinaryFormData = z.infer<typeof disciplinaryFormSchema>;

export const evidenceFormSchema = z.object({
  evidence_type: z.string().min(1, 'Seleccione un tipo'),
  description: z.string().min(5, 'Describa la evidencia'),
  collected_date: z.date(),
  collected_by: z.string().optional(),
});

export type EvidenceFormData = z.infer<typeof evidenceFormSchema>;

export const defenseFormSchema = z.object({
  defense_date: z.date(),
  defense_type: z.enum(['escrito', 'oral'] as const),
  content: z.string().min(10, 'Ingrese el contenido de los descargos'),
  received_by: z.string().optional(),
});

export type DefenseFormData = z.infer<typeof defenseFormSchema>;

// Helper functions
export function getStatusColor(status: DisciplinaryStatus): string {
  const colors: Record<DisciplinaryStatus, string> = {
    apertura: 'bg-blue-100 text-blue-800',
    investigacion: 'bg-yellow-100 text-yellow-800',
    citacion_descargos: 'bg-orange-100 text-orange-800',
    descargos: 'bg-purple-100 text-purple-800',
    analisis: 'bg-indigo-100 text-indigo-800',
    decision: 'bg-pink-100 text-pink-800',
    apelacion: 'bg-red-100 text-red-800',
    cerrado: 'bg-green-100 text-green-800',
  };
  return colors[status];
}

export function getFaultColor(fault: FaultType): string {
  const colors: Record<FaultType, string> = {
    leve: 'bg-yellow-100 text-yellow-800',
    grave: 'bg-orange-100 text-orange-800',
    gravisima: 'bg-red-100 text-red-800',
  };
  return colors[fault];
}

export function canAdvanceStatus(currentStatus: DisciplinaryStatus): DisciplinaryStatus | null {
  const currentIndex = statusFlow.indexOf(currentStatus);
  if (currentIndex < statusFlow.length - 1) {
    return statusFlow[currentIndex + 1];
  }
  return null;
}

export function getNextStatusAction(status: DisciplinaryStatus): string {
  const actions: Record<DisciplinaryStatus, string> = {
    apertura: 'Iniciar Investigación',
    investigacion: 'Citar a Descargos',
    citacion_descargos: 'Registrar Descargos',
    descargos: 'Iniciar Análisis',
    analisis: 'Tomar Decisión',
    decision: 'Registrar Apelación',
    apelacion: 'Cerrar Proceso',
    cerrado: '',
  };
  return actions[status];
}
