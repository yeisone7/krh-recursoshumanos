import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ExamTransactionItem {
  id: string;
  exam_catalog_id: string | null;
  exam_name: string;
  result: string;
  concept: string | null;
  restrictions: string | null;
  expiration_date: string | null;
  document_url: string | null;
}

export interface ExamTransaction {
  id: string;
  employee_id: string;
  exam_date: string;
  exam_type: string;
  provider: string | null;
  doctor_name: string | null;
  signature_url: string | null;
  document_url: string | null;
  observations: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    second_last_name?: string | null;
    document_number: string;
    document_type?: string;
    identification_types?: { id: string; name: string; code: string } | null;
    company_id: string;
    operation_centers?: { id: string; name: string } | null;
  };
  items: ExamTransactionItem[];
}

export function useExamTransactions() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['exam_transactions', currentCompanyId],
    queryFn: async (): Promise<ExamTransaction[]> => {
      const { data: transactions, error } = await supabase
        .from('exam_delivery_transactions' as any)
        .select('*')
        .order('exam_date', { ascending: false });

      if (error) throw error;
      if (!transactions?.length) return [];

      const txs = transactions as any[];
      const transactionIds = txs.map(t => t.id);
      const employeeIds = [...new Set(txs.map(t => t.employee_id))];

      const [itemsResult, employeesResult] = await Promise.all([
        supabase
          .from('exam_delivery_items' as any)
          .select('id, transaction_id, exam_catalog_id, exam_name, result, concept, restrictions, expiration_date, document_url')
          .in('transaction_id', transactionIds),
        supabase
          .from('employees_v2')
          .select(`
            id, first_name, middle_name, last_name, second_last_name, document_number, document_type, company_id,
            identification_types(id, name, code),
            employee_work_info(id, operation_center_id, is_current, operation_centers(id, name))
          `)
          .in('id', employeeIds)
          .eq('company_id', currentCompanyId!),
      ]);

      const itemsByTransaction = new Map<string, ExamTransactionItem[]>();
      for (const item of (itemsResult.data as any[]) || []) {
        if (!item.transaction_id) continue;
        if (!itemsByTransaction.has(item.transaction_id)) {
          itemsByTransaction.set(item.transaction_id, []);
        }
        itemsByTransaction.get(item.transaction_id)!.push({
          id: item.id,
          exam_catalog_id: item.exam_catalog_id,
          exam_name: item.exam_name,
          result: item.result,
          concept: item.concept,
          restrictions: item.restrictions,
          expiration_date: item.expiration_date,
          document_url: item.document_url,
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
            document_type: e.document_type,
            identification_types: e.identification_types,
            company_id: e.company_id,
            operation_centers: currentWorkInfo?.operation_centers || null,
          }];
        })
      );

      return txs
        .map(t => {
          const employee = employeeMap.get(t.employee_id);
          if (!employee) return null;
          return {
            ...t,
            employees: employee,
            items: itemsByTransaction.get(t.id) || [],
          };
        })
        .filter(Boolean) as ExamTransaction[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateExamTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      employee_id: string;
      exam_date: string;
      exam_type: string;
      provider: string | null;
      doctor_name: string | null;
      observations: string | null;
    }) => {
      const { data, error } = await supabase
        .from('exam_delivery_transactions' as any)
        .insert({
          employee_id: params.employee_id,
          exam_date: params.exam_date,
          exam_type: params.exam_type,
          provider: params.provider,
          doctor_name: params.doctor_name,
          observations: params.observations,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_transactions'] });
    },
  });
}

export function useCreateExamDeliveryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      transaction_id: string;
      exam_catalog_id: string | null;
      exam_name: string;
      result: string;
      concept?: string;
      restrictions?: string;
      expiration_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('exam_delivery_items' as any)
        .insert(item as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_transactions'] });
    },
  });
}

export function useDeleteExamTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('exam_delivery_transactions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_transactions'] });
    },
  });
}
