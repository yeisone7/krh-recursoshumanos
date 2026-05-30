import { toDateOnlyString } from '@/lib/dateOnly';
import { Database } from '@/integrations/supabase/types';

// Database types
export type VacationRequestType = Database['public']['Enums']['vacation_request_type'];
export type VacationStatus = Database['public']['Enums']['vacation_status'];

export interface VacationConfig {
  id: string;
  company_id: string;
  days_per_year: number;
  max_accumulation_years: number;
  max_compensation_percentage: number;
  alert_threshold_days: number;
  created_at: string;
  updated_at: string;
}

export interface VacationBalance {
  id: string;
  employee_id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  days_accrued: number;
  days_taken: number;
  days_compensated: number;
  days_pending: number;
  is_accumulated: boolean;
  accumulation_expires: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export interface VacationRequest {
  id: string;
  employee_id: string;
  company_id: string;
  balance_id: string | null;
  request_type: VacationRequestType;
  status: VacationStatus;
  start_date: string;
  end_date: string;
  business_days: number;
  calendar_days: number | null;
  compensation_amount: number | null;
  interruption_date: string | null;
  interruption_reason: string | null;
  remaining_days: number;
  resume_start_date: string | null;
  resume_end_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
  balance?: VacationBalance;
}

export interface VacationPeriod {
  start: Date;
  end: Date;
  year: number;
}

// Colombian holidays for business days calculation
export const COLOMBIAN_HOLIDAYS_2024 = [
  '2024-01-01', // Año Nuevo
  '2024-01-08', // Reyes Magos
  '2024-03-25', // San José
  '2024-03-28', // Jueves Santo
  '2024-03-29', // Viernes Santo
  '2024-05-01', // Día del Trabajo
  '2024-05-13', // Ascensión del Señor
  '2024-06-03', // Corpus Christi
  '2024-06-10', // Sagrado Corazón
  '2024-07-01', // San Pedro y San Pablo
  '2024-07-20', // Día de la Independencia
  '2024-08-07', // Batalla de Boyacá
  '2024-08-19', // Asunción de la Virgen
  '2024-10-14', // Día de la Raza
  '2024-11-04', // Todos los Santos
  '2024-11-11', // Independencia de Cartagena
  '2024-12-08', // Inmaculada Concepción
  '2024-12-25', // Navidad
];

export const COLOMBIAN_HOLIDAYS_2025 = [
  '2025-01-01', // Año Nuevo
  '2025-01-06', // Reyes Magos
  '2025-03-24', // San José
  '2025-04-17', // Jueves Santo
  '2025-04-18', // Viernes Santo
  '2025-05-01', // Día del Trabajo
  '2025-06-02', // Ascensión del Señor
  '2025-06-23', // Corpus Christi
  '2025-06-30', // Sagrado Corazón
  '2025-06-30', // San Pedro y San Pablo (moved)
  '2025-07-20', // Día de la Independencia
  '2025-08-07', // Batalla de Boyacá
  '2025-08-18', // Asunción de la Virgen
  '2025-10-13', // Día de la Raza
  '2025-11-03', // Todos los Santos
  '2025-11-17', // Independencia de Cartagena
  '2025-12-08', // Inmaculada Concepción
  '2025-12-25', // Navidad
];

export const COLOMBIAN_HOLIDAYS_2026 = [
  '2026-01-01', // Año Nuevo
  '2026-01-12', // Reyes Magos
  '2026-03-23', // San José
  '2026-04-02', // Jueves Santo
  '2026-04-03', // Viernes Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-18', // Ascensión del Señor
  '2026-06-08', // Corpus Christi
  '2026-06-15', // Sagrado Corazón
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-20', // Día de la Independencia
  '2026-08-07', // Batalla de Boyacá
  '2026-08-17', // Asunción de la Virgen
  '2026-10-12', // Día de la Raza
  '2026-11-02', // Todos los Santos
  '2026-11-16', // Independencia de Cartagena
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
];

// Combine all holidays
export const ALL_COLOMBIAN_HOLIDAYS = [
  ...COLOMBIAN_HOLIDAYS_2024,
  ...COLOMBIAN_HOLIDAYS_2025,
  ...COLOMBIAN_HOLIDAYS_2026,
];

/**
 * Check if a date is a Colombian holiday
 */
export function isColombianHoliday(date: Date): boolean {
  const dateString = toDateOnlyString(date);
  return ALL_COLOMBIAN_HOLIDAYS.includes(dateString);
}

/**
 * Check if a date is Sunday (only Sunday is non-business day per Colombian vacation law)
 */
export function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

/**
 * Check if a date is a business day (not Sunday and not holiday)
 * Per Colombian vacation law, only Sundays and holidays are non-business days
 */
export function isBusinessDay(date: Date, holidaysSet?: Set<string>): boolean {
  if (isSunday(date)) return false;
  
  if (holidaysSet) {
    const dateStr = toDateOnlyString(date);
    return !holidaysSet.has(dateStr);
  }
  
  return !isColombianHoliday(date);
}

/**
 * Calculate business days between two dates (inclusive)
 * Following Colombian labor law
 */
export function calculateBusinessDays(startDate: Date, endDate: Date, holidaysSet?: Set<string>): number {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isBusinessDay(current, holidaysSet)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate calendar days between two dates (inclusive)
 */
export function calculateCalendarDays(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate accrued vacation days based on Colombian labor law
 * Formula: (days worked / 360) * 15
 * 
 * @param hireDate - Employee's hire date
 * @param asOfDate - Date to calculate accrued days as of (default: today)
 * @param daysPerYear - Days of vacation per year (default: 15 as per Colombian law)
 */
export function calculateAccruedDays(
  hireDate: Date,
  asOfDate: Date = new Date(),
  daysPerYear: number = 15
): number {
  const diffTime = asOfDate.getTime() - hireDate.getTime();
  const daysWorked = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (daysWorked < 0) return 0;
  
  // Colombian formula: (days worked / 360) * 15
  const accruedDays = (daysWorked / 360) * daysPerYear;
  
  return Math.round(accruedDays * 100) / 100; // Round to 2 decimals
}

/**
 * Generate vacation periods based on hire date
 * Each period is one year from the anniversary of the hire date
 */
export function getVacationPeriods(hireDate: Date, asOfDate: Date = new Date()): VacationPeriod[] {
  const periods: VacationPeriod[] = [];
  let periodStart = new Date(hireDate);
  let year = 1;
  
  while (periodStart < asOfDate) {
    const periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    periodEnd.setDate(periodEnd.getDate() - 1);
    
    periods.push({
      start: new Date(periodStart),
      end: periodEnd,
      year
    });
    
    periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() + 1);
    year++;
  }
  
  return periods;
}

/**
 * Validate if compensation is allowed
 * Colombian law: Maximum 50% of vacation days can be compensated
 */
export function canCompensate(
  balance: VacationBalance,
  requestedDays: number,
  maxPercentage: number = 50
): { allowed: boolean; maxDays: number; reason?: string } {
  const maxCompensableDays = (balance.days_accrued * maxPercentage) / 100;
  const totalCompensated = balance.days_compensated + requestedDays;
  
  if (totalCompensated > maxCompensableDays) {
    return {
      allowed: false,
      maxDays: maxCompensableDays - balance.days_compensated,
      reason: `La compensación máxima permitida es del ${maxPercentage}% del periodo (${maxCompensableDays} días). Ya se han compensado ${balance.days_compensated} días.`
    };
  }
  
  return { allowed: true, maxDays: maxCompensableDays };
}

/**
 * Validate if accumulation is allowed
 * Colombian law: Maximum 2 years can be accumulated
 */
export function isAccumulationValid(
  balances: VacationBalance[],
  maxYears: number = 2
): { valid: boolean; reason?: string } {
  const accumulatedPeriods = balances.filter(b => b.days_pending > 0).length;
  
  if (accumulatedPeriods >= maxYears) {
    return {
      valid: false,
      reason: `No se puede acumular más de ${maxYears} periodos de vacaciones según la ley colombiana.`
    };
  }
  
  return { valid: true };
}

/**
 * Calculate days remaining after interruption
 */
export function calculateRemainingDays(
  originalStartDate: Date,
  originalEndDate: Date,
  interruptionDate: Date
): number {
  if (interruptionDate <= originalStartDate) {
    return calculateBusinessDays(originalStartDate, originalEndDate);
  }
  
  if (interruptionDate >= originalEndDate) {
    return 0;
  }
  
  // Calculate business days from interruption to original end
  const nextDay = new Date(interruptionDate);
  nextDay.setDate(nextDay.getDate() + 1);
  return calculateBusinessDays(nextDay, originalEndDate);
}

export interface VacationAlert {
  type: 'accumulation' | 'expiring' | 'interrupted' | 'pending_approval';
  level: 'info' | 'warning' | 'critical';
  message: string;
  employee_id: string;
  employee_name: string;
  balance_id?: string;
  request_id?: string;
  days?: number;
  expires_at?: string;
}

/**
 * Generate vacation alerts from balances and requests
 */
export function getVacationAlerts(
  balances: VacationBalance[],
  requests: VacationRequest[],
  config: VacationConfig
): VacationAlert[] {
  const alerts: VacationAlert[] = [];
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  // Check for excessive accumulation
  balances.forEach(balance => {
    if (!balance.employee) return;
    
    const employeeName = `${balance.employee.first_name} ${balance.employee.last_name}`;
    
    // Alert for excessive accumulation
    if (balance.days_pending > config.alert_threshold_days) {
      alerts.push({
        type: 'accumulation',
        level: balance.days_pending > config.alert_threshold_days * 1.5 ? 'critical' : 'warning',
        message: `${employeeName} tiene ${balance.days_pending} días de vacaciones acumulados`,
        employee_id: balance.employee_id,
        employee_name: employeeName,
        balance_id: balance.id,
        days: balance.days_pending
      });
    }
    
    // Alert for periods about to expire (2 years limit)
    if (balance.accumulation_expires) {
      const expiryDate = new Date(balance.accumulation_expires);
      if (expiryDate <= thirtyDaysFromNow && balance.days_pending > 0) {
        alerts.push({
          type: 'expiring',
          level: expiryDate <= today ? 'critical' : 'warning',
          message: `Período de vacaciones de ${employeeName} vence el ${expiryDate.toLocaleDateString('es-CO')}`,
          employee_id: balance.employee_id,
          employee_name: employeeName,
          balance_id: balance.id,
          days: balance.days_pending,
          expires_at: balance.accumulation_expires
        });
      }
    }
  });
  
  // Check for interrupted vacations pending rescheduling
  requests
    .filter(r => r.status === 'interrumpido' && r.remaining_days > 0 && !r.resume_start_date)
    .forEach(request => {
      if (!request.employee) return;
      
      const employeeName = `${request.employee.first_name} ${request.employee.last_name}`;
      alerts.push({
        type: 'interrupted',
        level: 'warning',
        message: `${employeeName} tiene ${request.remaining_days} días de vacaciones interrumpidas por reprogramar`,
        employee_id: request.employee_id,
        employee_name: employeeName,
        request_id: request.id,
        days: request.remaining_days
      });
    });
  
  return alerts;
}

// Request type labels
export const REQUEST_TYPE_LABELS: Record<VacationRequestType, string> = {
  disfrute: 'Disfrute',
  compensacion: 'Compensación en dinero',
  acumulacion: 'Acumulación autorizada',
  interrupcion: 'Interrupción'
};

// Status labels and colors
export const STATUS_LABELS: Record<VacationStatus, string> = {
  borrador: 'Borrador',
  aprobado: 'Aprobado',
  en_curso: 'En curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
  interrumpido: 'Interrumpido'
};

export const STATUS_COLORS: Record<VacationStatus, string> = {
  borrador: 'bg-muted text-muted-foreground',
  aprobado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  en_curso: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  completado: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  cancelado: 'bg-destructive/10 text-destructive',
  interrumpido: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
};

export const REQUEST_TYPE_COLORS: Record<VacationRequestType, string> = {
  disfrute: 'bg-primary/10 text-primary',
  compensacion: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  acumulacion: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  interrupcion: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
};
