import { z } from 'zod';

export type ExamType = 'ingreso' | 'periodico' | 'egreso' | 'reintegro' | 'post_incapacidad' | 'cambio_cargo' | 'seguimiento';
export type ExamResult = 'apto' | 'apto_restricciones' | 'no_apto' | 'pendiente';
export type ExamStatus = 'vigente' | 'por_vencer' | 'vencido' | 'no_aplica';

export interface MedicalExam {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  examType: ExamType;
  examDate: Date;
  expirationDate: Date | null;
  result: ExamResult;
  concept: string;
  restrictions?: string;
  provider: string;
  doctorName: string;
  documentUrl?: string;
  observations?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MedicalExamAlert {
  id: string;
  examId: string;
  employeeId: string;
  employeeName: string;
  examType: ExamType;
  expirationDate: Date;
  daysRemaining: number;
  level: 'info' | 'warning' | 'critical';
}

// Vigencia de exámenes periódicos en meses (normativa colombiana)
export const PERIODIC_EXAM_VALIDITY_MONTHS = 12;

export const examTypeLabels: Record<ExamType, string> = {
  ingreso: 'Ingreso',
  periodico: 'Periódico',
  egreso: 'Egreso',
  reintegro: 'Reintegro',
  post_incapacidad: 'Post incapacidad',
  cambio_cargo: 'Cambio de cargo',
  seguimiento: 'Seguimiento',
};

export const examResultLabels: Record<ExamResult, string> = {
  apto: 'Apto',
  apto_restricciones: 'Apto con Recomendaciones',
  no_apto: 'No Apto',
  pendiente: 'Pendiente',
};

export const examResultConfig: Record<ExamResult, { bg: string; text: string; border: string }> = {
  apto: {
    bg: 'bg-success-light',
    text: 'text-success',
    border: 'border-success/20',
  },
  apto_restricciones: {
    bg: 'bg-warning-light',
    text: 'text-warning-foreground',
    border: 'border-warning/20',
  },
  no_apto: {
    bg: 'bg-destructive-light',
    text: 'text-destructive',
    border: 'border-destructive/20',
  },
  pendiente: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
};

export const examStatusConfig: Record<ExamStatus, { label: string; bg: string; text: string }> = {
  vigente: {
    label: 'Vigente',
    bg: 'bg-success-light',
    text: 'text-success',
  },
  por_vencer: {
    label: 'Por Vencer',
    bg: 'bg-warning-light',
    text: 'text-warning-foreground',
  },
  vencido: {
    label: 'Vencido',
    bg: 'bg-destructive-light',
    text: 'text-destructive',
  },
  no_aplica: {
    label: 'N/A',
    bg: 'bg-muted',
    text: 'text-muted-foreground',
  },
};

export const medicalExamFormSchema = z.object({
  employeeId: z.string().min(1, 'El empleado es requerido'),
  examType: z.enum(['ingreso', 'periodico', 'egreso', 'reintegro', 'post_incapacidad', 'cambio_cargo', 'seguimiento'], {
    required_error: 'El tipo de examen es requerido',
  }),
  examDate: z.date({
    required_error: 'La fecha del examen es requerida',
  }),
  result: z.enum(['apto', 'apto_restricciones', 'no_apto', 'pendiente'], {
    required_error: 'El resultado es requerido',
  }),
  concept: z.string().min(1, 'El concepto médico es requerido'),
  restrictions: z.string().optional(),
  provider: z.string().min(1, 'El proveedor/IPS es requerido'),
  doctorName: z.string().min(1, 'El nombre del médico es requerido'),
  orderType: z.string().optional(),
  observations: z.string().optional(),
});

export type MedicalExamFormData = z.infer<typeof medicalExamFormSchema>;

export function calculateExpirationDate(examDate: Date, examType: ExamType): Date | null {
  if (examType === 'egreso') {
    return null; // Exámenes de egreso no tienen vigencia
  }
  
  const expiration = new Date(examDate);
  expiration.setMonth(expiration.getMonth() + PERIODIC_EXAM_VALIDITY_MONTHS);
  return expiration;
}

export function calculateDaysRemaining(expirationDate: Date | null): number | null {
  if (!expirationDate) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getExamStatus(exam: MedicalExam): ExamStatus {
  if (!exam.expirationDate) return 'no_aplica';
  
  const daysRemaining = calculateDaysRemaining(exam.expirationDate);
  if (daysRemaining === null) return 'no_aplica';
  
  if (daysRemaining < 0) return 'vencido';
  if (daysRemaining <= 30) return 'por_vencer';
  return 'vigente';
}

export function getAlertLevel(daysRemaining: number): 'info' | 'warning' | 'critical' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 15) return 'warning';
  return 'info';
}
