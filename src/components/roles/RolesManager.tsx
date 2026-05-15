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
import { Plus, Pencil, Trash2, Shield, Settings2, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomRoles, useDeleteRole, useUpdateRole } from '@/hooks/useRolesPermissions';
import { RoleFormDialog } from './RoleFormDialog';
import { PermissionMatrix } from './PermissionMatrix';
import { cn } from '@/lib/utils';

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        <div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Roles de Empresa
          </h3>
          <p className="text-xs font-medium text-slate-500 mt-1">Gestión de jerarquías y privilegios para {currentCompanyId}</p>
        </div>
        <Button 
          onClick={handleCreate} 
          className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/10 font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" />
          NUEVO ROL
        </Button>
      </div>

      <Card className="rounded-[2.5rem] bg-background border border-border/40 shadow-lg shadow-black/[0.02] overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-background">
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Identidad del Rol</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Descripción</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Usuarios</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-center">Estado</TableHead>
                <TableHead className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Configuración</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Cargando roles...
                  </TableCell>
                </TableRow>
              ) : roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay roles configurados
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id} className="group hover:transition-colors border-border/50">
                    <TableCell className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl border border-border/50 shadow-sm flex items-center justify-center transition-transform group-hover:scale-110",
                          role.is_system ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                        )}>
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-black text-foreground leading-none uppercase tracking-tight flex items-center gap-2">
                            {role.name}
                            {role.is_system && (
                              <Badge className="bg-destructive/10 text-destructive border-none font-black text-[8px] px-1.5 h-4 uppercase tracking-widest">SISTEMA</Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Identificador: {role.id.split('-')[0]}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6">
                      <p className="text-sm font-medium text-slate-500 max-w-[250px] leading-tight">
                        {role.description || 'Sin descripción asignada'}
                      </p>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-border text-[10px] font-black text-foreground tracking-widest">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        {role.user_count || 0} USUARIOS
                      </div>
                    </TableCell>
                    <TableCell className="px-8 py-6 text-center">
                      <Switch
                        checked={role.is_active}
                        onCheckedChange={() => handleToggleActive(role)}
                        disabled={role.is_system}
                        className="data-[state=checked]:bg-primary"
                      />
                    </TableCell>
                    <TableCell className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMatrixRoleId(role.id)}
                          className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(role)}
                          className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!role.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => role.user_count === 0 ? setDeleteId(role.id) : null}
                            disabled={(role.user_count || 0) > 0}
                            className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingRole={editingRole}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden">
          <AlertDialogHeader className="min-h-0 shrink overflow-y-auto pr-1">
            <AlertDialogTitle>¿Eliminar este rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El rol será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
