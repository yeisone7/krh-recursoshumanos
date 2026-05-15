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
  custom_roles: string[];
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
  const { currentCompanyId, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['admin-users', currentCompanyId, isSuperAdmin],
    queryFn: async (): Promise<AdminUser[]> => {
      // Si no hay empresa y no es super admin, no retornamos nada
      if (!currentCompanyId && !isSuperAdmin) return [];

      let userIds: string[] = [];

      if (isSuperAdmin) {
        // Super Admin ve a TODOS los usuarios registrados, estén asignados o no
        const { data: allUsers, error: allUsersError } = await supabase
          .from('user_profiles')
          .select('id');
        
        if (allUsersError) throw allUsersError;
        userIds = allUsers?.map(u => u.id) || [];
      } else {
        // Admins normales solo ven usuarios asignados a su empresa
        const { data: companyUsers, error: companyError } = await supabase
          .from('user_company_assignments')
          .select('user_id')
          .eq('company_id', currentCompanyId!);

        if (companyError) throw companyError;
        userIds = companyUsers?.map(u => u.user_id) || [];
      }
      
      if (userIds.length === 0) return [];

      // Use batching for all queries that use userIds to avoid URL length limits (400 Bad Request)
      const { batchQuery } = await import('@/utils/supabaseBatch');

      // 1. Fetch roles
      const { data: rolesData, error: rolesError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase.from('user_roles').select('user_id, role').in('user_id', chunk)
      );
      if (rolesError) throw rolesError;

      // 2. Fetch custom roles - Optimization: Filter by company_id
      const { data: customRolesData, error: customRolesError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase
          .from('user_custom_roles')
          .select('user_id, custom_roles!inner(name, company_id)')
          .in('user_id', chunk)
          .eq('custom_roles.company_id', currentCompanyId)
      );
      if (customRolesError) throw customRolesError;

      // 3. Fetch company assignments
      const { data: companyAssignments, error: assignError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase
          .from('user_company_assignments')
          .select('user_id, company_id, companies(id, name)')
          .in('user_id', chunk)
      );
      if (assignError) throw assignError;

      // 4. Fetch center assignments
      const { data: centerAssignments, error: centerError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase
          .from('user_center_assignments')
          .select('user_id, operation_center_id, operation_centers(id, name, companies(name))')
          .in('user_id', chunk)
      );
      if (centerError) throw centerError;

      // 5. Fetch user status
      const { data: statusData, error: statusError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase
          .from('user_status')
          .select('user_id, is_active, deactivated_at, deactivation_reason')
          .in('user_id', chunk)
      );
      if (statusError) throw statusError;

      // 6. Fetch user profiles
      const { data: profilesData, error: profilesError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase
          .from('user_profiles')
          .select('id, full_name, display_name, avatar_url')
          .in('id', chunk)
      );
      if (profilesError) throw profilesError;

      // 7. Fetch employee links
      const { data: employeeLinks, error: linksError } = await batchQuery(
        userIds,
        100,
        (chunk) => supabase
          .from('employee_user_links')
          .select(`
            user_id,
            employee_id,
            employees_v2!employee_user_links_employee_id_fkey(
              first_name, 
              middle_name,
              last_name, 
              second_last_name,
              employee_contact(email)
            )
          `)
          .in('user_id', chunk)
          .eq('is_active', true)
      );
      if (linksError) throw linksError;

      // Build user objects
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
          custom_roles: [],
          is_active: true,
          companies: [],
          centers: [],
        });
      });

      // Add profile data
      profilesData?.forEach(p => {
        const user = usersMap.get(p.id);
        if (user) {
          user.full_name = p.full_name || '';
          user.display_name = p.display_name || '';
          user.avatar_url = p.avatar_url || undefined;
        }
      });

      // Add employee link data
      employeeLinks?.forEach(link => {
        const user = usersMap.get(link.user_id);
        if (user && link.employees_v2) {
          const emp = link.employees_v2 as any;
          if (!user.full_name) {
            const fullName = [
              emp.first_name,
              emp.middle_name,
              emp.last_name,
              emp.second_last_name
            ].filter(Boolean).join(' ');
            user.full_name = fullName || '';
          }
          if (!user.email && emp.employee_contact) {
            const contact = Array.isArray(emp.employee_contact) 
              ? emp.employee_contact[0] 
              : emp.employee_contact;
            user.email = contact?.email || '';
          }
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

      customRolesData?.forEach((r: any) => {
        const user = usersMap.get(r.user_id);
        if (user && r.custom_roles?.name) {
          user.custom_roles.push(r.custom_roles.name);
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
