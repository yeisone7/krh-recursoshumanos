// =============================================
// TIPOS PARA MÓDULO DE HORARIOS Y TURNOS
// =============================================

// Modalidad de tiempo del empleado
export type EmployeeTimeMode = 'administrative' | 'shift';

// Origen de asignación de turno
export type ShiftAssignmentSource = 'cycle' | 'manual';

// =============================================
// WORK SCHEDULES (Horarios Administrativos)
// =============================================
export interface WorkSchedule {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  days_of_week: number[]; // 0=Dom, 1=Lun, ..., 6=Sab
  start_time: string;
  end_time: string;
  break_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// =============================================
// SHIFTS (Turnos Operativos)
// =============================================
export interface Shift {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  crosses_midnight: boolean;
  color: string;
  is_rest_day: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// =============================================
// SHIFT CYCLES (Ciclos de Rotación)
// =============================================
export interface ShiftCycle {
  id: string;
  company_id: string;
  name: string;
  code?: string;
  description?: string;
  total_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  cycle_days?: ShiftCycleDay[];
}

// =============================================
// SHIFT CYCLE DAYS (Días del Ciclo)
// =============================================
export interface ShiftCycleDay {
  id: string;
  shift_cycle_id: string;
  day_number: number;
  shift_id: string;
  created_at: string;
  // Joined data
  shifts?: Shift;
}

// =============================================
// EMPLOYEE TIME CONFIG (Configuración por Empleado)
// =============================================
export interface EmployeeTimeConfig {
  id: string;
  employee_id: string;
  mode: EmployeeTimeMode;
  work_schedule_id?: string;
  shift_cycle_id?: string;
  cycle_start_date?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  work_schedules?: WorkSchedule;
  shift_cycles?: ShiftCycle;
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

// =============================================
// EMPLOYEE SHIFT ASSIGNMENTS (Asignaciones Diarias)
// =============================================
export interface EmployeeShiftAssignment {
  id: string;
  employee_id: string;
  shift_id: string;
  assignment_date: string;
  source: ShiftAssignmentSource;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  // Joined data
  shifts?: Shift;
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

// =============================================
// HELPER TYPES
// =============================================
export const DAY_NAMES: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

// Color transparente / sin color
export const SHIFT_COLOR_TRANSPARENT = 'transparent';

// Colores predefinidos para turnos
export const SHIFT_COLORS = [
  SHIFT_COLOR_TRANSPARENT, // Sin color
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
];

// Para el calendario de asignaciones
export interface CalendarAssignment {
  employeeId: string;
  employeeName: string;
  centerId?: string;
  centerName?: string;
  areaId?: string;
  areaName?: string;
  assignments: Record<string, EmployeeShiftAssignment | null>; // date -> assignment
}

// Para validación de novedades
export interface EmployeeAbsence {
  type: 'vacation' | 'leave' | 'incapacity';
  start_date: string;
  end_date: string;
  description: string;
}
