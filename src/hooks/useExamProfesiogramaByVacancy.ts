import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ExamProfesiogramaItem {
  id: string;
  exam_catalog_id: string;
  notes: string | null;
  is_required: boolean;
  exam_catalog?: {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
  };
}

/**
 * Hook to fetch exam profesiograma items by operation center + position
 * Used in selection flow where no employee exists yet
 */
export function useExamProfesiogramaByVacancy(
  operationCenterId: string | undefined,
  positionId: string | undefined
) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['exam_profesiograma_vacancy', operationCenterId, positionId, currentCompanyId],
    queryFn: async () => {
      if (!operationCenterId || !positionId || !currentCompanyId) return null;

      const { data: prof } = await supabase
        .from('exam_profesiograma' as any)
        .select('id')
        .eq('company_id', currentCompanyId)
        .eq('operation_center_id', operationCenterId)
        .eq('position_id', positionId)
        .maybeSingle();

      if (!prof) return null;

      const { data: items } = await supabase
        .from('exam_profesiograma_items' as any)
        .select(`
          id, exam_catalog_id, notes, is_required,
          exam_catalog(id, name, code, description)
        `)
        .eq('profesiograma_id', (prof as any).id);

      return {
        profesiogramaId: (prof as any).id,
        items: (items as any[] || []) as ExamProfesiogramaItem[],
      };
    },
    enabled: !!operationCenterId && !!positionId && !!currentCompanyId,
  });
}
