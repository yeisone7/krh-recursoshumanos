import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PsychologyUser {
  id: string;
  full_name: string;
  display_name: string;
}

export function usePsychologyUsers() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['psychology-users', currentCompanyId],
    queryFn: async (): Promise<PsychologyUser[]> => {
      if (!currentCompanyId) return [];

      // 1. Fetch custom role "Sicología" assignments for the current company
      const { data: customAssignments, error: customError } = await supabase
        .from('user_custom_roles')
        .select(`
          user_id,
          custom_roles!inner(name, company_id)
        `)
        .eq('custom_roles.company_id', currentCompanyId)
        .eq('custom_roles.name', 'Sicología');

      if (customError) {
        console.error('Error fetching custom roles for Sicología:', customError);
      }

      // 2. Fetch system role "psicologo" assignments
      const { data: systemAssignments, error: systemError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'psicologo');

      if (systemError) {
        console.error('Error fetching system roles for psicologo:', systemError);
      }

      const customUserIds = customAssignments?.map(a => a.user_id) || [];
      const systemUserIds = systemAssignments?.map(a => a.user_id) || [];
      
      const combinedUserIds = Array.from(new Set([...customUserIds, ...systemUserIds]));

      if (combinedUserIds.length === 0) return [];

      // 3. Fetch only active users
      const { data: statusData, error: statusError } = await supabase
        .from('user_status')
        .select('user_id, is_active')
        .in('user_id', combinedUserIds);

      if (statusError) {
        console.error('Error fetching user statuses:', statusError);
      }

      const inactiveUserIds = new Set(
        statusData?.filter(s => s.is_active === false).map(s => s.user_id) || []
      );
      
      const activeUserIds = combinedUserIds.filter(id => !inactiveUserIds.has(id));

      if (activeUserIds.length === 0) return [];

      // 4. Fetch profiles for active users
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, display_name')
        .in('id', activeUserIds)
        .order('full_name');

      if (profilesError) throw profilesError;

      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || p.display_name || 'Sin Nombre',
        display_name: p.display_name || '',
      }));
    },
    enabled: !!currentCompanyId,
  });
}
