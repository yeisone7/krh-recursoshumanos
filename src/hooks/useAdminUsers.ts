import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  roles: AppRole[];
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

      // Build user objects - we'll use user_id as the identifier
      const usersMap = new Map<string, AdminUser>();

      userIds.forEach(userId => {
        usersMap.set(userId, {
          id: userId,
          email: '', // Will be populated if we have access
          created_at: '',
          roles: [],
          companies: [],
          centers: [],
        });
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
