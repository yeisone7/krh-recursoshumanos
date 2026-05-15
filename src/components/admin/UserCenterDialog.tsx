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
import { useOperationCenters } from '@/hooks/useCompanies';
import { useAssignCenter, useRemoveCenterAssignment, type AdminUser } from '@/hooks/useAdminUsers';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserCenterDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserCenterDialog({ user, open, onOpenChange }: UserCenterDialogProps) {
  const { data: centers = [] } = useOperationCenters();
  const assignCenter = useAssignCenter();
  const removeCenter = useRemoveCenterAssignment();
  
  const [selectedCenters, setSelectedCenters] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedCenters(user.centers.map(c => c.id));
    }
  }, [user]);

  const handleCenterToggle = (centerId: string, checked: boolean) => {
    setSelectedCenters(prev =>
      checked ? [...prev, centerId] : prev.filter(id => id !== centerId)
    );
  };

  const handleSave = async () => {
    if (!user) return;

    const currentCenterIds = user.centers.map(c => c.id);
    const centersToAdd = selectedCenters.filter(id => !currentCenterIds.includes(id));
    const centersToRemove = currentCenterIds.filter(id => !selectedCenters.includes(id));

    try {
      // Add new center assignments
      for (const centerId of centersToAdd) {
        await assignCenter.mutateAsync({ userId: user.id, centerId });
      }

      // Remove old center assignments
      for (const centerId of centersToRemove) {
        await removeCenter.mutateAsync({ userId: user.id, centerId });
      }

      toast.success('Centros actualizados correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al actualizar centros');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle>Asignar Centros de Operación</DialogTitle>
          <DialogDescription>
            Usuario: <span className="font-medium">{user?.id.slice(0, 8)}...</span>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4 pr-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Centros actuales:</span>
              {user?.centers.length === 0 && (
                <Badge variant="outline" className="bg-emerald-50 border-emerald-100 text-emerald-600">
                  <Building2 className="w-3 h-3 mr-1" />
                  Todos los centros
                </Badge>
              )}
              {user?.centers.map(center => (
                <Badge key={center.id} variant="outline">
                  <Building2 className="w-3 h-3 mr-1" />
                  {center.name}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <Checkbox 
                id="select-all" 
                checked={selectedCenters.length === 0}
                onCheckedChange={(checked) => {
                  if (checked) setSelectedCenters([]);
                }}
              />
              <Label htmlFor="select-all" className="text-xs font-bold uppercase cursor-pointer">Todos los Centros</Label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4">
            <p className="text-[11px] text-blue-700 leading-tight">
              <strong>Nota:</strong> Si no seleccionas ningún centro específico, el sistema asignará automáticamente <strong>TODOS</strong> los centros disponibles al usuario.
            </p>
          </div>

          {centers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay centros de operación disponibles</p>
              <p className="text-sm">Crea centros desde la página de Centros</p>
            </div>
          ) : (
            <div className={cn(
              "max-h-[40dvh] overflow-y-auto pr-1 transition-opacity",
              selectedCenters.length === 0 && "opacity-50 pointer-events-none"
            )}>
              <div className="space-y-3">
                {centers.map(center => (
                  <div 
                    key={center.id} 
                    className={cn(
                      "flex min-w-0 items-start space-x-3 rounded-lg border border-border p-3 transition-colors",
                      selectedCenters.includes(center.id) ? "bg-primary/[0.03] border-primary/20" : "hover:bg-background"
                    )}
                  >
                    <Checkbox
                      id={center.id}
                      checked={selectedCenters.includes(center.id)}
                      onCheckedChange={(checked) => handleCenterToggle(center.id, !!checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <Label htmlFor={center.id} className="font-medium cursor-pointer">
                        {center.name}
                      </Label>
                      <p className="break-words text-sm text-muted-foreground">
                        {center.city && `${center.city}`}
                        {center.department && `, ${center.department}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={assignCenter.isPending || removeCenter.isPending}
            className="w-full sm:w-auto"
          >
            {assignCenter.isPending || removeCenter.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
