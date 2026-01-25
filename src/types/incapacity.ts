import { z } from 'zod';

// =====================================================
// ENUMS AND TYPES
// =====================================================

export type IncapacityOrigin = 'comun' | 'laboral';
export type RecoveryStatus = 'pendiente' | 'radicado' | 'en_tramite' | 'aprobado' | 'rechazado' | 'pagado';

export const incapacityOriginLabels: Record<IncapacityOrigin, string> = {
  comun: 'Enfermedad Común',
  laboral: 'Accidente Laboral / Enfermedad Profesional',
};

export const recoveryStatusLabels: Record<RecoveryStatus, string> = {
  pendiente: 'Pendiente de Radicar',
  radicado: 'Radicado',
  en_tramite: 'En Trámite',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pagado: 'Pagado',
};

export const recoveryStatusColors: Record<RecoveryStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  radicado: 'bg-blue-100 text-blue-800',
  en_tramite: 'bg-purple-100 text-purple-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  pagado: 'bg-emerald-100 text-emerald-800',
};

// =====================================================
// INTERFACES
// =====================================================

export interface EmployeeIncapacity {
  id: string;
  employee_id: string;
  company_id: string;
  
  // Basic info
  origin: IncapacityOrigin;
  start_date: string;
  end_date: string;
  total_days: number;
  
  // Clinical info
  cie10_code: string | null;
  diagnosis: string;
  treating_doctor: string | null;
  certificate_number: string | null;
  medical_entity: string | null;
  
  // Responsible entities
  eps_name: string | null;
  arl_name: string | null;
  afp_name: string | null;
  
  // Payment calculation (Colombian law)
  employer_days: number;
  eps_days: number;
  arl_days: number;
  afp_days: number;
  
  // Amounts
  daily_base_salary: number | null;
  employer_amount: number | null;
  eps_amount: number | null;
  arl_amount: number | null;
  afp_amount: number | null;
  total_amount: number | null;
  
  // Recovery management
  recovery_status: RecoveryStatus;
  filing_date: string | null;
  filing_number: string | null;
  expected_payment_date: string | null;
  actual_payment_date: string | null;
  recovered_amount: number | null;
  recovery_notes: string | null;
  
  // Extension
  is_extension: boolean;
  parent_incapacity_id: string | null;
  extension_number: number;
  
  // Documents
  certificate_url: string | null;
  clinical_history_url: string | null;
  
  // Reintegration
  requires_reintegration_exam: boolean;
  reintegration_exam_id: string | null;
  
  // Metadata
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncapacityWithEmployee extends EmployeeIncapacity {
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
  extensions?: EmployeeIncapacity[];
}

// =====================================================
// FORM SCHEMAS
// =====================================================

export const incapacityFormSchema = z.object({
  employee_id: z.string().min(1, 'Empleado requerido'),
  origin: z.enum(['comun', 'laboral'] as const),
  start_date: z.date({ required_error: 'Fecha de inicio requerida' }),
  end_date: z.date({ required_error: 'Fecha de fin requerida' }),
  
  // Clinical
  cie10_code: z.string().optional(),
  diagnosis: z.string().min(1, 'Diagnóstico requerido'),
  treating_doctor: z.string().optional(),
  certificate_number: z.string().optional(),
  medical_entity: z.string().optional(),
  
  // Salary for calculations
  daily_base_salary: z.number().min(0).optional(),
  
  // Extension
  is_extension: z.boolean().default(false),
  parent_incapacity_id: z.string().optional(),
  
  observations: z.string().optional(),
}).refine(
  (data) => data.end_date >= data.start_date,
  { message: 'La fecha de fin debe ser posterior a la fecha de inicio', path: ['end_date'] }
);

export type IncapacityFormData = z.infer<typeof incapacityFormSchema>;

export const recoveryFormSchema = z.object({
  recovery_status: z.enum(['pendiente', 'radicado', 'en_tramite', 'aprobado', 'rechazado', 'pagado'] as const),
  filing_date: z.date().optional(),
  filing_number: z.string().optional(),
  expected_payment_date: z.date().optional(),
  actual_payment_date: z.date().optional(),
  recovered_amount: z.number().min(0).optional(),
  recovery_notes: z.string().optional(),
});

export type RecoveryFormData = z.infer<typeof recoveryFormSchema>;

// =====================================================
// CALCULATION UTILITIES
// =====================================================

/**
 * Calculate payment responsibility according to Colombian law:
 * - Common illness: Employer pays days 1-2 (100%), EPS pays days 3-180 (66.67%), AFP pays days 181-540 (50%)
 * - Work-related: ARL pays 100% from day 1
 */
export function calculatePaymentDistribution(
  origin: IncapacityOrigin,
  totalDays: number,
  dailyBaseSalary: number,
  accumulatedDays: number = 0 // Days from previous incapacities in the same event
): {
  employerDays: number;
  epsDays: number;
  arlDays: number;
  afpDays: number;
  employerAmount: number;
  epsAmount: number;
  arlAmount: number;
  afpAmount: number;
  totalAmount: number;
} {
  if (origin === 'laboral') {
    // ARL pays 100% from day 1
    const arlAmount = totalDays * dailyBaseSalary;
    return {
      employerDays: 0,
      epsDays: 0,
      arlDays: totalDays,
      afpDays: 0,
      employerAmount: 0,
      epsAmount: 0,
      arlAmount,
      afpAmount: 0,
      totalAmount: arlAmount,
    };
  }

  // Common illness logic
  const startDay = accumulatedDays + 1;
  const endDay = accumulatedDays + totalDays;
  
  let employerDays = 0;
  let epsDays = 0;
  let afpDays = 0;
  
  for (let day = startDay; day <= endDay; day++) {
    if (day <= 2) {
      employerDays++;
    } else if (day <= 180) {
      epsDays++;
    } else if (day <= 540) {
      afpDays++;
    }
    // Days beyond 540 are not covered by law
  }
  
  // Calculate amounts
  const employerAmount = employerDays * dailyBaseSalary; // 100%
  const epsAmount = epsDays * dailyBaseSalary * 0.6667; // 66.67%
  const afpAmount = afpDays * dailyBaseSalary * 0.5; // 50%
  const totalAmount = employerAmount + epsAmount + afpAmount;
  
  return {
    employerDays,
    epsDays,
    arlDays: 0,
    afpDays,
    employerAmount: Math.round(employerAmount * 100) / 100,
    epsAmount: Math.round(epsAmount * 100) / 100,
    arlAmount: 0,
    afpAmount: Math.round(afpAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Calculate accumulated days from previous incapacities in the same event chain
 */
export function getAccumulatedDays(incapacity: EmployeeIncapacity, allIncapacities: EmployeeIncapacity[]): number {
  if (!incapacity.is_extension || !incapacity.parent_incapacity_id) {
    return 0;
  }
  
  // Find all previous incapacities in the chain
  let accumulated = 0;
  let currentParentId: string | null = incapacity.parent_incapacity_id;
  
  while (currentParentId) {
    const parent = allIncapacities.find(inc => inc.id === currentParentId);
    if (parent) {
      accumulated += parent.total_days;
      currentParentId = parent.parent_incapacity_id;
    } else {
      break;
    }
  }
  
  return accumulated;
}

/**
 * Check if incapacity requires reintegration exam (> 30 days)
 */
export function requiresReintegrationExam(totalDays: number, accumulatedDays: number = 0): boolean {
  return (totalDays + accumulatedDays) > 30;
}

/**
 * Get total days in an incapacity chain (original + all extensions)
 */
export function getTotalChainDays(incapacity: IncapacityWithEmployee): number {
  let total = incapacity.total_days;
  if (incapacity.extensions) {
    for (const ext of incapacity.extensions) {
      total += ext.total_days;
    }
  }
  return total;
}
