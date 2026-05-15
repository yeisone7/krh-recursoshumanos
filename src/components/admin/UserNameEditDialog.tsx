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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateUserProfile, type AdminUser } from '@/hooks/useAdminUsers';
import { toast } from 'sonner';
import { UserCircle } from 'lucide-react';

interface UserNameEditDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserNameEditDialog({ user, open, onOpenChange }: UserNameEditDialogProps) {
  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const updateProfile = useUpdateUserProfile();

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setDisplayName(user.display_name || '');
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!fullName.trim()) {
      toast.error('El nombre completo es requerido');
      return;
    }

    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        fullName: fullName.trim(),
        displayName: displayName.trim() || undefined,
      });
      toast.success('Perfil actualizado correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al actualizar el perfil');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5 text-primary" />
            Editar Perfil de Usuario
          </DialogTitle>
          <DialogDescription>
            Modifica el nombre completo y de visualización del usuario.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nombre de Visualización (Opcional)</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej: Juan"
                className="h-11 rounded-xl bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold"
              />
              <p className="text-[10px] text-slate-400 italic">Si se deja vacío, se usará el primer nombre.</p>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateProfile.isPending}
              className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 px-8"
            >
              {updateProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
