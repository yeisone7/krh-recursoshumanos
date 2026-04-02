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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAssignCompany, useRemoveCompanyAssignment, type AdminUser } from '@/hooks/useAdminUsers';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UserCompanyDialogProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserCompanyDialog({ user, open, onOpenChange }: UserCompanyDialogProps) {
  const { data: allCompanies = [] } = useQuery({
    queryKey: ['all-companies-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, nit')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const assignCompany = useAssignCompany();
  const removeCompany = useRemoveCompanyAssignment();

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedCompanies(user.companies.map(c => c.id));
    }
  }, [user]);

  const handleToggle = (companyId: string, checked: boolean) => {
    setSelectedCompanies(prev =>
      checked ? [...prev, companyId] : prev.filter(id => id !== companyId)
    );
  };

  const handleSave = async () => {
    if (!user) return;

    const currentIds = user.companies.map(c => c.id);
    const toAdd = selectedCompanies.filter(id => !currentIds.includes(id));
    const toRemove = currentIds.filter(id => !selectedCompanies.includes(id));

    try {
      for (const companyId of toAdd) {
        await assignCompany.mutateAsync({ userId: user.id, companyId });
      }
      for (const companyId of toRemove) {
        await removeCompany.mutateAsync({ userId: user.id, companyId });
      }

      toast.success('Empresas actualizadas correctamente');
      onOpenChange(false);
    } catch (error) {
      toast.error('Error al actualizar empresas');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Empresas</DialogTitle>
          <DialogDescription>
            Selecciona las empresas a las que tendrá acceso este usuario.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Empresas actuales:</span>
            {user?.companies.length === 0 && (
              <span className="text-sm text-muted-foreground italic">Sin empresas asignadas</span>
            )}
            {user?.companies.map(company => (
              <Badge key={company.id} variant="outline">
                <Building2 className="w-3 h-3 mr-1" />
                {company.name}
              </Badge>
            ))}
          </div>

          {allCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay empresas disponibles</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {allCompanies.map(company => (
                  <div
                    key={company.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`company-${company.id}`}
                      checked={selectedCompanies.includes(company.id)}
                      onCheckedChange={(checked) => handleToggle(company.id, !!checked)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={`company-${company.id}`} className="font-medium cursor-pointer">
                        {company.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        NIT: {company.nit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignCompany.isPending || removeCompany.isPending}
          >
            {assignCompany.isPending || removeCompany.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
