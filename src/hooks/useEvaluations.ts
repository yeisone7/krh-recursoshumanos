import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { 
  EvaluationTemplate, 
  EvaluationCriteria, 
  EvaluationCycle, 
  PerformanceEvaluation,
  EvaluationScore,
  PerformanceGoal,
  EvaluationCycleStatus,
  EvaluationType,
  EvaluationStatus
} from '@/types/evaluation';

export function useEvaluations() {
  const { currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  // Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['evaluation-templates', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('evaluation_templates')
        .select('*, evaluation_criteria(*), evaluation_template_positions(position_id, positions(id, name))')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(t => ({
        ...t,
        criteria: [...((t as any).evaluation_criteria || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        positions: ((t as any).evaluation_template_positions || [])
          .map((etp: any) => etp.positions)
          .filter(Boolean),
        qualitative_questions: t.qualitative_questions as unknown as string[] | null,
        rating_scale: t.rating_scale as unknown as import('@/types/evaluation').RatingScaleItem[] | null,
      })) as unknown as EvaluationTemplate[];
    },
    enabled: !!currentCompanyId,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<EvaluationTemplate> & { criteria?: Partial<EvaluationCriteria>[]; position_ids?: string[] }) => {
      if (!currentCompanyId) throw new Error('No company ID');
      const { data, error } = await supabase.rpc('save_evaluation_template', {
        p_company_id: currentCompanyId,
        p_template_id: null,
        p_payload: template as unknown as import('@/integrations/supabase/types').Json,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
      toast.success('Plantilla creada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear plantilla: ' + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EvaluationTemplate> & { id: string; criteria?: Partial<EvaluationCriteria>[]; position_ids?: string[] }) => {
      if (!currentCompanyId) throw new Error('Selecciona una empresa');
      const { error } = await supabase.rpc('save_evaluation_template', {
        p_company_id: currentCompanyId,
        p_template_id: id,
        p_payload: data as unknown as import('@/integrations/supabase/types').Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
      toast.success('Plantilla actualizada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar plantilla: ' + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluation_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-templates'] });
      toast.success('Plantilla eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar plantilla: ' + error.message);
    },
  });

  // Cycles
  const { data: cycles = [], isLoading: loadingCycles } = useQuery({
    queryKey: ['evaluation-cycles', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('evaluation_cycles')
        .select('*, evaluation_templates(*)')
        .eq('company_id', currentCompanyId)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data.map(c => ({
        ...c,
        status: c.status as EvaluationCycleStatus,
        template: c.evaluation_templates as unknown as EvaluationTemplate | null,
      })) as EvaluationCycle[];
    },
    enabled: !!currentCompanyId,
  });

  const createCycle = useMutation({
    mutationFn: async (cycle: Partial<EvaluationCycle>) => {
      if (!currentCompanyId) throw new Error('No company ID');
      const { data, error } = await supabase
        .from('evaluation_cycles')
        .insert({ 
          name: cycle.name || '', 
          start_date: cycle.start_date || '', 
          end_date: cycle.end_date || '',
          company_id: currentCompanyId, 
          ...cycle 
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-cycles'] });
      toast.success('Ciclo de evaluación creado');
    },
    onError: (error) => {
      toast.error('Error al crear ciclo: ' + error.message);
    },
  });

  const updateCycle = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EvaluationCycle> & { id: string }) => {
      const { error } = await supabase
        .from('evaluation_cycles')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-cycles'] });
      toast.success('Ciclo actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar ciclo: ' + error.message);
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evaluation_cycles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-cycles'] });
      toast.success('Ciclo eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar ciclo: ' + error.message);
    },
  });

  // Evaluations
  const { data: evaluations = [], isLoading: loadingEvaluations } = useQuery({
    queryKey: ['performance-evaluations', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('performance_evaluations')
        .select(`
          *,
          employees_v2!inner(
            id, first_name, last_name, document_number, company_id,
            employee_work_info(is_current, operation_center_id, operation_centers(id, name))
          ),
          evaluation_cycles!inner(*)
        `)
        .eq('employees_v2.company_id', currentCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(e => {
        const empData = e.employees_v2 as any;
        const workInfo = Array.isArray(empData.employee_work_info) ? (empData.employee_work_info.find((row: { is_current?: boolean }) => row.is_current) || empData.employee_work_info[0]) : empData.employee_work_info;
        const centerName = workInfo?.operation_centers?.name || null;
        return {
          ...e,
          evaluation_type: e.evaluation_type as EvaluationType,
          status: e.status as EvaluationStatus,
          employee: {
            id: empData.id,
            first_name: empData.first_name,
            last_name: empData.last_name,
            document_number: empData.document_number,
          },
          cycle: e.evaluation_cycles,
          operation_center_name: centerName,
        };
      }) as (PerformanceEvaluation & { operation_center_name: string | null })[];
    },
    enabled: !!currentCompanyId,
  });

  const createEvaluation = useMutation({
    mutationFn: async (evaluation: Partial<PerformanceEvaluation>) => {
      const { data, error } = await supabase
        .from('performance_evaluations')
        .insert({
          cycle_id: evaluation.cycle_id || '',
          employee_id: evaluation.employee_id || '',
          ...evaluation,
          company_id: currentCompanyId!,
          status: 'pending',
          overall_score: null,
          overall_rating: null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-scores'] });
      toast.success('Evaluación creada');
    },
    onError: (error) => {
      toast.error('Error al crear evaluación: ' + error.message);
    },
  });

  const updateEvaluation = useMutation({
    mutationFn: async ({ id, scores, ...data }: Partial<PerformanceEvaluation> & { id: string; scores?: Partial<EvaluationScore>[] }) => {
      if (scores !== undefined) {
        const { error } = await supabase.rpc('save_performance_evaluation', {
          p_id: id,
          p_payload: data as unknown as import('@/integrations/supabase/types').Json,
          p_scores: scores as unknown as import('@/integrations/supabase/types').Json,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('performance_evaluations').update(data).eq('id', id).select('id').single();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-scores'] });
      toast.success('Evaluación actualizada');
    },
    onError: (error) => {
      toast.error('Error al actualizar evaluación: ' + error.message);
    },
  });

  const deleteEvaluation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('performance_evaluations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-scores'] });
      toast.success('Evaluación eliminada');
    },
    onError: (error) => {
      toast.error('Error al eliminar evaluación: ' + error.message);
    },
  });

  // Goals
  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['performance-goals', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('performance_goals')
        .select(`
          *,
          employees_v2!inner(id, first_name, last_name, company_id)
        `)
        .eq('employees_v2.company_id', currentCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(g => ({
        ...g,
        employee: g.employees_v2,
      })) as PerformanceGoal[];
    },
    enabled: !!currentCompanyId,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: Partial<PerformanceGoal>) => {
      const { data, error } = await supabase
        .from('performance_goals')
        .insert({
          employee_id: goal.employee_id || '',
          title: goal.title || '',
          ...goal
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      toast.success('Objetivo creado');
    },
    onError: (error) => {
      toast.error('Error al crear objetivo: ' + error.message);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PerformanceGoal> & { id: string }) => {
      const { error } = await supabase
        .from('performance_goals')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      toast.success('Objetivo actualizado');
    },
    onError: (error) => {
      toast.error('Error al actualizar objetivo: ' + error.message);
    },
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('performance_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-goals'] });
      toast.success('Objetivo eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar objetivo: ' + error.message);
    },
  });

  return {
    // Templates
    templates,
    loadingTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    // Cycles
    cycles,
    loadingCycles,
    createCycle,
    updateCycle,
    deleteCycle,
    // Evaluations
    evaluations,
    loadingEvaluations,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    // Goals
    goals,
    loadingGoals,
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
