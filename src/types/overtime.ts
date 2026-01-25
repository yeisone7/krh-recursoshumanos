// Overtime Types according to Colombian Labor Law
export type OvertimeType =
  | 'extra_diurna'       // 25% surcharge
  | 'extra_nocturna'     // 75% surcharge
  | 'recargo_nocturno'   // 35% surcharge (no extra hours)
  | 'dominical_diurna'   // 75% surcharge
  | 'dominical_nocturna' // 110% surcharge
  | 'festivo_diurna'     // 75% surcharge
  | 'festivo_nocturna';  // 110% surcharge

export type OvertimeStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'pagado';

// Colombian surcharge percentages
export const OVERTIME_SURCHARGES: Record<OvertimeType, number> = {
  extra_diurna: 25,
  extra_nocturna: 75,
  recargo_nocturno: 35,
  dominical_diurna: 75,
  dominical_nocturna: 110,
  festivo_diurna: 75,
  festivo_nocturna: 110,
};

export const OVERTIME_TYPE_LABELS: Record<OvertimeType, string> = {
  extra_diurna: 'Hora Extra Diurna',
  extra_nocturna: 'Hora Extra Nocturna',
  recargo_nocturno: 'Recargo Nocturno',
  dominical_diurna: 'Dominical/Festivo Diurna',
  dominical_nocturna: 'Dominical/Festivo Nocturna',
  festivo_diurna: 'Festivo Diurna',
  festivo_nocturna: 'Festivo Nocturna',
};

export const OVERTIME_STATUS_LABELS: Record<OvertimeStatus, string> = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pagado: 'Pagado',
};

// Overtime Record
export interface OvertimeRecord {
  id: string;
  company_id: string;
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  overtime_type: OvertimeType;
  surcharge_percentage: number;
  hourly_rate?: number;
  total_value?: number;
  status: OvertimeStatus;
  reason?: string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  rejected_reason?: string;
  is_exported: boolean;
  exported_at?: string;
  export_batch_id?: string;
  payroll_period?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

// Export Batch
export interface OvertimeExportBatch {
  id: string;
  company_id: string;
  batch_number: string;
  payroll_period: string;
  start_date: string;
  end_date: string;
  total_records: number;
  total_hours: number;
  total_value: number;
  exported_by?: string;
  exported_at: string;
  file_url?: string;
  notes?: string;
  created_at: string;
}

// Form Data
export interface OvertimeFormData {
  employee_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
}

// Summary for dashboard
export interface OvertimeSummary {
  totalRecords: number;
  totalHours: number;
  totalValue: number;
  pendingCount: number;
  approvedCount: number;
  byType: Record<OvertimeType, { count: number; hours: number; value: number }>;
}
