import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfesiogramaItem {
  id: string;
  dotation_item_type_id: string;
  quantity: number;
  notes: string | null;
  is_required: boolean;
  dotation_item_types?: {
    id: string;
    name: string;
    code: string | null;
    category: string;
    requires_size: boolean | null;
    sizes_available: string[] | null;
    default_validity_months: number | null;
  };
}

export interface Profesiograma {
  id: string;
  company_id: string;
  operation_center_id: string;
  position_id: string;
  created_at: string;
  updated_at: string;
  operation_centers?: { id: string; name: string };
  positions?: { id: string; name: string };
  items: ProfesiogramaItem[];
}

export function useProfesiogramas() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_profesiograma', currentCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_profesiogramas_with_items', { _company_id: currentCompanyId! });

      if (error) throw error;

      return (data as any[] || []) as Profesiograma[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useProfesiogramaByEmployee(employeeId: string | undefined) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_profesiograma_employee', employeeId, currentCompanyId],
    queryFn: async () => {
      if (!employeeId || !currentCompanyId) return null;

      // Get employee work info
      const { data: workInfo } = await supabase
        .from('employee_work_info')
        .select('operation_center_id, position_id')
        .eq('employee_id', employeeId)
        .eq('is_current', true)
        .maybeSingle();

      if (!workInfo?.operation_center_id || !workInfo?.position_id) return null;

      // Find matching profesiograma
      const { data: prof } = await supabase
        .from('dotation_profesiograma' as any)
        .select('id')
        .eq('company_id', currentCompanyId)
        .eq('operation_center_id', workInfo.operation_center_id)
        .eq('position_id', workInfo.position_id)
        .maybeSingle();

      if (!prof) return null;

      // Get items
      const { data: items } = await supabase
        .from('dotation_profesiograma_items' as any)
        .select(`
          id, dotation_item_type_id, quantity, notes, is_required,
          dotation_item_types(id, name, code, category, requires_size, sizes_available, default_validity_months)
        `)
        .eq('profesiograma_id', (prof as any).id);

      return {
        profesiogramaId: (prof as any).id,
        items: (items as any[]) || [],
      };
    },
    enabled: !!employeeId && !!currentCompanyId,
  });
}

export function useCreateProfesiograma() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      operation_center_id: string;
      position_id: string;
      items: { dotation_item_type_id: string; quantity: number; notes?: string; is_required?: boolean }[];
    }) => {
      const { data: prof, error } = await supabase
        .from('dotation_profesiograma' as any)
        .insert({
          company_id: currentCompanyId!,
          operation_center_id: data.operation_center_id,
          position_id: data.position_id,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      if (data.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('dotation_profesiograma_items' as any)
          .insert(
            data.items.map((item) => ({
              company_id: currentCompanyId!,
              profesiograma_id: (prof as any).id,
              dotation_item_type_id: item.dotation_item_type_id,
              quantity: item.quantity,
              notes: item.notes || null,
              is_required: item.is_required !== false,
            })) as any
          );
        if (itemsError) throw itemsError;
      }

      return prof;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_profesiograma'] });
    },
  });
}

export function useUpdateProfesiograma() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      items: { dotation_item_type_id: string; quantity: number; notes?: string; is_required?: boolean }[];
    }) => {
      // Delete existing items
      await supabase
        .from('dotation_profesiograma_items' as any)
        .delete()
        .eq('profesiograma_id', data.id);

      // Insert new items
      if (data.items.length > 0) {
        const { error } = await supabase
          .from('dotation_profesiograma_items' as any)
          .insert(
            data.items.map((item) => ({
              company_id: currentCompanyId!,
              profesiograma_id: data.id,
              dotation_item_type_id: item.dotation_item_type_id,
              quantity: item.quantity,
              notes: item.notes || null,
              is_required: item.is_required !== false,
            })) as any
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_profesiograma'] });
    },
  });
}

export function useDeleteProfesiograma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dotation_profesiograma' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dotation_profesiograma'] });
    },
  });
}

export interface CoverageByCenter {
  centerId: string;
  centerName: string;
  total: number;
  covered: number;
  percentage: number;
}

export function useProfesiogramaCoverage() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['dotation_profesiograma_coverage', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];

      // Get all active employees with their center+position
      const { data: employees } = await supabase
        .from('employee_work_info')
        .select('employee_id, operation_center_id, position_id, employees_v2!inner(company_id, is_active)')
        .eq('is_current', true)
        .eq('employees_v2.company_id', currentCompanyId)
        .eq('employees_v2.is_active', true);

      if (!employees || employees.length === 0) return [];

      // Get all profesiogramas for this company
      const { data: profs } = await supabase
        .from('dotation_profesiograma' as any)
        .select('operation_center_id, position_id')
        .eq('company_id', currentCompanyId);

      const profKeys = new Set(
        ((profs as any[]) || []).map((p: any) => `${p.operation_center_id}|${p.position_id}`)
      );

      // Get center names
      const { data: centers } = await supabase
        .from('operation_centers')
        .select('id, name')
        .eq('company_id', currentCompanyId);

      const centerNameMap = new Map((centers || []).map(c => [c.id, c.name]));

      // Group employees by center
      const byCenter = new Map<string, { total: number; covered: number }>();

      for (const emp of employees as any[]) {
        const centerId = emp.operation_center_id;
        if (!centerId) continue;

        if (!byCenter.has(centerId)) {
          byCenter.set(centerId, { total: 0, covered: 0 });
        }
        const entry = byCenter.get(centerId)!;
        entry.total++;

        if (emp.position_id && profKeys.has(`${centerId}|${emp.position_id}`)) {
          entry.covered++;
        }
      }

      const result: CoverageByCenter[] = [];
      for (const [centerId, stats] of byCenter) {
        result.push({
          centerId,
          centerName: centerNameMap.get(centerId) || 'Desconocido',
          total: stats.total,
          covered: stats.covered,
          percentage: stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0,
        });
      }

      return result.sort((a, b) => a.centerName.localeCompare(b.centerName));
    },
    enabled: !!currentCompanyId,
  });
}
