import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomRoles, useUserCustomRoles, useAssignUserRole, useRemoveUserRole } from '@/hooks/useRolesPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { AdminUser } from '@/hooks/useAdminUsers';

interface UserRoleDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleDialog({ user, open, onOpenChange }: UserRoleDialogProps) {
  const { user: authUser } = useAuth();
  const { data: allRoles = [], isLoading: rolesLoading } = useCustomRoles();
  const { data: userCustomRoles = [], isLoading: userRolesLoading } = useUserCustomRoles(user?.id);
  const assignRole = useAssignUserRole();
  const removeRole = useRemoveUserRole();

  const activeRoles = allRoles.filter(r => r.is_active);
  const currentRoleIds = userCustomRoles.map((ur: any) => ur.role_id as string);

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && !userRolesLoading) {
      setSelectedRoleIds(currentRoleIds);
    }
  }, [open, userRolesLoading, JSON.stringify(currentRoleIds)]);

  const handleToggle = (roleId: string, checked: boolean) => {
    setSelectedRoleIds(prev =>
      checked ? [...prev, roleId] : prev.filter(id => id !== roleId)
    );
  };

  const handleSave = async () => {
    if (!user) return;

    const toAdd = selectedRoleIds.filter(id => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter(id => !selectedRoleIds.includes(id));

    try {
      for (const roleId of toAdd) {
        const role = activeRoles.find(r => r.id === roleId);
        await assignRole.mutateAsync({
          userId: user.id,
          roleId,
          assignedBy: authUser?.id,
          roleName: role?.name,
          userEmail: user.email,
        });
      }
      for (const roleId of toRemove) {
        const role = activeRoles.find(r => r.id === roleId);
        await removeRole.mutateAsync({
          userId: user.id,
          roleId,
          roleName: role?.name,
          userEmail: user.email,
        });
      }
      toast.success('Roles actualizados correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al actualizar roles');
      console.error(error);
    }
  };

  const isLoading = rolesLoading || userRolesLoading;
  const isSaving = assignRole.isPending || removeRole.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Gestionar Roles</DialogTitle>
          <DialogDescription>
            Usuario: <span className="font-medium">{user?.display_name || user?.email || user?.id.slice(0, 8) + '...'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Roles actuales:</span>
            {!isLoading && currentRoleIds.length === 0 && (
              <span className="text-sm text-muted-foreground italic">Sin roles asignados</span>
            )}
            {userCustomRoles.map((ur: any) => (
              <Badge key={ur.role_id} variant="secondary">
                {ur.role?.name || ur.role_id}
              </Badge>
            ))}
          </div>

          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : activeRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay roles configurados. Crea roles en la pestaña "Roles" primero.
              </p>
            ) : (
              activeRoles.map(role => (
                <div key={role.id} className="flex min-w-0 items-start space-x-3 rounded-lg border border-border p-3 transition-colors hover:bg-background">
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedRoleIds.includes(role.id)}
                    onCheckedChange={(checked) => handleToggle(role.id, !!checked)}
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`role-${role.id}`} className="font-medium cursor-pointer">
                      {role.name}
                    </Label>
                    {role.description && (
                      <p className="break-words text-sm text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full sm:w-auto">
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
