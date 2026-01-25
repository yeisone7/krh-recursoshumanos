import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CesantiasDeposit, CesantiasInterestPayment, CesantiasWithdrawal, CesantiasStatus, CesantiasWithdrawalReason } from '@/types/cesantias';

// =====================================================
// DEPOSITS
// =====================================================

export function useCesantiasDeposits(year?: number) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['cesantias_deposits', currentCompanyId, year],
    queryFn: async () => {
      let query = supabase
        .from('cesantias_deposits')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .order('year', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CesantiasDeposit[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateCesantiasDeposit() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (deposit: {
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
      status?: CesantiasStatus;
      observations?: string;
    }) => {
      const { data, error } = await supabase
        .from('cesantias_deposits')
        .insert({
          ...deposit,
          company_id: currentCompanyId!,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cesantias_deposits'] });
    },
  });
}

export function useUpdateCesantiasDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      deposit_date: string;
      deposit_document_url: string;
      status: CesantiasStatus;
      is_late: boolean;
      late_days: number;
      observations: string;
    }>) => {
      const { data, error } = await supabase
        .from('cesantias_deposits')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cesantias_deposits'] });
    },
  });
}

// =====================================================
// INTEREST PAYMENTS
// =====================================================

export function useCesantiasInterestPayments(year?: number) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['cesantias_interest', currentCompanyId, year],
    queryFn: async () => {
      let query = supabase
        .from('cesantias_interest_payments')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .order('year', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CesantiasInterestPayment[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateCesantiasInterest() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (interest: {
      employee_id: string;
      year: number;
      cesantias_balance: number;
      interest_rate?: number;
      days_accrued?: number;
      interest_amount: number;
      due_date: string;
      payment_date?: string;
      is_paid?: boolean;
      observations?: string;
    }) => {
      const { data, error } = await supabase
        .from('cesantias_interest_payments')
        .insert({
          ...interest,
          company_id: currentCompanyId!,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cesantias_interest'] });
    },
  });
}

export function useUpdateCesantiasInterest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      payment_date: string;
      payment_document_url: string;
      is_paid: boolean;
      is_late: boolean;
      late_days: number;
      observations: string;
    }>) => {
      const { data, error } = await supabase
        .from('cesantias_interest_payments')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cesantias_interest'] });
    },
  });
}

// =====================================================
// WITHDRAWALS
// =====================================================

export function useCesantiasWithdrawals() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['cesantias_withdrawals', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cesantias_withdrawals')
        .select(`
          *,
          employee:employees_v2(id, first_name, last_name, document_number)
        `)
        .eq('company_id', currentCompanyId!)
        .order('request_date', { ascending: false });

      if (error) throw error;
      return data as CesantiasWithdrawal[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateCesantiasWithdrawal() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (withdrawal: {
      employee_id: string;
      request_date: string;
      withdrawal_reason: CesantiasWithdrawalReason;
      amount_requested: number;
      fund_name: string;
      beneficiary_name?: string;
      beneficiary_document?: string;
      destination_description?: string;
      observations?: string;
    }) => {
      const { data, error } = await supabase
        .from('cesantias_withdrawals')
        .insert({
          ...withdrawal,
          company_id: currentCompanyId!,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cesantias_withdrawals'] });
    },
  });
}

export function useUpdateCesantiasWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      amount_approved: number;
      authorization_date: string;
      disbursement_date: string;
      authorization_document_url: string;
      status: string;
      rejection_reason: string;
      observations: string;
    }>) => {
      const { data, error } = await supabase
        .from('cesantias_withdrawals')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cesantias_withdrawals'] });
    },
  });
}

// =====================================================
// COMPLIANCE SUMMARY
// =====================================================

export function useCesantiasComplianceSummary(year: number) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['cesantias_compliance', currentCompanyId, year],
    queryFn: async () => {
      // Get deposits for the year
      const { data: deposits, error: depError } = await supabase
        .from('cesantias_deposits')
        .select('status, is_late')
        .eq('company_id', currentCompanyId!)
        .eq('year', year);

      if (depError) throw depError;

      // Get interest payments for the year
      const { data: interests, error: intError } = await supabase
        .from('cesantias_interest_payments')
        .select('is_paid, is_late')
        .eq('company_id', currentCompanyId!)
        .eq('year', year);

      if (intError) throw intError;

      const totalDeposits = deposits?.length || 0;
      const depositedOnTime = deposits?.filter(d => d.status === 'depositado' && !d.is_late).length || 0;
      const depositedLate = deposits?.filter(d => d.is_late).length || 0;
      const pendingDeposits = deposits?.filter(d => d.status === 'pendiente' || d.status === 'calculado').length || 0;

      const totalInterest = interests?.length || 0;
      const paidOnTime = interests?.filter(i => i.is_paid && !i.is_late).length || 0;
      const paidLate = interests?.filter(i => i.is_late).length || 0;
      const pendingInterest = interests?.filter(i => !i.is_paid).length || 0;

      return {
        deposits: {
          total: totalDeposits,
          onTime: depositedOnTime,
          late: depositedLate,
          pending: pendingDeposits,
        },
        interest: {
          total: totalInterest,
          onTime: paidOnTime,
          late: paidLate,
          pending: pendingInterest,
        },
      };
    },
    enabled: !!currentCompanyId,
  });
}
