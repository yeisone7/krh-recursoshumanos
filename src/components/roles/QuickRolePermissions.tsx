import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLogAction } from '@/hooks/useAuditLog';
import { CustomRole, Permission, RolePermissionEntry, useCustomRoles, useModules, usePermissionsCatalog } from '@/hooks/useRolesPermissions';

const MODULE_CODES = ['empleados', 'contratos', 'alertas'];
const ACTIONS = ['view', 'create', 'update', 'delete'] as const;
const ACTION_LABELS: Record<(typeof ACTIONS)[number], string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Modificar',
  delete: 'Eliminar',
};

export function QuickRolePermissions() {
  const queryClient = useQueryClient();
  const logAction = useLogAction();
  const { data: roles = [], isLoading: rolesLoading } = useCustomRoles();
  const { data: modules = [], isLoading: modulesLoading } = useModules();
  const { data: permissions = [], isLoading: permissionsLoading } = usePermissionsCatalog();
  const [selectedByRole, setSelectedByRole] = useState<Record<string, Set<string>>>({});

  const roleIds = useMemo(() => roles.map((role) => role.id), [roles]);
  const quickModules = useMemo(
    () => MODULE_CODES.map((code) => modules.find((module) => module.code === code)).filter(Boolean),
    [modules]
  );
  const quickModuleIds = useMemo(() => quickModules.map((module) => module!.id), [quickModules]);
  const quickPermissions = useMemo(
    () => permissions.filter((permission) => quickModuleIds.includes(permission.module_id)),
    [permissions, quickModuleIds]
  );
  const quickPermissionIds = useMemo(() => quickPermissions.map((permission) => permission.id), [quickPermissions]);

  const { data: rolePermissions = [], isLoading: rolePermissionsLoading } = useQuery({
    queryKey: ['quick-role-permissions', roleIds],
    queryFn: async () => {
      if (roleIds.length === 0) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .in('role_id', roleIds);
      if (error) throw error;
      return data as RolePermissionEntry[];
    },
    enabled: roleIds.length > 0,
  });

  const permissionByModuleAction = useMemo(() => {
    const map = new Map<string, Permission>();
    quickPermissions.forEach((permission) => map.set(`${permission.module_id}:${permission.action}`, permission));
    return map;
  }, [quickPermissions]);

  const initialQuickByRole = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    roles.forEach((role) => {
      map[role.id] = new Set(
        rolePermissions
          .filter((entry) => entry.role_id === role.id && quickPermissionIds.includes(entry.permission_id))
          .map((entry) => entry.permission_id)
      );
    });
    return map;
  }, [roles, rolePermissions, quickPermissionIds]);

  useEffect(() => {
    setSelectedByRole(initialQuickByRole);
  }, [initialQuickByRole]);

  const savePermissions = useMutation({
    mutationFn: async ({ role, permissionIds }: { role: CustomRole; permissionIds: string[] }) => {
      const existingRolePermissionIds = rolePermissions
        .filter((entry) => entry.role_id === role.id)
        .map((entry) => entry.permission_id);
      const preservedPermissionIds = existingRolePermissionIds.filter((id) => !quickPermissionIds.includes(id));
      const nextPermissionIds = [...preservedPermissionIds, ...permissionIds];

      if (quickPermissionIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', role.id)
          .in('permission_id', quickPermissionIds);
        if (deleteError) throw deleteError;
      }

      if (permissionIds.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionIds.map((permissionId) => ({ role_id: role.id, permission_id: permissionId })));
        if (insertError) throw insertError;
      }

      return { role, nextPermissionIds, permissionIds };
    },
    onSuccess: ({ role, permissionIds }) => {
      queryClient.invalidateQueries({ queryKey: ['quick-role-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions', role.id] });
      queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
      toast.success('Permisos del rol actualizados');
      logAction.mutate({
        action: 'update',
        entityType: 'role',
        entityId: role.id,
        entityName: role.name,
        oldValues: { quick_permission_ids: Array.from(initialQuickByRole[role.id] || []) },
        newValues: { quick_permission_ids: permissionIds },
      });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const getPermission = (moduleId: string, action: (typeof ACTIONS)[number]) => permissionByModuleAction.get(`${moduleId}:${action}`);
  const isChecked = (role: CustomRole, permissionId?: string) => role.is_system || (!!permissionId && selectedByRole[role.id]?.has(permissionId));
  const hasChanges = (roleId: string) => {
    const current = Array.from(selectedByRole[roleId] || []).sort().join('|');
    const initial = Array.from(initialQuickByRole[roleId] || []).sort().join('|');
    return current !== initial;
  };

  const togglePermission = (role: CustomRole, permissionId?: string) => {
    if (!permissionId || role.is_system) return;
    setSelectedByRole((prev) => {
      const nextSet = new Set(prev[role.id] || []);
      nextSet.has(permissionId) ? nextSet.delete(permissionId) : nextSet.add(permissionId);
      return { ...prev, [role.id]: nextSet };
    });
  };

  const isLoading = rolesLoading || modulesLoading || permissionsLoading || rolePermissionsLoading;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Administración rápida de permisos
        </CardTitle>
        <CardDescription>Asigna permisos por rol para Empleados, Contratos y Alertas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-52">Rol</TableHead>
                {quickModules.map((module) => (
                  <TableHead key={module!.id} className="text-center" colSpan={ACTIONS.length}>
                    {module!.name}
                  </TableHead>
                ))}
                <TableHead className="text-right">Guardar</TableHead>
              </TableRow>
              <TableRow>
                <TableHead />
                {quickModules.flatMap((module) =>
                  ACTIONS.map((action) => (
                    <TableHead key={`${module!.id}-${action}`} className="min-w-20 text-center text-xs">
                      {ACTION_LABELS[action]}
                    </TableHead>
                  ))
                )}
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2 + quickModules.length * ACTIONS.length} className="py-8 text-center text-muted-foreground">
                    Cargando permisos...
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 || quickModules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + quickModules.length * ACTIONS.length} className="py-8 text-center text-muted-foreground">
                    No hay roles o módulos configurados.
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && <Badge variant="secondary">Sistema</Badge>}
                      </div>
                    </TableCell>
                    {quickModules.flatMap((module) =>
                      ACTIONS.map((action) => {
                        const permission = getPermission(module!.id, action);
                        return (
                          <TableCell key={`${role.id}-${module!.id}-${action}`} className="text-center">
                            <Checkbox
                              checked={isChecked(role, permission?.id)}
                              disabled={role.is_system || !permission}
                              onCheckedChange={() => togglePermission(role, permission?.id)}
                              className={cn(!permission && 'opacity-30')}
                            />
                          </TableCell>
                        );
                      })
                    )}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={!hasChanges(role.id) || role.is_system || savePermissions.isPending}
                        onClick={() => savePermissions.mutate({ role, permissionIds: Array.from(selectedByRole[role.id] || []) })}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Guardar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}