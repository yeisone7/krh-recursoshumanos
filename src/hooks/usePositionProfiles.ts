import { todayDateOnlyString } from '@/lib/dateOnly';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PositionProfileFormData } from '@/types/positionProfile';

export function usePositionProfiles(positionId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['position_profiles', currentCompanyId, positionId],
    queryFn: async () => {
      let query = supabase
        .from('position_profiles')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .order('version', { ascending: false });

      if (positionId) {
        query = query.eq('position_id', positionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId,
  });
}

export function useCurrentPositionProfile(positionId?: string) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['position_profile_current', currentCompanyId, positionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('position_profiles')
        .select('*')
        .eq('company_id', currentCompanyId!)
        .eq('position_id', positionId!)
        .eq('is_current', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!currentCompanyId && !!positionId,
  });
}

export function useCreatePositionProfile() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ positionId, data, nextVersion }: { positionId: string; data: PositionProfileFormData; nextVersion: number }) => {
      const { data: result, error } = await supabase
        .from('position_profiles')
        .insert({
          company_id: currentCompanyId!,
          position_id: positionId,
          version: nextVersion,
          is_current: true,
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
          elaborated_by: data.elaborated_by,
          reviewed_by: data.reviewed_by,
          approved_by: data.approved_by,
          effective_date: data.effective_date || todayDateOnlyString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['position_profile_current'] });
    },
  });
}

export function useUpdatePositionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: PositionProfileFormData }) => {
      const { data: result, error } = await supabase
        .from('position_profiles')
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
          elaborated_by: data.elaborated_by,
          reviewed_by: data.reviewed_by,
          approved_by: data.approved_by,
          effective_date: data.effective_date || todayDateOnlyString(),
        })
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['position_profile_current'] });
    },
  });
}

export function useDeletePositionProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('position_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['position_profiles'] });
      queryClient.invalidateQueries({ queryKey: ['position_profile_current'] });
    },
  });
}
