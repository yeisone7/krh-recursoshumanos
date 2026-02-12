// =============================================
// TIPOS PARA MÓDULO DE PRE-LIQUIDACIÓN DE NÓMINA
// =============================================

export type NoveltyType =
  | 'jornada'
  | 'hedo'
  | 'heno'
  | 'hedf'
  | 'henf'
  | 'rn'
  | 'rnf'
  | 'dominical_trabajado'
  | 'festivo_trabajado'
  | 'descanso_remunerado'
  | 'incapacidad'
  | 'vacaciones'
  | 'permiso';

export type NoveltySource = 'manual' | 'auto';

export const NOVELTY_TYPE_LABELS: Record<NoveltyType, string> = {
  jornada: 'Jornada Laboral',
  hedo: 'H.E. Diurna Ordinaria',
  heno: 'H.E. Nocturna Ordinaria',
  hedf: 'H.E. Diurna Dom/Fest',
  henf: 'H.E. Nocturna Dom/Fest',
  rn: 'Recargo Nocturno',
  rnf: 'Recargo Nocturno Fest',
  dominical_trabajado: 'Dominical Trabajado',
  festivo_trabajado: 'Festivo Trabajado',
  descanso_remunerado: 'Descanso Remunerado',
  incapacidad: 'Incapacidad',
  vacaciones: 'Vacaciones',
  permiso: 'Permiso',
};

// =============================================
// PAYROLL LABOR CONFIG
// =============================================
export interface PayrollLaborConfig {
  id: string;
  company_id: string;
  max_weekly_hours: number;
  daily_hours: number;
  display_unit: 'hours' | 'days';
  night_start: string; // TIME as string HH:mm
  night_end: string;
  surcharge_hedo: number;
  surcharge_heno: number;
  surcharge_rn: number;
  surcharge_hedf: number;
  surcharge_henf: number;
  surcharge_rnf: number;
  surcharge_dominical: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// =============================================
// PAYROLL NOVELTIES
// =============================================
export interface PayrollNovelty {
  id: string;
  company_id: string;
  employee_id: string;
  novelty_date: string;
  novelty_type: NoveltyType;
  hours: number;
  notes?: string;
  source: NoveltySource;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

// =============================================
// PRE-LIQUIDATION RESULT
// =============================================
export interface PreLiquidationRow {
  employeeId: string;
  employeeName: string;
  documentNumber: string;
  jornada: number;
  dominicalTrabajado: number;
  festivoTrabajado: number;
  descansoRemunerado: number;
  hedo: number;
  heno: number;
  hedf: number;
  henf: number;
  rn: number;
  rnf: number;
  incapacidad: number;
  vacaciones: number;
  permiso: number;
  totalDias: number;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface PreLiquidationFilters {
  startDate: string;
  endDate: string;
  centerId?: string;
  areaId?: string;
  mode?: 'all' | 'administrative' | 'shift';
}
