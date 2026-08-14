import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TrainingCompletion, TrainingGroupAssignment } from '@/types/training';

const groupsTable = () => supabase.from('training_group_assignments');
const participantsTable = () => supabase.from('training_group_participants');

export interface TrainingGroupEmployeeOption {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  second_last_name: string | null;
  document_number: string;
  centerId: string | null;
  centerName: string;
  areaId: string | null;
  areaName: string;
  positionId: string | null;
  positionName: string;
}

export function useTrainingGroupAssignments() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['training-group-assignments', currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data: assignments, error } = await groupsTable()
        .select('*, course:training_courses(*), token:training_access_tokens(id,token,is_active,expires_at)')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!assignments?.length) return [] as TrainingGroupAssignment[];

      const { data: participants, error: participantError } = await participantsTable()
        .select(`
          *,
          employee:employees_v2(
            id,first_name,middle_name,last_name,second_last_name,document_number,is_active,status,
            employee_work_info(operation_center_id,area_id,position_id,position_name,is_current,operation_centers(id,name),areas(id,name))
          ),
          completion:training_completions(id,completed_at,quiz_score)
        `)
        .in('assignment_id', assignments.map((item) => item.id));
      if (participantError) throw participantError;
      const byAssignment = new Map<string, NonNullable<typeof participants>>();
      for (const participant of participants || []) {
        if (participant.employee) {
          participant.employee.employee_work_info = (participant.employee.employee_work_info || []).filter((item) => item.is_current);
        }
        const current = byAssignment.get(participant.assignment_id) || [];
        current.push(participant);
        byAssignment.set(participant.assignment_id, current);
      }
      return assignments.map((assignment) => ({
        ...assignment,
        participants: byAssignment.get(assignment.id) || [],
      })) as TrainingGroupAssignment[];
    },
  });
}

export async function fetchTrainingGroupReportCompletions(completionIds: string[]) {
  if (!completionIds.length) return [] as TrainingCompletion[];

  const { data, error } = await supabase
    .from('training_completions')
    .select('id,company_id,course_id,token_id,employee_id,completed_at,operator_name,operator_cedula,signature_data,quiz_score,ip_address,user_agent')
    .in('id', completionIds);

  if (error) throw error;
  return (data || []) as TrainingCompletion[];
}

export function useTrainingGroupEmployeeOptions() {
  const { currentCompanyId, assignedCenterIds, isAdmin, isSuperAdmin } = useAuth();
  const limitCenters = !isAdmin && !isSuperAdmin && assignedCenterIds.length > 0;
  return useQuery({
    queryKey: ['training-group-employee-options', currentCompanyId, assignedCenterIds.join(','), limitCenters],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees_v2')
        .select(`
          id,first_name,middle_name,last_name,second_last_name,document_number,
          employee_work_info!inner(operation_center_id,area_id,position_id,position_name,is_current,operation_centers(id,name),areas(id,name))
        `)
        .eq('company_id', currentCompanyId!)
        .eq('is_active', true)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []).flatMap((employee) => {
        const work = employee.employee_work_info?.find((item) => item.is_current);
        if (!work || (limitCenters && !assignedCenterIds.includes(work.operation_center_id))) return [];
        return [{
          id: employee.id,
          first_name: employee.first_name,
          middle_name: employee.middle_name,
          last_name: employee.last_name,
          second_last_name: employee.second_last_name,
          document_number: employee.document_number,
          centerId: work.operation_center_id,
          centerName: work.operation_centers?.name || 'Sin centro',
          areaId: work.area_id,
          areaName: work.areas?.name || 'Sin área',
          positionId: work.position_id,
          positionName: work.position_name || 'Sin cargo',
        }];
      }) as TrainingGroupEmployeeOption[];
    },
  });
}

function useGroupMutation<TArgs>(mutationFn: (args: TArgs) => Promise<unknown>, successKeys: string[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-group-assignments'] });
      successKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
    },
  });
}

export const useCreateTrainingGroup = () => useGroupMutation(
  async (args: { payload: Record<string, unknown> }) => {
    const { data, error } = await supabase.rpc('create_training_group_assignment', { payload: args.payload });
    if (error) throw error;
    return data;
  }, ['training_access_tokens'],
);
export const useUpdateTrainingGroup = () => useGroupMutation(
  async (args: { assignment_id_value: string; payload: Record<string, unknown> }) => {
    const { data, error } = await supabase.rpc('update_training_group_assignment', args);
    if (error) throw error;
    return data;
  }, ['training_access_tokens'],
);
export const useCloseTrainingGroup = () => useGroupMutation(
  async (args: { assignment_id_value: string }) => {
    const { data, error } = await supabase.rpc('close_training_group_assignment', args);
    if (error) throw error;
    return data;
  }, ['training_access_tokens'],
);
export const useDeleteTrainingGroupLink = () => useGroupMutation(
  async (args: { assignment_id_value: string }) => {
    const { data, error } = await supabase.rpc('delete_training_group_link', args);
    if (error) throw error;
    return data;
  }, ['training_access_tokens'],
);
export const useRegenerateTrainingGroupLink = () => useGroupMutation(
  async (args: { assignment_id_value: string; expires_at_value: string }) => {
    const { data, error } = await supabase.rpc('regenerate_training_group_link', args);
    if (error) throw error;
    return data;
  }, ['training_access_tokens'],
);
