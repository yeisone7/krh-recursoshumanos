import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollConcept, PayrollConceptDraft, PayrollLaborConfig } from '@/types/payroll';
import { validateConcepts } from '@/lib/payrollConcepts';

const EMPTY_CONCEPTS: PayrollConcept[] = [];
export function usePayrollConcepts() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['payroll_concepts', currentCompanyId], enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_payroll_concepts', { p_company_id: currentCompanyId! });
      if (error) throw error;
      return data as unknown as PayrollConcept[];
    },
  });
}

export function usePayrollConceptEditor() {
  const { currentCompanyId } = useAuth();
  const query = usePayrollConcepts();
  const data = query.data ?? EMPTY_CONCEPTS;
  const [drafts, setDrafts] = useState<PayrollConceptDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = useRef(false);
  const company = useRef(currentCompanyId);
  useEffect(() => {
    if (company.current !== currentCompanyId) { company.current = currentCompanyId; dirty.current = false; setErrors({}); }
    if (!dirty.current) setDrafts(data.map(c => ({ ...c, percentage: String(c.percentage) })));
  }, [data, currentCompanyId]);
  const reset = useCallback(() => { dirty.current = false; setErrors({}); setDrafts(data.map(c => ({ ...c, percentage: String(c.percentage) }))); }, [data]);
  const change = (value: PayrollConceptDraft[]) => { dirty.current = true; setDrafts(value); setErrors({}); };
  const validate = () => {
    const next = validateConcepts(drafts); setErrors(next);
    if (Object.keys(next).length) throw new Error('Revise los campos indicados en Conceptos.');
    if (!query.isSuccess) throw new Error('Espere a que los conceptos terminen de cargar.');
    return drafts.map(({ has_novelties, ...c }, index) => ({ ...c, sort_order: index, name: c.name.trim(), identifier: c.identifier.trim(), percentage: Number(c.percentage) }));
  };
  return { ...query, drafts, change, errors, validate, reset, markSaved: () => { dirty.current = false; } };
}

export function useSavePayrollSettings() {
  const { currentCompanyId } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { config: Partial<PayrollLaborConfig>; concepts: PayrollConcept[]; expectedUpdatedAt: string | null }) => {
      const { data, error } = await supabase.rpc('save_payroll_settings', {
        p_company_id: currentCompanyId!, p_config: input.config as unknown as Json, p_concepts: input.concepts as unknown as Json,
        p_expected_updated_at: input.expectedUpdatedAt,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['payroll_labor_config'] });
      client.invalidateQueries({ queryKey: ['payroll_concepts'] });
      client.invalidateQueries({ queryKey: ['payroll_novelties'] });
    },
  });
}
