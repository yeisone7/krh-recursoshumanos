import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck, Shield, FileDown } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useLogAction } from '@/hooks/useAuditLog';
import { CustomRole, Permission, RolePermissionEntry, useCustomRoles, useModules, usePermissionsCatalog } from '@/hooks/useRolesPermissions';

// Show the most important modules in the quick view
const QUICK_MODULE_CODES = [
  'empleados',
  'contratos',
  'vacaciones',
  'permisos',
  'novedades',
  'seleccion',
  'requisiciones',
  'capacitaciones',
  'alertas',
  'motor_notificaciones',
];

const ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export'] as const;
type ActionType = (typeof ACTIONS)[number];

const ACTION_LABELS: Record<ActionType, string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Editar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  export: 'Exportar',
};

const ACTION_COLORS: Record<ActionType, string> = {
  view: 'text-blue-500',
  create: 'text-green-500',
  update: 'text-amber-500',
  delete: 'text-red-500',
  approve: 'text-violet-500',
  export: 'text-cyan-500',
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
    () => QUICK_MODULE_CODES.map((code) => modules.find((module) => module.code === code)).filter(Boolean),
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

  const getPermission = (moduleId: string, action: ActionType) => permissionByModuleAction.get(`${moduleId}:${action}`);
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
    <Card className="rounded-3xl bg-background border border-border/40 shadow-none overflow-hidden">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Administración rápida de permisos
        </CardTitle>
        <CardDescription>
          Asigna permisos por rol para los módulos principales. Incluye aprobaciones y exportaciones.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-44 sticky left-0 bg-background z-10">Rol</TableHead>
                {quickModules.map((module) => (
                  <TableHead key={module!.id} className="text-center" colSpan={ACTIONS.length}>
                    <span className="font-semibold">{module!.name}</span>
                  </TableHead>
                ))}
                <TableHead className="text-right sticky right-0 bg-background z-10">Guardar</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10" />
                {quickModules.flatMap((module) =>
                  ACTIONS.map((action) => (
                    <TableHead key={`${module!.id}-${action}`} className="min-w-14 text-center px-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-[10px] font-medium cursor-help ${ACTION_COLORS[action]}`}>
                            {ACTION_LABELS[action]}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {action === 'approve' && `Aprobar en ${module!.name}`}
                          {action === 'export' && `Exportar datos de ${module!.name}`}
                          {action === 'view' && `Ver ${module!.name}`}
                          {action === 'create' && `Crear en ${module!.name}`}
                          {action === 'update' && `Modificar en ${module!.name}`}
                          {action === 'delete' && `Eliminar en ${module!.name}`}
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                  ))
                )}
                <TableHead className="sticky right-0 bg-background z-10" />
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
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && <Badge variant="secondary">Sistema</Badge>}
                      </div>
                    </TableCell>
                    {quickModules.flatMap((module) =>
                      ACTIONS.map((action) => {
                        const permission = getPermission(module!.id, action);
                        const hasPermForAction = !!permission;
                        return (
                          <TableCell key={`${role.id}-${module!.id}-${action}`} className="text-center px-1">
                            {hasPermForAction ? (
                              <Checkbox
                                checked={isChecked(role, permission?.id)}
                                disabled={role.is_system || !permission}
                                onCheckedChange={() => togglePermission(role, permission?.id)}
                              />
                            ) : (
                              <span className="text-muted-foreground/20 text-xs">—</span>
                            )}
                          </TableCell>
                        );
                      })
                    )}
                    <TableCell className="text-right sticky right-0 bg-background z-10">
                       <Button
                        size="sm"
                        disabled={!hasChanges(role.id) || role.is_system || savePermissions.isPending}
                        onClick={() => savePermissions.mutate({ role, permissionIds: Array.from(selectedByRole[role.id] || []) })}
                        className="bg-primary text-white hover:bg-primary/90"
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
