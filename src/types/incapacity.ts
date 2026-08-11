import { z } from 'zod';

// =====================================================
// ENUMS AND TYPES
// =====================================================

export const incapacityOriginValues = [
  'comun',
  'laboral',
  'accidente_transito',
  'licencia_maternidad',
  'licencia_paternidad',
] as const;

export type IncapacityOrigin = typeof incapacityOriginValues[number];
export type RecoveryStatus =
  | 'pendiente'
  | 'radicado'
  | 'en_tramite'
  | 'aprobado'
  | 'rechazado'
  | 'pagado'
  | 'asumido_empresa';
export type IncapacityLegalStage =
  | 'employer'
  | 'eps_maternity'
  | 'eps_paternity'
  | 'eps_3_90'
  | 'eps_91_180'
  | 'afp_181_540'
  | 'eps_541_plus'
  | 'arl'
  | 'uncovered';

export interface IncapacityPaymentSegment {
  stage: IncapacityLegalStage;
  label: string;
  responsible: 'empleador' | 'eps' | 'arl' | 'afp' | 'eps_541_plus' | 'sin_cobertura';
  fromDay: number;
  toDay: number;
  days: number;
  rate: number;
  amount: number;
}

export interface IncapacityLegalMilestone {
  key: 'day_120' | 'day_150' | 'day_180' | 'day_540' | 'day_541_plus';
  day: number;
  title: string;
  description: string;
  documentEntityType: IncapacityFollowUpDocumentType;
  level: 'info' | 'warning' | 'critical';
  isReached: boolean;
  daysRemaining: number;
}

export type IncapacityFollowUpDocumentType =
  | 'incapacity_rehabilitation_concept'
  | 'incapacity_afp_follow_up'
  | 'incapacity_economic_responsibility'
  | 'incapacity_capacity_loss_rating';

export interface IncapacityFollowUpDocumentAvailability {
  entityType: IncapacityFollowUpDocumentType;
  title: string;
  description: string;
  thresholdDays: number;
  isAvailable: boolean;
  daysRemaining: number;
}

export const COLOMBIA_LEGAL_MINIMUM_MONTHLY_WAGES: Record<number, number> = {
  2024: 1_300_000,
  2025: 1_423_500,
  2026: 1_750_905,
};

export function getLegalMinimumMonthlyWage(date: Date | string = new Date()): number {
  const parsedDate = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  const requestedYear = Number.isNaN(parsedDate.getTime())
    ? new Date().getFullYear()
    : parsedDate.getFullYear();
  const configuredYears = Object.keys(COLOMBIA_LEGAL_MINIMUM_MONTHLY_WAGES)
    .map(Number)
    .sort((a, b) => a - b);
  const applicableYear = [...configuredYears]
    .reverse()
    .find((year) => year <= requestedYear) ?? configuredYears[0];

  return COLOMBIA_LEGAL_MINIMUM_MONTHLY_WAGES[applicableYear];
}

export function getLegalMinimumDailyWage(date: Date | string = new Date()): number {
  return getLegalMinimumMonthlyWage(date) / 30;
}

export const incapacityOriginOptions: Array<{
  value: IncapacityOrigin;
  label: string;
  shortLabel: string;
  kpiLabel: string;
}> = [
  {
    value: 'comun',
    label: 'Enfermedad Común',
    shortLabel: 'Común',
    kpiLabel: 'Origen Común',
  },
  {
    value: 'laboral',
    label: 'Accidente Laboral / Enfermedad Profesional',
    shortLabel: 'Laboral',
    kpiLabel: 'Origen Laboral',
  },
  {
    value: 'accidente_transito',
    label: 'Accidente de Tránsito',
    shortLabel: 'Tránsito',
    kpiLabel: 'Accidente de Tránsito',
  },
  {
    value: 'licencia_maternidad',
    label: 'Licencia de Maternidad',
    shortLabel: 'Maternidad',
    kpiLabel: 'Licencia de Maternidad',
  },
  {
    value: 'licencia_paternidad',
    label: 'Licencia de Paternidad',
    shortLabel: 'Paternidad',
    kpiLabel: 'Licencia de Paternidad',
  },
];

export const incapacityOriginLabels = incapacityOriginOptions.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<IncapacityOrigin, string>
);

export const incapacityOriginShortLabels = incapacityOriginOptions.reduce(
  (acc, option) => {
    acc[option.value] = option.shortLabel;
    return acc;
  },
  {} as Record<IncapacityOrigin, string>
);

export function getIncapacityOriginLabel(origin: string | null | undefined) {
  if (!origin) return 'Sin origen';
  return incapacityOriginLabels[origin as IncapacityOrigin] || origin;
}

export function getIncapacityOriginShortLabel(origin: string | null | undefined) {
  if (!origin) return 'Sin origen';
  return incapacityOriginShortLabels[origin as IncapacityOrigin] || origin;
}

export function isWorkRelatedIncapacityOrigin(origin: string | null | undefined) {
  return origin === 'laboral';
}

export const recoveryStatusLabels: Record<RecoveryStatus, string> = {
  pendiente: 'Pendiente de Radicar',
  radicado: 'Radicado',
  en_tramite: 'En Trámite',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pagado: 'Pagado',
  asumido_empresa: 'Asumido Empresa',
};

export const recoveryStatusColors: Record<RecoveryStatus, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  radicado: 'bg-blue-100 text-blue-800',
  en_tramite: 'bg-purple-100 text-purple-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  pagado: 'bg-emerald-100 text-emerald-800',
  asumido_empresa: 'bg-slate-100 text-slate-800',
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
    gender?: string | null;
  };
  extensions?: EmployeeIncapacity[];
}

// =====================================================
// FORM SCHEMAS
// =====================================================

export const incapacityFormSchema = z.object({
  employee_id: z.string().min(1, 'Empleado requerido'),
  origin: z.enum(incapacityOriginValues),
  start_date: z.date({ required_error: 'Fecha de inicio requerida' }),
  duration_days: z.coerce.number().int().min(1, 'Los días de incapacidad deben ser al menos 1'),
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
  recovery_status: z.enum(['pendiente', 'radicado', 'en_tramite', 'aprobado', 'rechazado', 'pagado', 'asumido_empresa'] as const),
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
 * Calculates the payment distribution for an incapacity. Every covered day
 * has the applicable legal minimum daily wage as its payment floor.
 */
export function calculatePaymentDistribution(
  origin: IncapacityOrigin,
  totalDays: number,
  dailyBaseSalary: number,
  accumulatedDays: number = 0,
  minimumMonthlyWage: number = getLegalMinimumMonthlyWage()
): {
  employerDays: number;
  epsDays: number;
  arlDays: number;
  afpDays: number;
  epsInitialDays: number;
  epsReducedDays: number;
  epsAfter540Days: number;
  employerAmount: number;
  epsAmount: number;
  arlAmount: number;
  afpAmount: number;
  epsAfter540Amount: number;
  totalAmount: number;
  minimumDailySalary: number;
  usesMinimumWageFloor: boolean;
  segments: IncapacityPaymentSegment[];
} {
  const roundMoney = (value: number) => Math.round(value * 100) / 100;
  const minimumDailySalary = minimumMonthlyWage / 30;
  const amountFor = (days: number, rate: number) =>
    roundMoney(days * Math.max(dailyBaseSalary * rate, minimumDailySalary));

  if (origin === 'licencia_maternidad' || origin === 'licencia_paternidad') {
    const epsAmount = amountFor(totalDays, 1);
    const isPaternityLeave = origin === 'licencia_paternidad';
    return {
      employerDays: 0,
      epsDays: totalDays,
      arlDays: 0,
      afpDays: 0,
      epsInitialDays: totalDays,
      epsReducedDays: 0,
      epsAfter540Days: 0,
      employerAmount: 0,
      epsAmount,
      arlAmount: 0,
      afpAmount: 0,
      epsAfter540Amount: 0,
      totalAmount: epsAmount,
      minimumDailySalary,
      usesMinimumWageFloor: dailyBaseSalary < minimumDailySalary,
      segments: [{
        stage: isPaternityLeave ? 'eps_paternity' : 'eps_maternity',
        label: `EPS - licencia de ${isPaternityLeave ? 'paternidad' : 'maternidad'}`,
        responsible: 'eps',
        fromDay: accumulatedDays + 1,
        toDay: accumulatedDays + totalDays,
        days: totalDays,
        rate: 1,
        amount: epsAmount,
      }],
    };
  }

  if (isWorkRelatedIncapacityOrigin(origin)) {
    const startDay = accumulatedDays + 1;
    const endDay = accumulatedDays + totalDays;
    const employerDays = startDay === 1 ? 1 : 0;
    const arlDays = totalDays - employerDays;
    const employerAmount = amountFor(employerDays, 1);
    const arlAmount = amountFor(arlDays, 1);
    const segments: IncapacityPaymentSegment[] = [];

    if (employerDays > 0) {
      segments.push({
        stage: 'employer',
        label: 'Empleador - día 1 de origen laboral',
        responsible: 'empleador',
        fromDay: 1,
        toDay: 1,
        days: 1,
        rate: 1,
        amount: employerAmount,
      });
    }

    if (arlDays > 0) {
      segments.push({
        stage: 'arl',
        label: 'ARL - origen laboral desde el día 2',
        responsible: 'arl',
        fromDay: Math.max(startDay, 2),
        toDay: endDay,
        days: arlDays,
        rate: 1,
        amount: arlAmount,
      });
    }

    return {
      employerDays,
      epsDays: 0,
      arlDays,
      afpDays: 0,
      epsInitialDays: 0,
      epsReducedDays: 0,
      epsAfter540Days: 0,
      employerAmount,
      epsAmount: 0,
      arlAmount,
      afpAmount: 0,
      epsAfter540Amount: 0,
      totalAmount: roundMoney(employerAmount + arlAmount),
      minimumDailySalary,
      usesMinimumWageFloor: dailyBaseSalary < minimumDailySalary,
      segments,
    };
  }

  const startDay = accumulatedDays + 1;
  const endDay = accumulatedDays + totalDays;
  let employerDays = 0;
  let epsInitialDays = 0;
  let epsReducedDays = 0;
  let afpDays = 0;
  let epsAfter540Days = 0;

  for (let day = startDay; day <= endDay; day++) {
    if (day <= 2) employerDays++;
    else if (day <= 90) epsInitialDays++;
    else if (day <= 180) epsReducedDays++;
    else if (day <= 540) afpDays++;
    else epsAfter540Days++;
  }

  const employerAmount = amountFor(employerDays, 0.6667);
  const epsInitialAmount = amountFor(epsInitialDays, 0.6667);
  const epsReducedAmount = amountFor(epsReducedDays, 0.5);
  const afpAmount = amountFor(afpDays, 0.5);
  const epsAfter540Amount = amountFor(epsAfter540Days, 0.5);
  const epsAmount = roundMoney(epsInitialAmount + epsReducedAmount + epsAfter540Amount);
  const totalAmount = roundMoney(employerAmount + epsAmount + afpAmount);

  const segmentDefinitions: Array<Omit<IncapacityPaymentSegment, 'days' | 'amount'>> = [
    { stage: 'employer', label: 'Empleador - días 1 a 2', responsible: 'empleador', fromDay: Math.max(startDay, 1), toDay: Math.min(endDay, 2), rate: 0.6667 },
    { stage: 'eps_3_90', label: 'EPS - días 3 a 90', responsible: 'eps', fromDay: Math.max(startDay, 3), toDay: Math.min(endDay, 90), rate: 0.6667 },
    { stage: 'eps_91_180', label: 'EPS - días 91 a 180', responsible: 'eps', fromDay: Math.max(startDay, 91), toDay: Math.min(endDay, 180), rate: 0.5 },
    { stage: 'afp_181_540', label: 'AFP - días 181 a 540', responsible: 'afp', fromDay: Math.max(startDay, 181), toDay: Math.min(endDay, 540), rate: 0.5 },
    { stage: 'eps_541_plus', label: 'EPS - día 541 en adelante', responsible: 'eps_541_plus', fromDay: Math.max(startDay, 541), toDay: endDay, rate: 0.5 },
  ];

  const segments = segmentDefinitions
    .map((segment) => {
      const days = segment.toDay >= segment.fromDay ? segment.toDay - segment.fromDay + 1 : 0;
      return { ...segment, days, amount: amountFor(days, segment.rate) };
    })
    .filter((segment) => segment.days > 0);

  return {
    employerDays,
    epsDays: epsInitialDays + epsReducedDays + epsAfter540Days,
    arlDays: 0,
    afpDays,
    epsInitialDays,
    epsReducedDays,
    epsAfter540Days,
    employerAmount,
    epsAmount,
    arlAmount: 0,
    afpAmount,
    epsAfter540Amount,
    totalAmount,
    minimumDailySalary,
    usesMinimumWageFloor: segments.some(
      (segment) => dailyBaseSalary * segment.rate < minimumDailySalary
    ),
    segments,
  };
}

export function getCurrentLegalStage(origin: IncapacityOrigin, accumulatedDays: number): {
  stage: IncapacityLegalStage;
  label: string;
  responsible: string;
} {
  if (isWorkRelatedIncapacityOrigin(origin)) {
    if (accumulatedDays <= 1) {
      return { stage: 'employer', label: 'Día 1 de origen laboral', responsible: 'Empleador (100%)' };
    }
    return { stage: 'arl', label: 'Origen laboral desde el día 2', responsible: 'ARL (100%)' };
  }

  if (origin === 'licencia_maternidad') {
    return { stage: 'eps_maternity', label: 'Licencia de maternidad', responsible: 'EPS (100%)' };
  }

  if (origin === 'licencia_paternidad') {
    return { stage: 'eps_paternity', label: 'Licencia de paternidad', responsible: 'EPS (100%)' };
  }

  if (accumulatedDays <= 2) return { stage: 'employer', label: 'Días 1 a 2', responsible: 'Empleador' };
  if (accumulatedDays <= 90) return { stage: 'eps_3_90', label: 'Días 3 a 90', responsible: 'EPS' };
  if (accumulatedDays <= 180) return { stage: 'eps_91_180', label: 'Días 91 a 180', responsible: 'EPS' };
  if (accumulatedDays <= 540) return { stage: 'afp_181_540', label: 'Días 181 a 540', responsible: 'AFP' };
  return { stage: 'eps_541_plus', label: 'Día 541 en adelante', responsible: 'EPS / entidad adaptada' };
}

export function getLegalMilestones(origin: IncapacityOrigin, accumulatedDays: number): IncapacityLegalMilestone[] {
  if (origin !== 'comun') return [];

  const definitions: Array<Omit<IncapacityLegalMilestone, 'isReached' | 'daysRemaining'>> = [
    {
      key: 'day_120',
      day: 120,
      title: 'Concepto de rehabilitación',
      description: 'La EPS debe expedir concepto de rehabilitación antes del día 120.',
      documentEntityType: 'incapacity_rehabilitation_concept',
      level: accumulatedDays >= 120 ? 'critical' : accumulatedDays >= 105 ? 'warning' : 'info',
    },
    {
      key: 'day_150',
      day: 150,
      title: 'Seguimiento ante AFP',
      description: 'Revise envío del concepto y preparación para reconocimiento después del día 180.',
      documentEntityType: 'incapacity_afp_follow_up',
      level: accumulatedDays >= 150 ? 'critical' : accumulatedDays >= 135 ? 'warning' : 'info',
    },
    {
      key: 'day_180',
      day: 180,
      title: 'Cambio de responsable económico',
      description: 'Desde el día 181, valide responsabilidad de AFP según concepto de rehabilitación.',
      documentEntityType: 'incapacity_economic_responsibility',
      level: accumulatedDays >= 180 ? 'critical' : accumulatedDays >= 165 ? 'warning' : 'info',
    },
    {
      key: 'day_540',
      day: 540,
      title: 'Umbral de 540 días',
      description: 'Revise calificación, concepto desfavorable o causales para pago EPS desde el día 541.',
      documentEntityType: 'incapacity_capacity_loss_rating',
      level: accumulatedDays >= 540 ? 'critical' : accumulatedDays >= 510 ? 'warning' : 'info',
    },
  ];

  return definitions.map((milestone) => ({
    ...milestone,
    isReached: accumulatedDays >= milestone.day,
    daysRemaining: milestone.day - accumulatedDays,
  }));
}

export function getFollowUpDocumentAvailability(
  origin: IncapacityOrigin,
  accumulatedDays: number
): IncapacityFollowUpDocumentAvailability[] {
  if (origin !== 'comun') return [];

  const definitions: Array<Omit<IncapacityFollowUpDocumentAvailability, 'isAvailable' | 'daysRemaining'>> = [
    {
      entityType: 'incapacity_rehabilitation_concept',
      title: 'Concepto de rehabilitación',
      description: 'Concepto favorable o desfavorable emitido para el seguimiento de la rehabilitación.',
      thresholdDays: 120,
    },
    {
      entityType: 'incapacity_afp_follow_up',
      title: 'Seguimiento ante AFP',
      description: 'Constancias de envío, radicación y comunicaciones del seguimiento ante la AFP.',
      thresholdDays: 150,
    },
    {
      entityType: 'incapacity_economic_responsibility',
      title: 'Cambio de responsable económico',
      description: 'Conceptos y soportes que acreditan el cambio de responsable económico.',
      thresholdDays: 180,
    },
    {
      entityType: 'incapacity_capacity_loss_rating',
      title: 'Calificación de pérdida de capacidad laboral',
      description: 'Dictamen o calificación de pérdida de capacidad laboral (PCL).',
      thresholdDays: 540,
    },
  ];

  return definitions.map((definition) => ({
    ...definition,
    isAvailable: accumulatedDays >= definition.thresholdDays,
    daysRemaining: Math.max(0, definition.thresholdDays - accumulatedDays),
  }));
}

/**
 * Calculate accumulated days from previous incapacities in the same event chain
 */
export function getAccumulatedDays(incapacity: EmployeeIncapacity, allIncapacities: EmployeeIncapacity[]): number {
  if (!incapacity.is_extension || !incapacity.parent_incapacity_id) {
    return 0;
  }

  const rootId = getRootIncapacity(incapacity, allIncapacities).id;
  const chain = getIncapacityChain(rootId, allIncapacities);
  const targetIndex = chain.findIndex((item) => item.id === incapacity.id);
  const previousRecords = targetIndex >= 0 ? chain.slice(0, targetIndex) : chain;

  return previousRecords.reduce((total, item) => total + item.total_days, 0);
}

export function getRootIncapacity(
  incapacity: EmployeeIncapacity,
  allIncapacities: EmployeeIncapacity[]
): EmployeeIncapacity {
  let current = incapacity;
  const visited = new Set<string>();

  while (current.parent_incapacity_id && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = allIncapacities.find((item) => item.id === current.parent_incapacity_id);
    if (!parent) break;
    current = parent;
  }

  return current;
}

export function getIncapacityRootId(incapacity: EmployeeIncapacity): string {
  return incapacity.parent_incapacity_id || incapacity.id;
}

export function getIncapacityChain(
  rootId: string,
  allIncapacities: EmployeeIncapacity[]
): EmployeeIncapacity[] {
  return allIncapacities
    .filter((item) => getRootIncapacity(item, allIncapacities).id === rootId)
    .sort((a, b) => {
      if (a.id === rootId) return -1;
      if (b.id === rootId) return 1;
      const extensionOrder = (a.extension_number || 0) - (b.extension_number || 0);
      return extensionOrder || a.start_date.localeCompare(b.start_date);
    });
}

export function getAccumulatedDaysForNewExtension(
  parentIncapacityId: string,
  allIncapacities: EmployeeIncapacity[]
): number {
  const parent = allIncapacities.find((item) => item.id === parentIncapacityId);
  if (!parent) return 0;
  const root = getRootIncapacity(parent, allIncapacities);

  return getIncapacityChain(root.id, allIncapacities)
    .reduce((total, item) => total + item.total_days, 0);
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
