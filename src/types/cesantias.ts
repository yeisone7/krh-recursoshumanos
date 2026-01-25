export type CesantiasStatus = 'pendiente' | 'calculado' | 'depositado' | 'extemporaneo';
export type CesantiasWithdrawalReason = 'vivienda' | 'educacion' | 'terminacion_contrato';

export interface CesantiasDeposit {
  id: string;
  company_id: string;
  employee_id: string;
  year: number;
  calculation_start_date: string;
  calculation_end_date: string;
  base_salary: number;
  average_salary?: number;
  days_worked: number;
  cesantias_amount: number;
  fund_name: string;
  fund_account?: string;
  due_date: string;
  deposit_date?: string;
  deposit_document_url?: string;
  status: CesantiasStatus;
  is_late: boolean;
  late_days: number;
  observations?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export interface CesantiasInterestPayment {
  id: string;
  company_id: string;
  employee_id: string;
  year: number;
  cesantias_balance: number;
  interest_rate: number;
  days_accrued: number;
  interest_amount: number;
  due_date: string;
  payment_date?: string;
  payment_document_url?: string;
  is_paid: boolean;
  is_late: boolean;
  late_days: number;
  observations?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export interface CesantiasWithdrawal {
  id: string;
  company_id: string;
  employee_id: string;
  request_date: string;
  withdrawal_reason: CesantiasWithdrawalReason;
  amount_requested: number;
  amount_approved?: number;
  authorization_date?: string;
  disbursement_date?: string;
  fund_name: string;
  request_document_url?: string;
  authorization_document_url?: string;
  beneficiary_name?: string;
  beneficiary_document?: string;
  destination_description?: string;
  status: string;
  rejection_reason?: string;
  observations?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export const cesantiasStatusLabels: Record<CesantiasStatus, string> = {
  pendiente: 'Pendiente',
  calculado: 'Calculado',
  depositado: 'Depositado',
  extemporaneo: 'Extemporáneo',
};

export const withdrawalReasonLabels: Record<CesantiasWithdrawalReason, string> = {
  vivienda: 'Vivienda',
  educacion: 'Educación',
  terminacion_contrato: 'Terminación de Contrato',
};

export const withdrawalStatusLabels: Record<string, string> = {
  solicitado: 'Solicitado',
  en_tramite: 'En Trámite',
  aprobado: 'Aprobado',
  desembolsado: 'Desembolsado',
  rechazado: 'Rechazado',
};
