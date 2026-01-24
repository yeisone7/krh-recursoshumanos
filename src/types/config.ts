// Shift Types
export interface ShiftType {
  id: string;
  company_id: string;
  name: string;
  code: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_duration_minutes: number;
  is_night_shift: boolean;
  is_rotating: boolean;
  rotation_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeShift {
  id: string;
  employee_id: string;
  shift_type_id: string;
  effective_from: string;
  effective_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  shift_types?: ShiftType;
  employees?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// Areas
export interface Area {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  parent_id?: string;
  manager_id?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Positions
export interface Position {
  id: string;
  company_id: string;
  area_id?: string;
  name: string;
  code?: string;
  level: number;
  min_salary?: number;
  max_salary?: number;
  description?: string;
  requirements?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  areas?: Area;
}

// Contract Type Config
export interface ContractTypeConfig {
  id: string;
  company_id: string;
  contract_type: string;
  display_name: string;
  max_duration_months?: number;
  max_extensions?: number;
  requires_end_date: boolean;
  default_trial_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Dotation Item Types
export interface DotationItemType {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  category: string;
  default_validity_months: number;
  requires_size: boolean;
  sizes_available?: string[];
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// System Config
export interface SystemConfigItem {
  id: string;
  company_id: string;
  config_key: string;
  config_value: any;
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// Alert Configuration
export interface AlertConfig {
  warning: number;
  critical: number;
}

// Work Schedule Configuration
export interface WorkScheduleConfig {
  hours_per_day: number;
  days_per_week: number;
}

// Default contract types for initialization
export const DEFAULT_CONTRACT_TYPES = [
  {
    contract_type: 'indefinido',
    display_name: 'Indefinido',
    requires_end_date: false,
    default_trial_days: 60,
  },
  {
    contract_type: 'fijo',
    display_name: 'Término Fijo',
    max_duration_months: 36,
    max_extensions: 3,
    requires_end_date: true,
    default_trial_days: 60,
  },
  {
    contract_type: 'obra_labor',
    display_name: 'Obra o Labor',
    requires_end_date: true,
    default_trial_days: 60,
  },
  {
    contract_type: 'aprendizaje',
    display_name: 'Aprendizaje',
    max_duration_months: 24,
    requires_end_date: true,
    default_trial_days: 0,
  },
  {
    contract_type: 'servicios',
    display_name: 'Prestación de Servicios',
    requires_end_date: true,
    default_trial_days: 0,
  },
];

// Dotation categories
export const DOTATION_CATEGORIES = [
  { value: 'uniforme', label: 'Uniforme' },
  { value: 'calzado', label: 'Calzado' },
  { value: 'epp', label: 'EPP (Elementos de Protección Personal)' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'otros', label: 'Otros' },
];

// Standard sizes
export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const SHOE_SIZES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
