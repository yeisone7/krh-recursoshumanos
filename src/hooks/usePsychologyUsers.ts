import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PsychologyUser {
  id: string;
  full_name: string;
  display_name: string;
}

const normalizeRoleName = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const psychologyRoleNames = new Set(['sicologia', 'psicologia']);

export function usePsychologyUsers() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['psychology-users', currentCompanyId],
    queryFn: async (): Promise<PsychologyUser[]> => {
      if (!currentCompanyId) return [];

      const { data: companyRoles, error: rolesError } = await supabase
        .from('custom_roles')
        .select('id, name')
        .eq('company_id', currentCompanyId)
        .eq('is_active', true);

      if (rolesError) {
        console.error('Error fetching custom roles for Sicologia:', rolesError);
      }

      const psychologyRoleIds = (companyRoles || [])
        .filter((role) => psychologyRoleNames.has(normalizeRoleName(role.name)))
        .map((role) => role.id);

      let customUserIds: string[] = [];

      if (psychologyRoleIds.length > 0) {
        const { data: customAssignments, error: customError } = await supabase
          .from('user_custom_roles')
          .select('user_id')
          .in('role_id', psychologyRoleIds);

        if (customError) {
          console.error('Error fetching custom role assignments for Sicologia:', customError);
        }

        customUserIds = customAssignments?.map((assignment) => assignment.user_id) || [];
      }

      const { data: systemAssignments, error: systemError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'psicologo');

      if (systemError) {
        console.error('Error fetching system roles for psicologo:', systemError);
      }

      const systemUserIds = systemAssignments?.map((assignment) => assignment.user_id) || [];
      const combinedUserIds = Array.from(new Set([...customUserIds, ...systemUserIds]));

      if (combinedUserIds.length === 0) return [];

      const { data: statusData, error: statusError } = await supabase
        .from('user_status')
        .select('user_id, is_active')
        .in('user_id', combinedUserIds);

      if (statusError) {
        console.error('Error fetching user statuses:', statusError);
      }

      const inactiveUserIds = new Set(
        statusData?.filter((status) => status.is_active === false).map((status) => status.user_id) || []
      );
      const activeUserIds = combinedUserIds.filter((id) => !inactiveUserIds.has(id));

      if (activeUserIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, display_name')
        .in('id', activeUserIds)
        .order('full_name');

      if (profilesError) throw profilesError;

      return (profiles || [])
        .map((profile) => ({
          id: profile.id,
          full_name: profile.full_name || profile.display_name || 'Sin Nombre',
          display_name: profile.display_name || '',
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, 'es'));
    },
    enabled: !!currentCompanyId,
  });
}
