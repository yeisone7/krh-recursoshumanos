import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, ChevronDown, ChevronRight, CheckSquare, Shield, FileDown, Search, Info, Lock, Eye, Plus, Edit3, Trash2, CheckCircle2 } from 'lucide-react';
import {
  useModules, usePermissionsCatalog, useRolePermissions, useSetRolePermissions,
  CustomRole, Module, Permission,
} from '@/hooks/useRolesPermissions';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

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
  approve: 'text-purple-600',
  export: 'text-cyan-600',
};

const ACTION_ICONS: Record<string, any> = {
  view: Eye,
  create: Plus,
  update: Edit3,
  delete: Trash2,
  approve: CheckCircle2,
  export: FileDown,
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
    Object.values(map).forEach(arr =>
      arr.sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action))
    );
    return map;
  }, [permissionsCatalog]);

  const topLevelModules = useMemo(
    () => modules.filter(m => !m.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [modules]
  );

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

  const selectedCount = selectedIds.size;
  const totalPerms = permissionsCatalog.length;
  const approveCount = permissionsCatalog.filter(p => p.action === 'approve' && selectedIds.has(p.id)).length;
  const exportCount = permissionsCatalog.filter(p => p.action === 'export' && selectedIds.has(p.id)).length;

  const filteredModules = useMemo(() => {
    if (!search) return topLevelModules;
    return topLevelModules.filter(m => {
      const children = modules.filter(child => child.parent_id === m.id);
      return m.name.toLowerCase().includes(search.toLowerCase()) || 
             children.some(c => c.name.toLowerCase().includes(search.toLowerCase()));
    });
  }, [topLevelModules, modules, search]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between px-2"
      >
        <div className="flex items-center gap-5">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={onBack} 
            className="h-12 w-12 rounded-2xl border-slate-100 bg-white shadow-sm hover:bg-slate-50 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Button>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Matriz de Acceso</h3>
              <Badge className={cn(
                "font-black text-[9px] px-2 py-0.5 rounded-lg border-none shadow-sm uppercase tracking-widest",
                role.is_system ? "bg-red-500 text-white" : "bg-primary text-white"
              )}>
                {role.name}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> {selectedCount} / {totalPerms} ACTIVOS</span>
              {approveCount > 0 && <span className="flex items-center gap-1.5 text-purple-600"><CheckCircle2 className="w-3 h-3" /> {approveCount} APROBACIONES</span>}
              {exportCount > 0 && <span className="flex items-center gap-1.5 text-cyan-600"><FileDown className="w-3 h-3" /> {exportCount} EXPORTACIONES</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="BUSCAR MÓDULO..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-12 pl-12 rounded-2xl bg-white border-slate-100 font-black text-[10px] uppercase tracking-widest focus:ring-4 focus:ring-primary/5 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!role.is_system && (
              <>
                <Button variant="outline" onClick={selectAll} className="h-12 px-6 rounded-2xl border-slate-100 font-black uppercase tracking-widest text-[10px] shadow-sm flex-1 sm:flex-none">TODO</Button>
                <Button variant="outline" onClick={deselectAll} className="h-12 px-6 rounded-2xl border-slate-100 font-black uppercase tracking-widest text-[10px] shadow-sm flex-1 sm:flex-none">NADA</Button>
              </>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || role.is_system || setPermissions.isPending}
              className="h-12 px-8 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-slate-200 active:scale-95 transition-all flex-1 sm:flex-none"
            >
              {setPermissions.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              SINCRONIZAR
            </Button>
          </div>
        </div>
      </motion.div>

      {/* System Warning if applicable */}
      {role.is_system && (
        <div className="mx-2 p-6 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-white">Modo Lectura: Rol de Infraestructura</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed max-w-3xl">
              Este rol tiene privilegios absolutos definidos por el sistema. Los permisos no pueden ser revocados ni modificados para garantizar la integridad operativa de la plataforma.
            </p>
          </div>
        </div>
      )}

      {/* Matrix Card */}
      <Card className="rounded-[1.5rem] sm:rounded-[2.5rem] bg-white border border-slate-100 shadow-sm overflow-hidden mx-2">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[900px]">
              {/* Header Grid */}
              <div className="grid grid-cols-[1fr_repeat(7,100px)] items-center px-8 py-5 bg-slate-50/50 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jerarquía de Módulos</span>
                <div className="flex flex-col items-center gap-1 group">
                  <CheckSquare className="w-4 h-4 text-slate-300" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Master</span>
                </div>
                {ACTION_ORDER.map(a => {
                  const Icon = ACTION_ICONS[a];
                  return (
                    <div key={a} className="flex flex-col items-center gap-1">
                      <Icon className={cn("w-4 h-4", ACTION_COLORS[a])} />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", ACTION_COLORS[a])}>{ACTION_LABELS[a]}</span>
                    </div>
                  );
                })}
              </div>

              {/* Matrix Rows */}
              <div className="divide-y divide-slate-50">
                {filteredModules.map((mod, idx) => {
                  const children = modules.filter(m => m.parent_id === mod.id);
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedModules.has(mod.id) || search.length > 0;
                  const moduleActions = getModuleActions(mod.id);

                  return (
                    <motion.div 
                      key={mod.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <div className="group grid grid-cols-[1fr_repeat(7,100px)] items-center px-8 py-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          {hasChildren ? (
                            <button 
                              onClick={() => toggleExpanded(mod.id)} 
                              className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center transition-all hover:bg-slate-50 shadow-sm"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center">
                              <div className="h-1.5 w-1.5 rounded-full bg-slate-200" />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-900 leading-none group-hover:text-primary transition-colors">{mod.name}</span>
                            <span className="block text-[8px] font-black uppercase tracking-widest text-slate-300">ORDEN: {mod.sort_order}</span>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <Checkbox
                            checked={isModuleAllChecked(mod.id)}
                            // @ts-ignore
                            indeterminate={isModuleSomeChecked(mod.id)}
                            onCheckedChange={() => toggleModuleAll(mod.id)}
                            disabled={role.is_system}
                            className="h-5 w-5 rounded-md border-slate-200 data-[state=checked]:bg-primary"
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
                                  className={cn(
                                    "h-5 w-5 rounded-md transition-all",
                                    isChecked(permId) ? ACTION_COLORS[action].replace('text-', 'bg-').replace('-600', '-500') + " border-none" : "border-slate-200"
                                  )}
                                />
                              ) : (
                                <div className="h-1 w-4 bg-slate-100 rounded-full opacity-20" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Submodules */}
                      <AnimatePresence>
                        {hasChildren && isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-slate-50/30"
                          >
                            {children.map(child => {
                              const childActions = getModuleActions(child.id);
                              if (search && !child.name.toLowerCase().includes(search.toLowerCase()) && !mod.name.toLowerCase().includes(search.toLowerCase())) return null;

                              return (
                                <div
                                  key={child.id}
                                  className="grid grid-cols-[1fr_repeat(7,100px)] items-center px-8 py-3.5 pl-20 border-l-4 border-slate-100 hover:bg-white transition-all group/sub"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-black text-slate-400">
                                      {child.sort_order}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide group-hover/sub:text-primary">{child.name}</span>
                                  </div>
                                  
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={isModuleAllChecked(child.id)}
                                      onCheckedChange={() => toggleModuleAll(child.id)}
                                      disabled={role.is_system}
                                      className="h-4.5 w-4.5 rounded shadow-none data-[state=checked]:bg-slate-900"
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
                                            className="h-4.5 w-4.5 rounded shadow-none"
                                          />
                                        ) : (
                                          <div className="h-0.5 w-2 bg-slate-200 rounded-full opacity-20" />
                                        )}
                                      </div>
                                    );
                                  })}
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
      
      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4 py-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
            <Info className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Guía de Privilegios</h5>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Los cambios afectan a todos los usuarios vinculados al rol {role.name}.</p>
          </div>
        </div>
        {!role.is_system && hasChanges && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Button onClick={handleSave} className="h-12 px-10 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 animate-pulse">
              APLICAR CAMBIOS PENDIENTES
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

const Loader2 = (props: any) => <RefreshCw {...props} />
