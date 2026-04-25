import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, ChevronDown, ChevronRight, CheckSquare } from 'lucide-react';
import {
  useModules, usePermissionsCatalog, useRolePermissions, useSetRolePermissions,
  CustomRole, Module, Permission,
} from '@/hooks/useRolesPermissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface PermissionMatrixProps {
  role: CustomRole;
  onBack: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  update: 'Modificar',
  delete: 'Eliminar',
};

const ACTION_ORDER = ['view', 'create', 'update', 'delete'];

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold">Permisos: {role.name}</h3>
            <p className="text-sm text-muted-foreground">
              {selectedCount} de {totalPerms} permisos seleccionados
              {role.is_system && ' (rol de sistema — todos los permisos)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_repeat(5,80px)] items-center border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Módulo</span>
            <span className="text-center">Todos</span>
            {ACTION_ORDER.map(a => (
              <span key={a} className="text-center">{ACTION_LABELS[a]}</span>
            ))}
          </div>

          {/* Module rows */}
          <div className="divide-y">
            {topLevelModules.map((mod) => {
              const children = modules.filter(m => m.parent_id === mod.id);
              const hasChildren = children.length > 0;
              const isExpanded = expandedModules.has(mod.id);

              return (
                <div key={mod.id}>
                  {/* Module row */}
                  <div className="grid grid-cols-[1fr_repeat(5,80px)] items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
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
                      return (
                        <div key={action} className="flex justify-center">
                          <Checkbox
                            checked={role.is_system ? true : isChecked(permId)}
                            onCheckedChange={() => togglePermission(permId)}
                            disabled={role.is_system || !permId}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Children */}
                  {hasChildren && isExpanded && children.map(child => (
                    <div
                      key={child.id}
                      className="grid grid-cols-[1fr_repeat(5,80px)] items-center px-4 py-2 pl-12 bg-muted/10 hover:bg-muted/20 transition-colors"
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
                        return (
                          <div key={action} className="flex justify-center">
                            <Checkbox
                              checked={role.is_system ? true : isChecked(permId)}
                              onCheckedChange={() => togglePermission(permId)}
                              disabled={role.is_system || !permId}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
