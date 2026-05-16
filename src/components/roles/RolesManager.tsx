import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Shield, Settings2, Users, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles, useDeleteRole, useUpdateRole } from '@/hooks/useRolesPermissions';
import { RoleFormDialog } from './RoleFormDialog';
import { PermissionMatrix } from './PermissionMatrix';
import { cn } from '@/lib/utils';
import { MobileCardList } from '@/components/shared/MobileCardList';

export function RolesManager() {
  const { currentCompanyId, user } = useAuth();
  const { data: roles = [], isLoading } = useCustomRoles();
  const deleteRole = useDeleteRole();
  const updateRole = useUpdateRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [matrixRoleId, setMatrixRoleId] = useState<string | null>(null);

  const matrixRole = roles.find(r => r.id === matrixRoleId);

  const handleCreate = () => {
    setEditingRole(null);
    setFormOpen(true);
  };

  const handleEdit = (role: any) => {
    setEditingRole(role);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteRole.mutate(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleActive = (role: any) => {
    updateRole.mutate({ id: role.id, is_active: !role.is_active });
  };

  if (matrixRoleId && matrixRole) {
    return (
      <PermissionMatrix
        role={matrixRole}
        onBack={() => setMatrixRoleId(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-2">
        <div className="text-center md:text-left space-y-1">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center justify-center md:justify-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Shield className="w-6 h-6 stroke-[2.5]" />
            </div>
            Gestión de Roles
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest md:ml-13">Definición de jerarquías corporativas</p>
        </div>
        <Button 
          onClick={handleCreate} 
          className="h-14 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95 group w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-3 stroke-[3] group-hover:rotate-90 transition-transform" />
          ESTABLECER ROL
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 animate-pulse flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consultando matriz de acceso...</p>
        </div>
      ) : (
        <>
        <div className="px-2">
          <MobileCardList
            className="md:hidden"
            emptyMessage="No se han definido roles para esta entidad"
            items={roles.map(role => ({
              id: role.id,
              title: role.name,
              subtitle: role.description || 'Sin descripción técnica',
              badge: role.is_system ? <Badge className="bg-destructive/10 text-destructive border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded">SISTEMA</Badge> : null,
              icon: <Shield className={cn("w-5 h-5", role.is_system ? "text-destructive" : "text-primary")} />,
              fields: [
                {
                  label: 'Identificador',
                  value: <span className="font-mono text-[9px] font-bold text-slate-400">{role.id.split('-')[0].toUpperCase()}</span>,
                },
                {
                  label: 'Población',
                  value: (
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg">
                      <Users className="h-3 w-3 text-primary" />
                      <span className="font-black text-[10px]">{role.user_count || 0} ACTIVOS</span>
                    </div>
                  ),
                },
                {
                  label: 'Visibilidad',
                  value: (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={role.is_active}
                        onCheckedChange={() => handleToggleActive(role)}
                        disabled={role.is_system}
                        className="data-[state=checked]:bg-primary scale-75"
                      />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", role.is_active ? "text-emerald-500" : "text-slate-300")}>
                        {role.is_active ? 'HABILITADO' : 'SUSPENDIDO'}
                      </span>
                    </div>
                  ),
                  className: 'col-span-2',
                },
              ],
              actions: (
                <div className="flex gap-2 w-full">
                  <Button onClick={() => setMatrixRoleId(role.id)} className="flex-1 h-12 rounded-xl bg-primary text-white font-black uppercase tracking-widest text-[9px] gap-2 border-none">
                    <Settings2 className="w-3.5 h-3.5" />
                    MATRIZ
                  </Button>
                  <Button onClick={() => handleEdit(role)} className="h-12 w-12 rounded-xl bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-[9px] border-none shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ),
            }))}
          />
        </div>

        <div className="hidden md:block px-2">
          <Card className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-slate-100">
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidad del Rol</TableHead>
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción Operativa</TableHead>
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Usuarios Vinculados</TableHead>
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                    <TableHead className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones Globales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id} className="group hover:bg-primary/[0.02] transition-colors border-slate-50">
                      <TableCell className="px-8 py-6">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "h-14 w-14 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm",
                            role.is_system ? "bg-red-50 text-red-500 border-red-100" : "bg-primary/5 text-primary border-primary/10"
                          )}>
                            <Shield className="w-6 h-6 stroke-[2.5]" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-slate-900 uppercase tracking-tight leading-none">{role.name}</span>
                              {role.is_system && (
                                <Badge className="bg-red-500 text-white border-none font-black text-[8px] px-2 py-0.5 rounded-lg uppercase tracking-widest shadow-lg shadow-red-200">SISTEMA</Badge>
                              )}
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID: {role.id.split('-')[0].toUpperCase()}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-500 max-w-[300px] leading-relaxed italic">
                          "{role.description || 'Sin manual de funciones asignado'}"
                        </p>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        <div className="inline-flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-2xl shadow-sm transition-transform group-hover:scale-105">
                          <Users className="w-4 h-4 text-primary stroke-[2.5]" />
                          <span className="text-sm font-black text-slate-900">{role.user_count || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Switch
                            checked={role.is_active}
                            onCheckedChange={() => handleToggleActive(role)}
                            disabled={role.is_system}
                            className="data-[state=checked]:bg-emerald-500"
                          />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", role.is_active ? "text-emerald-600" : "text-slate-300")}>
                            {role.is_active ? 'HABILITADO' : 'SUSPENDIDO'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMatrixRoleId(role.id)}
                            className="h-11 w-11 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm border border-transparent hover:border-primary"
                            title="Matriz de Permisos"
                          >
                            <Settings2 className="w-4.5 h-4.5 stroke-[2.5]" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(role)}
                            className="h-11 w-11 rounded-xl hover:bg-primary/10 hover:text-primary transition-all shadow-sm border border-transparent hover:border-primary/20"
                            title="Editar Parámetros"
                          >
                            <Pencil className="w-4.5 h-4.5 stroke-[2.5]" />
                          </Button>
                          {!role.is_system && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => role.user_count === 0 ? setDeleteId(role.id) : null}
                              disabled={(role.user_count || 0) > 0}
                              className={cn(
                                "h-11 w-11 rounded-xl transition-all shadow-sm border border-transparent",
                                (role.user_count || 0) > 0 
                                  ? "opacity-30 cursor-not-allowed bg-slate-50" 
                                  : "hover:bg-red-50 hover:text-red-500 hover:border-red-100"
                              )}
                              title={(role.user_count || 0) > 0 ? "No se puede eliminar roles con usuarios vinculados" : "Eliminar Rol"}
                            >
                              <Trash2 className="w-4.5 h-4.5 stroke-[2.5]" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        </>
      )}

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRole={editingRole}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-slate-100 bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-[1.25rem] bg-red-50 text-red-500 flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">¿Eliminar este Rol?</AlertDialogTitle>
                <AlertDialogDescription className="text-[11px] font-black uppercase tracking-widest text-slate-400 leading-relaxed">
                  Esta acción es irreversible. Se eliminará la configuración de acceso <br /> 
                  asociada a esta jerarquía permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
          </div>
          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-12 rounded-2xl border-slate-200 font-black uppercase text-[10px] tracking-widest flex-1">DESCARTAR</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-12 rounded-2xl bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest text-[10px] flex-1">CONFIRMAR ELIMINACIÓN</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
