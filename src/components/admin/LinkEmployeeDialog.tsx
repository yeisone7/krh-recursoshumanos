import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Link, Unlink } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useLinkEmployeeToUser, useUnlinkEmployee, useEmployeeLinks } from '@/hooks/useAdminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { getEmployeeFullName } from '@/types/employee';

interface LinkEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail?: string;
}

export function LinkEmployeeDialog({ open, onOpenChange, userId, userEmail }: LinkEmployeeDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  
  const { currentCompanyId } = useAuth();
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: links } = useEmployeeLinks(currentCompanyId);
  const linkMutation = useLinkEmployeeToUser();
  const unlinkMutation = useUnlinkEmployee();

  // Find if this user already has a linked employee
  const existingLink = links?.find(l => l.user_id === userId);
  const linkedEmployeeIds = new Set(links?.map(l => l.employee_id) || []);

  // Filter employees: not already linked and matching search
  const availableEmployees = employees?.filter(emp => {
    if (linkedEmployeeIds.has(emp.id)) return false;
    if (!search) return true;
    
    const fullName = getEmployeeFullName(emp).toLowerCase();
    const doc = emp.document_number?.toLowerCase() || '';
    const searchLower = search.toLowerCase();
    
    return fullName.includes(searchLower) || doc.includes(searchLower);
  }) || [];

  const handleLink = async () => {
    if (!selectedEmployeeId) return;
    
    try {
      await linkMutation.mutateAsync({ employeeId: selectedEmployeeId, userId });
      toast({
        title: 'Empleado vinculado',
        description: 'El empleado ahora puede acceder al portal con este usuario.',
      });
      setSelectedEmployeeId('');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo vincular el empleado',
        variant: 'destructive',
      });
    }
  };

  const handleUnlink = async () => {
    if (!existingLink) return;
    
    try {
      await unlinkMutation.mutateAsync(existingLink.employee_id);
      toast({
        title: 'Vínculo eliminado',
        description: 'El empleado ya no tiene acceso al portal con este usuario.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el vínculo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Vincular Empleado al Portal
          </DialogTitle>
          <DialogDescription>
            {userEmail && (
              <span>Usuario: <strong>{userEmail}</strong></span>
            )}
            <span className="block mt-1 text-xs">
              Al vincular un empleado, este usuario podrá acceder al Portal del Empleado y ver su información personal, documentos, vacaciones e incapacidades.
            </span>
          </DialogDescription>
        </DialogHeader>

        {existingLink ? (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="p-4 rounded-lg border bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">Empleado vinculado actualmente:</p>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {existingLink.employees_v2?.first_name?.[0]}{existingLink.employees_v2?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {existingLink.employees_v2?.first_name} {existingLink.employees_v2?.last_name}
                  </p>
                  <p className="break-words text-sm text-muted-foreground">
                    {existingLink.employees_v2?.document_number}
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleUnlink}
              disabled={unlinkMutation.isPending}
            >
              <Unlink className="h-4 w-4 mr-2" />
              {unlinkMutation.isPending ? 'Desvinculando...' : 'Desvincular Empleado'}
            </Button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[45dvh] overflow-y-auto rounded-lg border">
              {loadingEmployees ? (
                <div className="p-4 text-center text-muted-foreground">
                  Cargando empleados...
                </div>
              ) : availableEmployees.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {search ? 'No se encontraron empleados' : 'No hay empleados disponibles'}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {availableEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmployeeId(emp.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedEmployeeId === emp.id 
                          ? 'bg-primary/10 border-primary border' 
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{getEmployeeFullName(emp)}</p>
                        <p className="text-sm text-muted-foreground">{emp.document_number}</p>
                      </div>
                      {!emp.is_active && (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 sm:flex-row sm:gap-0">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                onClick={handleLink}
                disabled={!selectedEmployeeId || linkMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Link className="h-4 w-4 mr-2" />
                {linkMutation.isPending ? 'Vinculando...' : 'Vincular Empleado'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
