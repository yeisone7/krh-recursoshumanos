import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLogAction } from '@/hooks/useAuditLog';

// Types
export interface Module {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Permission {
  id: string;
  module_id: string;
  action: 'view' | 'create' | 'update' | 'delete';
  description: string | null;
}

export interface CustomRole {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface RolePermissionEntry {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface UserCustomRole {
  id: string;
  user_id: string;
  role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  role?: CustomRole;
}

// --- Modules ---
export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as Module[];
    },
  });
}

// --- Permissions ---
export function usePermissionsCatalog() {
  return useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*');
      if (error) throw error;
      return data as Permission[];
    },
  });
}

// --- Custom Roles ---
export function useCustomRoles() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ['custom-roles', currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('is_system', { ascending: false })
        .order('name');
      if (error) throw error;

      // Get user counts per role
      const { data: userRoles } = await supabase
        .from('user_custom_roles')
        .select('role_id');

      const countMap: Record<string, number> = {};
      userRoles?.forEach(ur => {
        countMap[ur.role_id] = (countMap[ur.role_id] || 0) + 1;
      });

      return (data as CustomRole[]).map(r => ({
        ...r,
        user_count: countMap[r.id] || 0,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { company_id: string; name: string; description?: string; created_by?: string }) => {
      const { data: result, error } = await supabase
        .from('custom_roles')
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rol creado exitosamente');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from('custom_roles')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rol actualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rol eliminado');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// --- Role Permissions ---
export function useRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      if (!roleId) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', roleId);
      if (error) throw error;
      return data as RolePermissionEntry[];
    },
    enabled: !!roleId,
  });
}

export function useSetRolePermissions() {
  const qc = useQueryClient();
  const logAction = useLogAction();
  return useMutation({
    mutationFn: async ({ roleId, permissionIds, roleName }: { roleId: string; permissionIds: string[]; roleName?: string }) => {
      // Delete all existing
      const { error: delError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);
      if (delError) throw delError;

      // Insert new ones
      if (permissionIds.length > 0) {
        const rows = permissionIds.map(pid => ({ role_id: roleId, permission_id: pid }));
        const { error: insError } = await supabase
          .from('role_permissions')
          .insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['role-permissions', vars.roleId] });
      toast.success('Permisos actualizados');
      logAction.mutate({
        action: 'update',
        entityType: 'role',
        entityId: vars.roleId,
        entityName: vars.roleName,
        newValues: { permission_count: vars.permissionIds.length },
      });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// --- User Custom Roles ---
export function useUserCustomRoles(userId?: string) {
  return useQuery({
    queryKey: ['user-custom-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_custom_roles')
        .select('*, custom_roles(*)')
        .eq('user_id', userId);
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        role: d.custom_roles,
      })) as UserCustomRole[];
    },
    enabled: !!userId,
  });
}

export function useAssignUserRole() {
  const qc = useQueryClient();
  const logAction = useLogAction();
  return useMutation({
    mutationFn: async ({ userId, roleId, assignedBy, roleName, userEmail }: { userId: string; roleId: string; assignedBy?: string; roleName?: string; userEmail?: string }) => {
      const { error } = await supabase
        .from('user_custom_roles')
        .insert({ user_id: userId, role_id: roleId, assigned_by: assignedBy });
      if (error) throw error;
      return { userId, roleId, roleName, userEmail };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['user-custom-roles'] });
      qc.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rol asignado');
      logAction.mutate({
        action: 'assign_role',
        entityType: 'user',
        entityId: data.userId,
        entityName: data.userEmail || data.userId,
        newValues: { role_id: data.roleId, role_name: data.roleName },
      });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveUserRole() {
  const qc = useQueryClient();
  const logAction = useLogAction();
  return useMutation({
    mutationFn: async ({ userId, roleId, roleName, userEmail }: { userId: string; roleId: string; roleName?: string; userEmail?: string }) => {
      const { error } = await supabase
        .from('user_custom_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', roleId);
      if (error) throw error;
      return { userId, roleId, roleName, userEmail };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['user-custom-roles'] });
      qc.invalidateQueries({ queryKey: ['custom-roles'] });
      toast.success('Rol removido');
      logAction.mutate({
        action: 'remove_role',
        entityType: 'user',
        entityId: data.userId,
        entityName: data.userEmail || data.userId,
        oldValues: { role_id: data.roleId, role_name: data.roleName },
      });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// --- User effective permissions (for AuthContext) ---
export function useUserEffectivePermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-effective-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.rpc('get_user_permissions', { _user_id: userId });
      if (error) throw error;
      return data as { module_code: string; action: string }[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
