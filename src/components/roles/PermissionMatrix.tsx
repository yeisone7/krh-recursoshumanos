import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, ChevronDown, ChevronRight, CheckSquare, Shield, FileDown } from 'lucide-react';
import {
  useModules, usePermissionsCatalog, useRolePermissions, useSetRolePermissions,
  CustomRole, Module, Permission,
} from '@/hooks/useRolesPermissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionMatrixProps {
  role: CustomRole;
  onBack: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Modificar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  export: 'Exportar',
};

const ACTION_ORDER = ['view', 'create', 'update', 'delete', 'approve', 'export'];

const ACTION_COLORS: Record<string, string> = {
  view: 'text-blue-500',
  create: 'text-green-500',
  update: 'text-amber-500',
  delete: 'text-red-500',
  approve: 'text-violet-500',
  export: 'text-cyan-500',
};

export function PermissionMatrix({ role, onBack }: PermissionMatrixProps) {
  const { data: modules = [] } = useModules();
  const { data: permissionsCatalog = [] } = usePermissionsCatalog();
  const { data: rolePerms = [] } = useRolePermissions(role.id);
  const setPermissions = useSetRolePermissions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from existing role permissions
  useEffect(() => {
    setSelectedIds(new Set(rolePerms.map(rp => rp.permission_id)));
    setHasChanges(false);
  }, [rolePerms]);

  // Build a map: moduleId -> permissions[]
  const permsByModule = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    permissionsCatalog.forEach(p => {
      if (!map[p.module_id]) map[p.module_id] = [];
      map[p.module_id].push(p);
    });
    // Sort each by action order
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action))
    );
    return map;
  }, [permissionsCatalog]);

  // Group modules: parent modules (no parent_id) and their children
  const topLevelModules = useMemo(
    () => modules.filter(m => !m.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [modules]
  );

  // Determine which actions exist for a given module (not all modules have approve/export)
  const getModuleActions = (moduleId: string): string[] => {
    const perms = permsByModule[moduleId] || [];
    const existingActions = new Set(perms.map(p => p.action));
    return ACTION_ORDER.filter(a => existingActions.has(a));
  };

  const getPermissionId = (moduleId: string, action: string): string | undefined => {
    return permsByModule[moduleId]?.find(p => p.action === action)?.id;
  };

  const isChecked = (permId: string | undefined) => permId ? selectedIds.has(permId) : false;

  const togglePermission = (permId: string | undefined) => {
    if (!permId || role.is_system) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setHasChanges(true);
  };

  const toggleModuleAll = (moduleId: string) => {
    if (role.is_system) return;
    const perms = permsByModule[moduleId] || [];
    const allSelected = perms.every(p => selectedIds.has(p.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      perms.forEach(p => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
    setHasChanges(true);
  };

  const isModuleAllChecked = (moduleId: string) => {
    const perms = permsByModule[moduleId] || [];
    return perms.length > 0 && perms.every(p => selectedIds.has(p.id));
  };

  const isModuleSomeChecked = (moduleId: string) => {
    const perms = permsByModule[moduleId] || [];
    return perms.some(p => selectedIds.has(p.id)) && !isModuleAllChecked(moduleId);
  };

  const toggleExpanded = (moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleSave = async () => {
    await setPermissions.mutateAsync({
      roleId: role.id,
      permissionIds: Array.from(selectedIds),
      roleName: role.name,
    });
    setHasChanges(false);
  };

  const selectAll = () => {
    if (role.is_system) return;
    setSelectedIds(new Set(permissionsCatalog.map(p => p.id)));
    setHasChanges(true);
  };

  const deselectAll = () => {
    if (role.is_system) return;
    setSelectedIds(new Set());
    setHasChanges(true);
  };

  const totalPerms = permissionsCatalog.length;
  const selectedCount = selectedIds.size;

  // Count of approve and export permissions selected
  const approveCount = permissionsCatalog.filter(p => p.action === 'approve' && selectedIds.has(p.id)).length;
  const exportCount = permissionsCatalog.filter(p => p.action === 'export' && selectedIds.has(p.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold break-words">Permisos: {role.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                {selectedCount} de {totalPerms} permisos
              </span>
              {role.is_system && (
                <Badge variant="secondary">rol de sistema — todos los permisos</Badge>
              )}
              {!role.is_system && approveCount > 0 && (
                <Badge variant="outline" className="text-violet-600 border-violet-300 bg-violet-50 dark:bg-violet-950/30">
                  <Shield className="w-3 h-3 mr-1" />
                  {approveCount} aprobaciones
                </Badge>
              )}
              {!role.is_system && exportCount > 0 && (
                <Badge variant="outline" className="text-cyan-600 border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30">
                  <FileDown className="w-3 h-3 mr-1" />
                  {exportCount} exportaciones
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          {!role.is_system && (
            <>
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="w-4 h-4 mr-1" />
                Todos
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Ninguno
              </Button>
            </>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || role.is_system || setPermissions.isPending}
            className="col-span-2 sm:col-span-1"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Header row */}
          <div className="grid min-w-[800px] grid-cols-[minmax(180px,1fr)_repeat(7,64px)] sm:grid-cols-[1fr_repeat(7,72px)] items-center border-b bg-background px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Módulo</span>
            <span className="text-center">Todos</span>
            {ACTION_ORDER.map(a => (
              <Tooltip key={a}>
                <TooltipTrigger asChild>
                  <span className={`text-center cursor-help ${ACTION_COLORS[a]}`}>
                    {ACTION_LABELS[a]}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {a === 'approve' && 'Permite aprobar solicitudes y flujos de trabajo'}
                  {a === 'export' && 'Permite descargar y exportar datos del módulo'}
                  {a === 'view' && 'Permite ver y consultar información'}
                  {a === 'create' && 'Permite crear nuevos registros'}
                  {a === 'update' && 'Permite modificar registros existentes'}
                  {a === 'delete' && 'Permite eliminar registros'}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Module rows */}
          <div className="divide-y">
            {topLevelModules.map((mod) => {
              const children = modules.filter(m => m.parent_id === mod.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedModules.has(mod.id);
              const moduleActions = getModuleActions(mod.id);

              return (
                <div key={mod.id}>
                  {/* Module row */}
                  <div className="grid min-w-[800px] grid-cols-[minmax(180px,1fr)_repeat(7,64px)] sm:grid-cols-[1fr_repeat(7,72px)] items-center px-4 py-2.5 hover:bg-background transition-colors">
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        <button onClick={() => toggleExpanded(mod.id)} className="p-0.5">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="w-5" />
                      )}
                      <span className="font-medium text-sm">{mod.name}</span>
                    </div>
                    <div className="flex justify-center">
                      <Checkbox
                        checked={isModuleAllChecked(mod.id)}
                        // @ts-ignore
                        indeterminate={isModuleSomeChecked(mod.id)}
                        onCheckedChange={() => toggleModuleAll(mod.id)}
                        disabled={role.is_system}
                      />
                    </div>
                    {ACTION_ORDER.map(action => {
                      const permId = getPermissionId(mod.id, action);
                      const hasAction = moduleActions.includes(action);
                      return (
                        <div key={action} className="flex justify-center">
                          {hasAction ? (
                            <Checkbox
                              checked={role.is_system ? true : isChecked(permId)}
                              onCheckedChange={() => togglePermission(permId)}
                              disabled={role.is_system || !permId}
                            />
                          ) : (
                            <span className="w-4 h-4 text-muted-foreground/20">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Children */}
                  {hasChildren && isExpanded && children.map(child => {
                    const childActions = getModuleActions(child.id);
                    return (
                      <div
                        key={child.id}
                        className="grid min-w-[800px] grid-cols-[minmax(180px,1fr)_repeat(7,64px)] sm:grid-cols-[1fr_repeat(7,72px)] items-center px-4 py-2 pl-12 bg-background /10 hover:bg-background transition-colors"
                      >
                        <span className="text-sm text-muted-foreground">{child.name}</span>
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isModuleAllChecked(child.id)}
                            onCheckedChange={() => toggleModuleAll(child.id)}
                            disabled={role.is_system}
                          />
                        </div>
                        {ACTION_ORDER.map(action => {
                          const permId = getPermissionId(child.id, action);
                          const hasAction = childActions.includes(action);
                          return (
                            <div key={action} className="flex justify-center">
                              {hasAction ? (
                                <Checkbox
                                  checked={role.is_system ? true : isChecked(permId)}
                                  onCheckedChange={() => togglePermission(permId)}
                                  disabled={role.is_system || !permId}
                                />
                              ) : (
                                <span className="w-4 h-4 text-muted-foreground/20">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
