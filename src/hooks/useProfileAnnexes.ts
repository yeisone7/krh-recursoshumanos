import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PositionProfileAnnexFormData } from '@/types/positionProfile';

export function useProfileAnnexes(profileId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['profile_annexes', currentCompanyId, profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('position_profile_annexes')
        .select('*, operation_centers(id, name)')
        .eq('company_id', currentCompanyId!)
        .eq('profile_id', profileId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId && !!profileId,
  });
}

export function useCreateProfileAnnex() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: PositionProfileAnnexFormData }) => {
      const { data: result, error } = await supabase
        .from('position_profile_annexes')
        .insert({
          company_id: currentCompanyId!,
          profile_id: profileId,
          operation_center_id: data.operation_center_id,
          purpose: data.purpose,
          reports_to: data.reports_to,
          supervises: data.supervises,
          num_positions: data.num_positions,
          education_level: data.education_level,
          education_detail: data.education_detail,
          experience: data.experience,
          specific_knowledge: data.specific_knowledge as any,
          skills: data.skills as any,
          functions: data.functions as any,
          responsibilities: data.responsibilities as any,
          working_conditions: data.working_conditions as any,
          notes: data.notes,
          created_by: user?.id,
        })
        .select('*, operation_centers(id, name)')
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile_annexes'] });
    },
  });
}

export function useUpdateProfileAnnex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ annexId, data }: { annexId: string; data: Omit<PositionProfileAnnexFormData, 'operation_center_id'> }) => {
      const { data: result, error } = await supabase
        .from('position_profile_annexes')
        .update({
          purpose: data.purpose,
          reports_to: data.reports_to,
          supervises: data.supervises,
          num_positions: data.num_positions,
          education_level: data.education_level,
          education_detail: data.education_detail,
          experience: data.experience,
          specific_knowledge: data.specific_knowledge as any,
          skills: data.skills as any,
          functions: data.functions as any,
          responsibilities: data.responsibilities as any,
          working_conditions: data.working_conditions as any,
          notes: data.notes,
        })
        .eq('id', annexId)
        .select('*, operation_centers(id, name)')
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile_annexes'] });
    },
  });
}

export function useDeleteProfileAnnex() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (annexId: string) => {
      const { error } = await supabase
        .from('position_profile_annexes')
        .delete()
        .eq('id', annexId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile_annexes'] });
    },
  });
}
