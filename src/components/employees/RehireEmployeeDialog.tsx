import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useOpenVacancies } from '@/hooks/useVacancies';
import { getEmployeeFullName } from '@/types/employee';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RehireEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

interface StartRehireResult {
  candidate_id: string;
  vacancy_id: string;
  existing: boolean;
}

export function RehireEmployeeDialog({ open, onOpenChange, employee }: RehireEmployeeDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: vacancies = [], isLoading } = useOpenVacancies();
  const [vacancyId, setVacancyId] = useState('');

  useEffect(() => {
    if (!open) setVacancyId('');
  }, [open]);

  const startRehire = useMutation({
    mutationFn: async () => {
      if (!employee?.id || !vacancyId) {
        throw new Error('Seleccione la vacante para iniciar el reingreso.');
      }

      const { data, error } = await supabase.rpc('start_employee_rehire', {
        p_employee_id: employee.id,
        p_vacancy_id: vacancyId,
      } as never);

      if (error) throw error;
      return data as unknown as StartRehireResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['vacancies'] });
      queryClient.invalidateQueries({ queryKey: ['employee-candidate-history', employee.id] });
      toast.success(result.existing ? 'Postulación de reingreso retomada' : 'Reingreso iniciado', {
        description: result.existing
          ? 'Ya existía una postulación activa para esta vacante.'
          : 'Se creó una postulación limpia. El empleado permanecerá retirado hasta completar Selección.',
      });
      onOpenChange(false);
      navigate(`/seleccion?candidate=${result.candidate_id}`);
    },
    onError: (error: Error) => {
      toast.error('No se pudo iniciar el reingreso', { description: error.message });
    },
  });

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            Iniciar proceso de reingreso
          </DialogTitle>
          <DialogDescription>
            <strong>{getEmployeeFullName(employee)}</strong> iniciará una postulación nueva y deberá
            completar nuevamente todo el proceso de selección y el examen médico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            La identidad, los datos personales y el último contacto se precargarán para confirmación.
            Etapas, evaluaciones, documentos, familia y resultados comenzarán vacíos.
          </div>

          <div className="space-y-2">
            <Label>Vacante vigente *</Label>
            <Select value={vacancyId} onValueChange={setVacancyId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Cargando vacantes…' : 'Seleccionar vacante'} />
              </SelectTrigger>
              <SelectContent>
                {vacancies.map((vacancy: any) => (
                  <SelectItem key={vacancy.id} value={vacancy.id}>
                    {vacancy.position_title}
                    {vacancy.operation_centers?.name ? ` · ${vacancy.operation_centers.name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && vacancies.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay vacantes disponibles. Cree o habilite una vacante antes de iniciar el reingreso.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => startRehire.mutate()}
            disabled={!vacancyId || startRehire.isPending}
          >
            {startRehire.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ir a Selección
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
