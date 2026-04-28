import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRole, useUpdateRole, CustomRole } from '@/hooks/useRolesPermissions';

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingRole: CustomRole | null;
}

export function RoleFormDialog({ open, onOpenChange, editingRole }: RoleFormDialogProps) {
  const { currentCompanyId, user } = useAuth();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const isSystem = editingRole?.is_system || false;

  useEffect(() => {
    if (open) {
      setName(editingRole?.name || '');
      setDescription(editingRole?.description || '');
    }
  }, [open, editingRole]);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    if (editingRole) {
      const data: any = { id: editingRole.id };
      if (!isSystem) data.name = name.trim();
      data.description = description.trim() || null;
      await updateRole.mutateAsync(data);
    } else {
      await createRole.mutateAsync({
        company_id: currentCompanyId!,
        name: name.trim(),
        description: description.trim() || undefined,
        created_by: user?.id,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          <DialogDescription>
            {editingRole ? 'Modifica los datos del rol' : 'Crea un nuevo rol para asignar permisos'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Coordinador RRHH"
              disabled={isSystem}
            />
            {isSystem && (
              <p className="text-xs text-muted-foreground">El nombre del rol de sistema no puede modificarse</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe las responsabilidades de este rol..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createRole.isPending || updateRole.isPending}
            className="w-full sm:w-auto"
          >
            {editingRole ? 'Guardar' : 'Crear Rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
