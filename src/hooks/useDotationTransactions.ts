import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DotationTransaction {
  id: string;
  employee_id: string;
  delivery_date: string;
  delivered_by: string | null;
  received_by: string | null;
  signature_url: string | null;
  document_url: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employees?: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    second_last_name?: string | null;
    document_number: string;
    company_id: string;
    operation_centers?: { id: string; name: string } | null;
  };
  items: DotationTransactionItem[];
}

export interface DotationTransactionItem {
  id: string;
  item_type: string;
  item_name: string;
  quantity: number;
  size: string | null;
  delivery_date: string;
  expiration_date: string;
}

export function useDotationTransactions() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_transactions', currentCompanyId],
    queryFn: async (): Promise<DotationTransaction[]> => {
      // Get transactions
      const { data: transactions, error } = await supabase
        .from('dotation_delivery_transactions')
        .select('*')
        .order('delivery_date', { ascending: false });

      if (error) throw error;
      if (!transactions?.length) return [];

      const transactionIds = transactions.map(t => t.id);
      const employeeIds = [...new Set(transactions.map(t => t.employee_id))];

      // Fetch items and employees in parallel
      const [itemsResult, employeesResult] = await Promise.all([
        supabase
          .from('dotation_deliveries')
          .select('id, transaction_id, item_type, item_name, quantity, size, delivery_date, expiration_date')
          .in('transaction_id', transactionIds),
        supabase
          .from('employees_v2')
          .select(`
            id, first_name, middle_name, last_name, second_last_name, document_number, company_id,
            employee_work_info(id, operation_center_id, is_current, operation_centers(id, name))
          `)
          .in('id', employeeIds)
          .eq('company_id', currentCompanyId!),
      ]);

      const itemsByTransaction = new Map<string, DotationTransactionItem[]>();
      for (const item of itemsResult.data || []) {
        if (!item.transaction_id) continue;
        if (!itemsByTransaction.has(item.transaction_id)) {
          itemsByTransaction.set(item.transaction_id, []);
        }
        itemsByTransaction.get(item.transaction_id)!.push({
          id: item.id,
          item_type: item.item_type,
          item_name: item.item_name,
          quantity: item.quantity,
          size: item.size,
          delivery_date: item.delivery_date,
          expiration_date: item.expiration_date,
        });
      }

      const employeeMap = new Map(
        (employeesResult.data || []).map((e: any) => {
          const currentWorkInfo = e.employee_work_info?.find((w: any) => w.is_current);
          return [e.id, {
            id: e.id,
            first_name: e.first_name,
            middle_name: e.middle_name,
            last_name: e.last_name,
            second_last_name: e.second_last_name,
            document_number: e.document_number,
            company_id: e.company_id,
            operation_centers: currentWorkInfo?.operation_centers || null,
          }];
        })
      );

      return transactions
        .map(t => {
          const employee = employeeMap.get(t.employee_id);
          if (!employee) return null;
          return {
            ...t,
            employees: employee,
            items: itemsByTransaction.get(t.id) || [],
          };
        })
        .filter(Boolean) as DotationTransaction[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateDotationTransaction() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      employee_id: string;
      delivery_date: string;
      delivered_by: string;
      observations: string | null;
    }) => {
      const { data, error } = await supabase
        .from('dotation_delivery_transactions')
        .insert({
          employee_id: params.employee_id,
          delivery_date: params.delivery_date,
          delivered_by: params.delivered_by,
          observations: params.observations,
          created_by: user?.id,
          company_id: currentCompanyId!,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
    },
  });
}

export function useDeleteDotationTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dotation_delivery_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dotation_deliveries'] });
    },
  });
}
