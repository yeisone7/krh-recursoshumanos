import { z } from 'zod';

// Vacancy Status
export type VacancyStatus = 'open' | 'in_process' | 'closed' | 'cancelled';

// Vacancy Type
export type VacancyType = 'internal' | 'external' | 'both';

// Vacancy Reason
export type VacancyReason = 'new_position' | 'replacement' | 'growth' | 'temporary' | 'other';

// Candidate Status
export type CandidateStatus =
  | 'applied'
  | 'in_interview'
  | 'in_psycho_test'
  | 'in_technical_test'
  | 'in_validation'
  | 'in_medical'
  | 'selected'
  | 'not_selected'
  | 'withdrawn'
  | 'hired';

// Selection Step Type
export type SelectionStepType =
  | 'prefiltro'
  | 'entrevista_seleccion'
  | 'entrevista_jefe'
  | 'validacion_antecedentes'
  | 'pruebas_psicotecnicas'
  | 'pruebas_conocimiento'
  | 'validacion_academica'
  | 'validacion_referencias'
  | 'examenes_medicos';

// Selection Step Status
export type SelectionStepStatus = 'pending' | 'scheduled' | 'completed' | 'passed' | 'failed' | 'skipped' | 'not_applicable';

// Labels
export const vacancyStatusLabels: Record<VacancyStatus, string> = {
  open: 'Abierta',
  in_process: 'En Proceso',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
};

export const vacancyTypeLabels: Record<VacancyType, string> = {
  internal: 'Interna',
  external: 'Externa',
  both: 'Mixta',
};

export const vacancyReasonLabels: Record<VacancyReason, string> = {
  new_position: 'Nueva posición',
  replacement: 'Reemplazo',
  growth: 'Crecimiento',
  temporary: 'Temporal',
  other: 'Otro',
};

export const candidateStatusLabels: Record<CandidateStatus, string> = {
  applied: 'Postulado',
  in_interview: 'En Entrevista',
  in_psycho_test: 'Prueba Psicotécnica',
  in_technical_test: 'Prueba Técnica',
  in_validation: 'En Validación',
  in_medical: 'Examen Médico',
  selected: 'Seleccionado',
  not_selected: 'No Seleccionado',
  withdrawn: 'Retirado',
  hired: 'Contratado',
};

export const selectionStepTypeLabels: Record<SelectionStepType, string> = {
  prefiltro: 'Prefiltro',
  entrevista_seleccion: 'Entrevista de Selección',
  entrevista_jefe: 'Entrevista Jefe Inmediato',
  validacion_antecedentes: 'Validación de Antecedentes',
  pruebas_psicotecnicas: 'Pruebas Psicotécnicas',
  pruebas_conocimiento: 'Pruebas de Conocimiento',
  validacion_academica: 'Validación Académica',
  validacion_referencias: 'Validación de Referencias Laborales',
  examenes_medicos: 'Exámenes Médicos',
};

export const selectionStepStatusLabels: Record<SelectionStepStatus, string> = {
  pending: 'Pendiente',
  scheduled: 'Programado',
  completed: 'Completado',
  passed: 'Aprobado',
  failed: 'No Aprobado',
  skipped: 'Omitido',
  not_applicable: 'No Aplica',
};

// Define which steps support "No Aplica"
export const stepsWithNotApplicable: SelectionStepType[] = [
  'entrevista_jefe',
  'pruebas_conocimiento',
  'validacion_academica',
  'validacion_referencias',
];

// Define which steps have a score/calificación field
export const stepsWithScore: SelectionStepType[] = ['pruebas_conocimiento'];

// Define which steps use concepto (apto/no apto) instead of aprobó/no aprobó
export const stepsWithConcepto: SelectionStepType[] = ['examenes_medicos'];

// Status styling
export const vacancyStatusConfig: Record<VacancyStatus, { bg: string; text: string; border: string }> = {
  open: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  in_process: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  closed: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

export const candidateStatusConfig: Record<CandidateStatus, { bg: string; text: string }> = {
  applied: { bg: 'bg-muted', text: 'text-muted-foreground' },
  in_interview: { bg: 'bg-primary/10', text: 'text-primary' },
  in_psycho_test: { bg: 'bg-accent/10', text: 'text-accent-foreground' },
  in_technical_test: { bg: 'bg-accent/10', text: 'text-accent-foreground' },
  in_validation: { bg: 'bg-warning/10', text: 'text-warning' },
  in_medical: { bg: 'bg-info/10', text: 'text-info' },
  selected: { bg: 'bg-success/10', text: 'text-success' },
  not_selected: { bg: 'bg-destructive/10', text: 'text-destructive' },
  withdrawn: { bg: 'bg-muted', text: 'text-muted-foreground' },
  hired: { bg: 'bg-success/10', text: 'text-success' },
};

// Form schemas
export const vacancyFormSchema = z.object({
  requisitionId: z.string().min(1, 'Debe seleccionar una requisición aprobada'),
  operationCenterId: z.string().optional(),
  positionId: z.string().optional(),
  positionTitle: z.string().min(2, 'El título del cargo es requerido'),
  departmentArea: z.string().optional(),
  shiftType: z.string().default('oficina'),
  positionsCount: z.number().min(1).default(1),
  vacancyType: z.enum(['internal', 'external', 'both']).default('external'),
  vacancyReason: z.enum(['new_position', 'replacement', 'growth', 'temporary', 'other']).default('new_position'),
  reasonDetails: z.string().optional(),
  salaryRangeMin: z.string().optional(),
  salaryRangeMax: z.string().optional(),
  includesTransport: z.boolean().default(true),
  otherBenefits: z.string().optional(),
  jobDescription: z.string().optional(),
  requirements: z.string().optional(),
  experienceYears: z.number().min(0).default(0),
  educationLevel: z.string().optional(),
  openDate: z.date().default(() => new Date()),
  targetCloseDate: z.date().optional(),
  publicationPlatforms: z.array(z.string()).default([]),
  priority: z.string().default('normal'),
  observations: z.string().optional(),
});

export type VacancyFormData = z.infer<typeof vacancyFormSchema>;

export const candidateFormSchema = z.object({
  vacancyId: z.string().min(1, 'La vacante es requerida'),
  firstName: z.string().min(2, 'El nombre es requerido'),
  lastName: z.string().min(2, 'El apellido es requerido'),
  documentType: z.string().default('CC'),
  documentNumber: z.string().min(5, 'El documento es requerido'),
  documentIssueDate: z.date().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  birthDate: z.date().optional(),
  gender: z.string().optional(),
  genderIdentity: z.string().optional(),
  genderIdentityOther: z.string().optional(),
  educationLevel: z.string().optional(),
  profession: z.string().optional(),
  experienceYears: z.number().min(0).default(0),
  currentCompany: z.string().optional(),
  currentPosition: z.string().optional(),
  salaryExpectation: z.string().optional(),
  source: z.string().optional(),
  generalNotes: z.string().optional(),
});

export type CandidateFormData = z.infer<typeof candidateFormSchema>;

// Utility functions
export function getVacancyCandidateCount(candidates: { vacancy_id: string }[], vacancyId: string): number {
  return candidates.filter(c => c.vacancy_id === vacancyId).length;
}

export function getActiveVacanciesCount(vacancies: { status: VacancyStatus }[]): number {
  return vacancies.filter(v => v.status === 'open' || v.status === 'in_process').length;
}
