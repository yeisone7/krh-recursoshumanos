import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface EmployeeLoan {
  id: string;
  company_id: string;
  employee_id: string;
  loan_type: string;
  description: string | null;
  total_amount: number;
  interest_rate: number;
  total_with_interest: number;
  installments: number;
  installment_amount: number;
  paid_installments: number;
  paid_amount: number;
  remaining_balance: number;
  start_date: string;
  end_date: string | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employees_v2?: {
    id: string;
    first_name: string;
    last_name: string;
    document_number: string;
  };
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  payment_number: number;
  payment_date: string;
  amount: number;
  balance_after: number;
  payroll_period: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useLoans() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['employee_loans', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_loans')
        .select('*, employees_v2(id, first_name, last_name, document_number)')
        .eq('company_id', currentCompanyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EmployeeLoan[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useLoanPayments(loanId: string | null) {
  return useQuery({
    queryKey: ['loan_payments', loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_loan_payments')
        .select('*')
        .eq('loan_id', loanId!)
        .order('payment_number', { ascending: true });
      if (error) throw error;
      return (data || []) as LoanPayment[];
    },
    enabled: !!loanId,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  const { currentCompanyId, user } = useAuth();

  return useMutation({
    mutationFn: async (loan: Record<string, any>) => {
      const { data, error } = await supabase
        .from('employee_loans')
        .insert({ ...loan, company_id: currentCompanyId!, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_loans'] });
      toast({ title: 'Préstamo registrado correctamente' });
    },
    onError: (e: any) => toast({ title: 'Error al registrar préstamo', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateLoan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_loans')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_loans'] });
      toast({ title: 'Préstamo actualizado' });
    },
    onError: (e: any) => toast({ title: 'Error al actualizar', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employee_loans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_loans'] });
      toast({ title: 'Préstamo eliminado' });
    },
    onError: (e: any) => toast({ title: 'Error al eliminar', description: e.message, variant: 'destructive' }),
  });
}

export function useRegisterPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payment: Omit<LoanPayment, 'id' | 'created_at' | 'created_by'>) => {
      // Insert payment
      const { error: payError } = await supabase
        .from('employee_loan_payments')
        .insert({ ...payment, created_by: user?.id });
      if (payError) throw payError;

      // Update loan balances
      const { data: loan, error: loanErr } = await supabase
        .from('employee_loans')
        .select('paid_installments, paid_amount, total_with_interest, installments')
        .eq('id', payment.loan_id)
        .single();
      if (loanErr) throw loanErr;

      const newPaidInstallments = (loan.paid_installments || 0) + 1;
      const newPaidAmount = Number(loan.paid_amount || 0) + payment.amount;
      const newBalance = Number(loan.total_with_interest) - newPaidAmount;
      const newStatus = newPaidInstallments >= loan.installments ? 'pagado' : 'activo';

      const { error: updErr } = await supabase
        .from('employee_loans')
        .update({
          paid_installments: newPaidInstallments,
          paid_amount: newPaidAmount,
          remaining_balance: Math.max(0, newBalance),
          status: newStatus,
        })
        .eq('id', payment.loan_id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee_loans'] });
      qc.invalidateQueries({ queryKey: ['loan_payments'] });
      toast({ title: 'Pago registrado correctamente' });
    },
    onError: (e: any) => toast({ title: 'Error al registrar pago', description: e.message, variant: 'destructive' }),
  });
}

export interface LoanRefinancingRecord {
  id: string;
  loan_id: string;
  company_id: string;
  employee_id: string;
  refinance_date: string;
  previous_total_amount: number;
  previous_interest_rate: number;
  previous_total_with_interest: number;
  previous_installments: number;
  previous_installment_amount: number;
  previous_paid_installments: number;
  previous_paid_amount: number;
  previous_remaining_balance: number;
  new_total_amount: number;
  new_interest_rate: number;
  new_total_with_interest: number;
  new_installments: number;
  new_installment_amount: number;
  new_start_date: string;
  reason: string | null;
  document_url: string | null;
  created_by: string | null;
  created_at: string;
}

export function useRefinancingHistory(loanId: string | null) {
  return useQuery({
    queryKey: ['loan_refinancing_history', loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loan_refinancing_history')
        .select('*')
        .eq('loan_id', loanId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LoanRefinancingRecord[];
    },
    enabled: !!loanId,
  });
}

export function useCreateRefinancingRecord() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (record: Record<string, any>) => {
      const { data, error } = await supabase
        .from('loan_refinancing_history')
        .insert(record as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loan_refinancing_history'] });
    },
    onError: (e: any) => toast({ title: 'Error al registrar refinanciamiento', description: e.message, variant: 'destructive' }),
  });
}
