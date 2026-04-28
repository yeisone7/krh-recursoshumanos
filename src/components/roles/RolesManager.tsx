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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">Roles y permisos por empresa</h3>
          <p className="text-sm text-muted-foreground">Crea roles para la empresa activa y define permisos por módulo</p>
        </div>
        <Button onClick={handleCreate} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rol
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Rol</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-center">Usuarios</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
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
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${role.is_system ? 'text-destructive' : 'text-primary'}`} />
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sistema</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                      {role.description || '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {role.user_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={role.is_active}
                        onCheckedChange={() => handleToggleActive(role)}
                        disabled={role.is_system}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setMatrixRoleId(role.id)}
                          title="Configurar permisos"
                        >
                          <Settings2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(role)}
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!role.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => role.user_count === 0 ? setDeleteId(role.id) : null}
                            disabled={(role.user_count || 0) > 0}
                            title={role.user_count ? 'No se puede eliminar (tiene usuarios)' : 'Eliminar'}
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
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este rol?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El rol será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
