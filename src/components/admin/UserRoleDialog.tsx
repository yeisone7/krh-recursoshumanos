import { useState } from 'react';
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
import { useAssignRole, useRemoveRole, type AdminUser } from '@/hooks/useAdminUsers';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Administrador', description: 'Acceso total al sistema' },
  { value: 'rrhh', label: 'RRHH', description: 'Gestión de empleados y contratos' },
  { value: 'psicologo', label: 'Psicólogo', description: 'Gestión de exámenes médicos' },
  { value: 'jefe_area', label: 'Jefe de Área', description: 'Supervisión de equipos' },
  { value: 'auditor', label: 'Auditor', description: 'Solo lectura para auditoría' },
];

interface UserRoleDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleDialog({ user, open, onOpenChange }: UserRoleDialogProps) {
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(user?.roles || []);
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const handleRoleToggle = (role: AppRole, checked: boolean) => {
    setSelectedRoles(prev =>
      checked ? [...prev, role] : prev.filter(r => r !== role)
    );
  };

  const handleSave = async () => {
    if (!user) return;

    const currentRoles = user.roles;
    const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));
    const rolesToRemove = currentRoles.filter(r => !selectedRoles.includes(r));

    try {
      // Add new roles
      for (const role of rolesToAdd) {
        await assignRole.mutateAsync({ userId: user.id, role });
      }

      // Remove old roles
      for (const role of rolesToRemove) {
        await removeRole.mutateAsync({ userId: user.id, role });
      }

      toast.success('Roles actualizados correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al actualizar roles');
      console.error(error);
    }
  };

  // Reset selected roles when user changes
  if (user && selectedRoles !== user.roles && !assignRole.isPending && !removeRole.isPending) {
    setSelectedRoles(user.roles);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar Roles</DialogTitle>
          <DialogDescription>
            Usuario: <span className="font-medium">{user?.id.slice(0, 8)}...</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Roles actuales:</span>
            {user?.roles.length === 0 && (
              <span className="text-sm text-muted-foreground italic">Sin roles asignados</span>
            )}
            {user?.roles.map(role => (
              <Badge key={role} variant="secondary">
                {AVAILABLE_ROLES.find(r => r.value === role)?.label || role}
              </Badge>
            ))}
          </div>

          <div className="space-y-3">
            {AVAILABLE_ROLES.map(role => (
              <div key={role.value} className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={role.value}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={(checked) => handleRoleToggle(role.value, !!checked)}
                />
                <div className="flex-1">
                  <Label htmlFor={role.value} className="font-medium cursor-pointer">
                    {role.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={assignRole.isPending || removeRole.isPending}
          >
            {assignRole.isPending || removeRole.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
