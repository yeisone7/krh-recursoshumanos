import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  roles: AppRole[];
  is_active: boolean;
  deactivated_at?: string;
  deactivation_reason?: string;
  companies: {
    id: string;
    name: string;
  }[];
  centers: {
    id: string;
    name: string;
    company_name: string;
  }[];
}

export function useAdminUsers() {
  const { currentCompanyId, isAdmin } = useAuth();

  return useQuery({
    queryKey: ['admin-users', currentCompanyId],
    queryFn: async (): Promise<AdminUser[]> => {
      // First get users assigned to the current company
      const { data: companyUsers, error: companyError } = await supabase
        .from('user_company_assignments')
        .select('user_id')
        .eq('company_id', currentCompanyId!);

      if (companyError) throw companyError;

      const userIds = companyUsers?.map(u => u.user_id) || [];
      
      if (userIds.length === 0) return [];

      // Fetch roles for these users
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Fetch company assignments
      const { data: companyAssignments, error: assignError } = await supabase
        .from('user_company_assignments')
        .select('user_id, company_id, companies(id, name)')
        .in('user_id', userIds);

      if (assignError) throw assignError;

      // Fetch center assignments
      const { data: centerAssignments, error: centerError } = await supabase
        .from('user_center_assignments')
        .select('user_id, operation_center_id, operation_centers(id, name, companies(name))')
        .in('user_id', userIds);

      if (centerError) throw centerError;

      // Fetch user status (active/inactive)
      const { data: statusData, error: statusError } = await supabase
        .from('user_status')
        .select('user_id, is_active, deactivated_at, deactivation_reason')
        .in('user_id', userIds);

      if (statusError) throw statusError;

      // Fetch user profiles for names and avatars
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, display_name, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Fetch employee links for fallback names
      const { data: employeeLinks, error: linksError } = await supabase
        .from('employee_user_links')
        .select(`
          user_id,
          employee_id,
          employees_v2!employee_user_links_employee_id_fkey(
            first_name, last_name
          )
        `)
        .in('user_id', userIds)
        .eq('is_active', true);

      if (linksError) throw linksError;

      // Build user objects - we'll use user_id as the identifier
      const usersMap = new Map<string, AdminUser>();

      userIds.forEach(userId => {
        usersMap.set(userId, {
          id: userId,
          email: '',
          full_name: '',
          display_name: '',
          avatar_url: undefined,
          created_at: '',
          roles: [],
          is_active: true,
          companies: [],
          centers: [],
        });
      });

      // Add profile data (primary source for names)
      profilesData?.forEach(p => {
        const user = usersMap.get(p.id);
        if (user) {
          user.full_name = p.full_name || '';
          user.display_name = p.display_name || '';
          user.avatar_url = p.avatar_url || undefined;
        }
      });

      // Add employee link data as fallback for names
      employeeLinks?.forEach(link => {
        const user = usersMap.get(link.user_id);
        if (user && !user.full_name && link.employees_v2) {
          const emp = link.employees_v2 as { first_name: string; last_name: string };
          user.full_name = `${emp.first_name} ${emp.last_name}`.trim();
        }
      });

      // Add status
      statusData?.forEach(s => {
        const user = usersMap.get(s.user_id);
        if (user) {
          user.is_active = s.is_active;
          user.deactivated_at = s.deactivated_at || undefined;
          user.deactivation_reason = s.deactivation_reason || undefined;
        }
      });

      // Add roles
      rolesData?.forEach(r => {
        const user = usersMap.get(r.user_id);
        if (user) {
          user.roles.push(r.role);
        }
      });

      // Add companies
      companyAssignments?.forEach(a => {
        const user = usersMap.get(a.user_id);
        if (user && a.companies) {
          const exists = user.companies.some(c => c.id === a.companies!.id);
          if (!exists) {
            user.companies.push({
              id: a.companies.id,
              name: a.companies.name,
            });
          }
        }
      });

      // Add centers
      centerAssignments?.forEach(a => {
        const user = usersMap.get(a.user_id);
        if (user && a.operation_centers) {
          user.centers.push({
            id: a.operation_centers.id,
            name: a.operation_centers.name,
            company_name: (a.operation_centers as any).companies?.name || '',
          });
        }
      });

      return Array.from(usersMap.values());
    },
    enabled: !!currentCompanyId && isAdmin,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useAssignCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      const { data, error } = await supabase
        .from('user_company_assignments')
        .insert({ user_id: userId, company_id: companyId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useRemoveCompanyAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, companyId }: { userId: string; companyId: string }) => {
      const { error } = await supabase
        .from('user_company_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useAssignCenter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, centerId }: { userId: string; centerId: string }) => {
      const { data, error } = await supabase
        .from('user_center_assignments')
        .insert({ user_id: userId, operation_center_id: centerId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useRemoveCenterAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, centerId }: { userId: string; centerId: string }) => {
      const { error } = await supabase
        .from('user_center_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('operation_center_id', centerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useLinkEmployeeToUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ employeeId, userId }: { employeeId: string; userId: string }) => {
      // First check if already linked
      const { data: existing } = await supabase
        .from('employee_user_links')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existing) {
        throw new Error('Este empleado ya está vinculado a un usuario');
      }

      // Create the link
      const { data, error } = await supabase
        .from('employee_user_links')
        .insert({
          employee_id: employeeId,
          user_id: userId,
          linked_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['employee-links'] });
    },
  });
}

export function useUnlinkEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employee_user_links')
        .delete()
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['employee-links'] });
    },
  });
}

export function useEmployeeLinks(companyId: string | null) {
  return useQuery({
    queryKey: ['employee-links', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_user_links')
        .select(`
          *,
          employees_v2!employee_user_links_employee_id_fkey(
            id, first_name, last_name, document_number, company_id
          )
        `);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      isActive, 
      reason 
    }: { 
      userId: string; 
      isActive: boolean; 
      reason?: string 
    }) => {
      // Check if status record exists
      const { data: existing } = await supabase
        .from('user_status')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('user_status')
          .update({
            is_active: isActive,
            deactivated_at: isActive ? null : new Date().toISOString(),
            deactivated_by: isActive ? null : user?.id,
            deactivation_reason: isActive ? null : reason,
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('user_status')
          .insert({
            user_id: userId,
            is_active: isActive,
            deactivated_at: isActive ? null : new Date().toISOString(),
            deactivated_by: isActive ? null : user?.id,
            deactivation_reason: isActive ? null : reason,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}
