import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Save,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Shield,
  FileDown,
  Search,
  Info,
  Lock,
  Eye,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  useModules,
  usePermissionsCatalog,
  useRolePermissions,
  useSetRolePermissions,
  CustomRole,
  Module,
  Permission,
} from '@/hooks/useRolesPermissions';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { CATALOG_PERMISSION_CODES } from '@/lib/catalogPermissions';
import { TRAINING_PERMISSION_CODES } from '@/lib/trainingPermissions';

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
  view: 'text-blue-600',
  create: 'text-emerald-600',
  update: 'text-amber-600',
  delete: 'text-red-600',
  approve: 'text-violet-600',
  export: 'text-cyan-700',
};

const ACTION_BG: Record<string, string> = {
  view: 'data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600',
  create: 'data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600',
  update: 'data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500',
  delete: 'data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500',
  approve: 'data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600',
  export: 'data-[state=checked]:bg-cyan-700 data-[state=checked]:border-cyan-700',
};

const ACTION_ICONS: Record<string, any> = {
  view: Eye,
  create: Plus,
  update: Edit3,
  delete: Trash2,
  approve: CheckCircle2,
  export: FileDown,
};

const getPermissionLabel = (module: Module, permission?: Permission) => {
  if (!permission?.description) return module.name;
  return permission.description.replace(/\s+-\s+(Ver|Crear|Modificar|Eliminar)$/i, '').trim();
};

export function PermissionMatrix({ role, onBack }: PermissionMatrixProps) {
  const { data: modules = [] } = useModules();
  const { data: permissionsCatalog = [] } = usePermissionsCatalog();
  const { data: rolePerms = [] } = useRolePermissions(role.id);
  const setPermissions = useSetRolePermissions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelectedIds(new Set(rolePerms.map(rp => rp.permission_id)));
    setHasChanges(false);
  }, [rolePerms]);

  const visiblePermissionsCatalog = useMemo(() => {
    const hiddenParentModuleIds = new Set(
      modules
        .filter(module => [CATALOG_PERMISSION_CODES.index, TRAINING_PERMISSION_CODES.index].includes(module.code))
        .map(module => module.id)
    );
    if (hiddenParentModuleIds.size === 0) return permissionsCatalog;
    return permissionsCatalog.filter(permission => !hiddenParentModuleIds.has(permission.module_id));
  }, [modules, permissionsCatalog]);

  const permsByModule = useMemo(() => {
    const map: Record<string, Permission[]> = {};
    visiblePermissionsCatalog.forEach(permission => {
      if (!map[permission.module_id]) map[permission.module_id] = [];
      map[permission.module_id].push(permission);
    });
    Object.values(map).forEach(permissions =>
      permissions.sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action))
    );
    return map;
  }, [visiblePermissionsCatalog]);

  const childrenByModule = useMemo(() => {
    const map: Record<string, Module[]> = {};
    modules.forEach(module => {
      if (!module.parent_id) return;
      if (!map[module.parent_id]) map[module.parent_id] = [];
      map[module.parent_id].push(module);
    });
    Object.values(map).forEach(children => children.sort((a, b) => a.sort_order - b.sort_order));
    return map;
  }, [modules]);

  const topLevelModules = useMemo(
    () => modules.filter(module => !module.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [modules]
  );

  const getPermissionId = (moduleId: string, action: string) => (
    permsByModule[moduleId]?.find(permission => permission.action === action)?.id
  );

  const isChecked = (permId: string | undefined) => (
    role.is_system || (permId ? selectedIds.has(permId) : false)
  );

  const getModuleState = (moduleId: string) => {
    const permissions = permsByModule[moduleId] || [];
    if (role.is_system && permissions.length > 0) return true;
    const selectedCount = permissions.filter(permission => selectedIds.has(permission.id)).length;
    if (permissions.length === 0 || selectedCount === 0) return false;
    if (selectedCount === permissions.length) return true;
    return 'indeterminate' as const;
  };

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
    const permissions = permsByModule[moduleId] || [];
    const allSelected = permissions.length > 0 && permissions.every(permission => selectedIds.has(permission.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      permissions.forEach(permission => {
        if (allSelected) next.delete(permission.id);
        else next.add(permission.id);
      });
      return next;
    });
    setHasChanges(true);
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
    try {
      await setPermissions.mutateAsync({
        roleId: role.id,
        permissionIds: Array.from(selectedIds).filter(permissionId =>
          visiblePermissionsCatalog.some(permission => permission.id === permissionId)
        ),
        roleName: role.name,
      });
      setHasChanges(false);
    } catch {
      // The mutation already shows a toast with the Supabase error.
    }
  };

  const selectAll = () => {
    if (role.is_system) return;
    setSelectedIds(new Set(visiblePermissionsCatalog.map(permission => permission.id)));
    setHasChanges(true);
  };

  const deselectAll = () => {
    if (role.is_system) return;
    setSelectedIds(new Set());
    setHasChanges(true);
  };

  const selectedCount = role.is_system ? visiblePermissionsCatalog.length : visiblePermissionsCatalog.filter(permission => selectedIds.has(permission.id)).length;
  const totalPerms = visiblePermissionsCatalog.length;
  const approveCount = visiblePermissionsCatalog.filter(p => p.action === 'approve' && isChecked(p.id)).length;
  const exportCount = visiblePermissionsCatalog.filter(p => p.action === 'export' && isChecked(p.id)).length;

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return topLevelModules;

    return topLevelModules.filter(module => {
      const children = childrenByModule[module.id] || [];
      const childMatches = children.some(child =>
        child.name.toLowerCase().includes(query) ||
        child.code.toLowerCase().includes(query) ||
        (permsByModule[child.id] || []).some(permission => permission.description?.toLowerCase().includes(query))
      );
      return (
        module.name.toLowerCase().includes(query) ||
        module.code.toLowerCase().includes(query) ||
        (permsByModule[module.id] || []).some(permission => permission.description?.toLowerCase().includes(query)) ||
        childMatches
      );
    });
  }, [topLevelModules, childrenByModule, permsByModule, search]);

  const renderActionCheckbox = (moduleId: string, action: string, compact = false) => {
    const permId = getPermissionId(moduleId, action);
    if (!permId) {
      return <span className="block h-px w-4 rounded-full bg-slate-200" />;
    }

    return (
      <Checkbox
        checked={isChecked(permId)}
        onCheckedChange={() => togglePermission(permId)}
        disabled={role.is_system}
        className={cn(
          compact ? 'h-4 w-4 rounded' : 'h-5 w-5 rounded-md',
          'border-slate-300 bg-white shadow-none focus-visible:ring-primary/20',
          ACTION_BG[action]
        )}
      />
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="h-11 w-11 rounded-xl border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-950">Matriz de Acceso</h3>
              <Badge className={cn(
                'rounded-md border-none px-2 py-0.5 text-[9px] font-black uppercase tracking-widest',
                role.is_system ? 'bg-red-600 text-white' : 'bg-primary text-white'
              )}>
                {role.name}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> {selectedCount} / {totalPerms} activos</span>
              <span className="flex items-center gap-1.5 text-violet-700"><CheckCircle2 className="h-3.5 w-3.5" /> {approveCount} aprobaciones</span>
              <span className="flex items-center gap-1.5 text-cyan-700"><FileDown className="h-3.5 w-3.5" /> {exportCount} exportaciones</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="BUSCAR MÓDULO O PERMISO..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white pl-11 text-[11px] font-black uppercase tracking-widest text-slate-700 shadow-sm placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            {!role.is_system && (
              <>
                <Button variant="outline" onClick={selectAll} className="h-11 rounded-xl border-slate-200 bg-white px-5 text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm hover:bg-slate-100">Todo</Button>
                <Button variant="outline" onClick={deselectAll} className="h-11 rounded-xl border-slate-200 bg-white px-5 text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-sm hover:bg-slate-100">Nada</Button>
              </>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || role.is_system || setPermissions.isPending}
              className="h-11 rounded-xl bg-slate-950 px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:bg-slate-800 disabled:opacity-50"
            >
              {setPermissions.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Sincronizar
            </Button>
          </div>
        </div>
      </motion.div>

      {role.is_system && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white">
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-primary">
              <Lock className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <h4 className="text-[11px] font-black uppercase tracking-widest">Modo lectura: rol de infraestructura</h4>
              <p className="max-w-3xl text-[11px] font-semibold leading-relaxed text-slate-300">
                Este rol tiene privilegios definidos por el sistema. Sus permisos se muestran como referencia y no pueden modificarse desde esta matriz.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[minmax(310px,1fr)_90px_repeat(6,100px)] items-center border-b border-slate-200 bg-slate-100 px-6 py-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Módulo / Permiso independiente</span>
                <div className="flex flex-col items-center gap-1 text-slate-600">
                  <CheckSquare className="h-4 w-4" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Todos</span>
                </div>
                {ACTION_ORDER.map(action => {
                  const Icon = ACTION_ICONS[action];
                  return (
                    <div key={action} className="flex flex-col items-center gap-1">
                      <Icon className={cn('h-4 w-4', ACTION_COLORS[action])} />
                      <span className={cn('text-[9px] font-black uppercase tracking-widest', ACTION_COLORS[action])}>
                        {ACTION_LABELS[action]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="divide-y divide-slate-200 bg-white">
                {filteredModules.map((module, index) => {
                  const children = childrenByModule[module.id] || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedModules.has(module.id) || search.trim().length > 0;
                  const modulePerms = permsByModule[module.id] || [];

                  return (
                    <motion.div
                      key={module.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(index * 0.02, 0.18) }}
                    >
                      <div className="grid grid-cols-[minmax(310px,1fr)_90px_repeat(6,100px)] items-center bg-white px-6 py-4 transition-colors hover:bg-slate-50">
                        <div className="flex items-center gap-4">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(module.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                              aria-label={isExpanded ? 'Contraer permisos adicionales' : 'Expandir permisos adicionales'}
                            >
                              {isExpanded ? <ChevronDown className="h-4 w-4 text-primary" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[12px] font-black uppercase tracking-tight text-slate-950">{module.name}</span>
                              {hasChildren && (
                                <Badge variant="outline" className="rounded-md border-slate-300 bg-slate-50 px-1.5 py-0 text-[8px] font-black uppercase tracking-widest text-slate-600">
                                  {children.length} permisos extra
                                </Badge>
                              )}
                            </div>
                            <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {modulePerms.length} permisos base · orden {module.sort_order}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <Checkbox
                            checked={getModuleState(module.id)}
                            onCheckedChange={() => toggleModuleAll(module.id)}
                            disabled={role.is_system || modulePerms.length === 0}
                            className="h-5 w-5 rounded-md border-slate-300 bg-white shadow-none data-[state=checked]:border-slate-950 data-[state=checked]:bg-slate-950 data-[state=indeterminate]:border-slate-500 data-[state=indeterminate]:bg-slate-500"
                          />
                        </div>

                        {ACTION_ORDER.map(action => (
                          <div key={action} className="flex justify-center">
                            {renderActionCheckbox(module.id, action)}
                          </div>
                        ))}
                      </div>

                      <AnimatePresence>
                        {hasChildren && isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-t border-slate-100 bg-slate-50/80"
                          >
                            {children.map(child => {
                              const childPerms = permsByModule[child.id] || [];
                              const primaryPerm = childPerms[0];
                              const query = search.trim().toLowerCase();
                              const visible = !query ||
                                module.name.toLowerCase().includes(query) ||
                                child.name.toLowerCase().includes(query) ||
                                child.code.toLowerCase().includes(query) ||
                                childPerms.some(permission => permission.description?.toLowerCase().includes(query));
                              if (!visible) return null;

                              return (
                                <div
                                  key={child.id}
                                  className="grid grid-cols-[minmax(310px,1fr)_90px_repeat(6,100px)] items-center border-t border-slate-200/70 px-6 py-3.5"
                                >
                                  <div className="flex items-center gap-4 pl-11">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-black text-slate-500">
                                      {child.sort_order}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-tight text-slate-800">
                                          {getPermissionLabel(child, primaryPerm)}
                                        </span>
                                        <Badge className="rounded-md bg-primary/10 px-1.5 py-0 text-[8px] font-black uppercase tracking-widest text-primary hover:bg-primary/10">
                                          Independiente
                                        </Badge>
                                      </div>
                                      <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-500">
                                        {child.code}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={getModuleState(child.id)}
                                      onCheckedChange={() => toggleModuleAll(child.id)}
                                      disabled={role.is_system || childPerms.length === 0}
                                      className="h-4 w-4 rounded border-slate-300 bg-white shadow-none data-[state=checked]:border-slate-950 data-[state=checked]:bg-slate-950 data-[state=indeterminate]:border-slate-500 data-[state=indeterminate]:bg-slate-500"
                                    />
                                  </div>

                                  {ACTION_ORDER.map(action => (
                                    <div key={action} className="flex justify-center">
                                      {renderActionCheckbox(child.id, action, true)}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-primary">
            <Info className="h-5 w-5" />
          </span>
          <div>
            <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Guía de privilegios</h5>
            <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
              Los permisos adicionales son independientes. Activar “Requisición: Aprobar RRHH” no activa “Aprobar Jurídica”, y las analíticas se gestionan como accesos propios.
            </p>
          </div>
        </div>
        {!role.is_system && hasChanges && (
          <Button onClick={handleSave} disabled={setPermissions.isPending} className="h-11 rounded-xl bg-primary px-6 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">
            {setPermissions.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Aplicar cambios
          </Button>
        )}
      </div>
    </div>
  );
}
