import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Briefcase, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOpenVacancies } from '@/hooks/useVacancies';
import { useTransferCandidateProcess } from '@/hooks/useCandidates';

interface CandidateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: {
    id: string;
    first_name: string;
    last_name: string;
    vacancy_id: string;
    status?: string | null;
    employee_id?: string | null;
  } | null;
  currentVacancy?: {
    id?: string | null;
    position_title?: string | null;
    operation_centers?: { name?: string | null } | null;
  } | null;
  onTransferred?: () => void;
}

export function CandidateTransferDialog({
  open,
  onOpenChange,
  candidate,
  currentVacancy,
  onTransferred,
}: CandidateTransferDialogProps) {
  const [targetVacancyId, setTargetVacancyId] = useState('');
  const [reason, setReason] = useState('');
  const { data: vacancies = [], isLoading } = useOpenVacancies();
  const transferCandidate = useTransferCandidateProcess();

  useEffect(() => {
    if (!open) {
      setTargetVacancyId('');
      setReason('');
    }
  }, [open]);

  const eligibleVacancies = useMemo(
    () => vacancies.filter((vacancy) => vacancy.id !== candidate?.vacancy_id),
    [candidate?.vacancy_id, vacancies]
  );
  const selectedVacancy = eligibleVacancies.find((vacancy) => vacancy.id === targetVacancyId);
  const candidateName = candidate ? `${candidate.first_name} ${candidate.last_name}` : 'este candidato';
  const isBlocked = candidate?.status === 'hired' || Boolean(candidate?.employee_id);

  const handleConfirm = async () => {
    if (!candidate || !targetVacancyId || !reason.trim()) return;

    try {
      await transferCandidate.mutateAsync({
        candidateId: candidate.id,
        targetVacancyId,
        reason,
      });
      toast.success('Candidato trasladado', {
        description: `${candidateName} fue movido al proceso ${selectedVacancy?.position_title || 'destino'}.`,
      });
      onTransferred?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('No se pudo trasladar el candidato', {
        description: error?.message || 'Intente nuevamente o revise los permisos del proceso.',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <DialogTitle>Trasladar a otro proceso</DialogTitle>
          <DialogDescription>
            Mueve el candidato a otra vacante de la empresa actual conservando su historial y documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Candidato</p>
            <p className="font-medium text-foreground">{candidateName}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proceso actual</p>
            <p className="text-sm text-foreground">
              {currentVacancy?.position_title || 'Vacante actual'}
              {currentVacancy?.operation_centers?.name ? ` - ${currentVacancy.operation_centers.name}` : ''}
            </p>
          </div>

          {isBlocked ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Este candidato ya fue vinculado como empleado y no puede trasladarse de proceso.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Vacante destino *</label>
                <Select value={targetVacancyId} onValueChange={setTargetVacancyId} disabled={isLoading || transferCandidate.isPending}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? 'Cargando vacantes...' : 'Seleccionar vacante destino'} />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {eligibleVacancies.map((vacancy) => (
                      <SelectItem key={vacancy.id} value={vacancy.id}>
                        {vacancy.position_title} - {(vacancy.operation_centers as any)?.name || 'General'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isLoading && eligibleVacancies.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay otras vacantes activas disponibles para traslado.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Motivo del traslado *</label>
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explique por qué se traslada este candidato a otro proceso..."
                  className="min-h-[96px] resize-none"
                  disabled={transferCandidate.isPending}
                />
              </div>

              {selectedVacancy && (
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>
                    Al confirmar, el candidato aparecerá en <strong>{selectedVacancy.position_title}</strong>
                    {(selectedVacancy.operation_centers as any)?.name ? ` - ${(selectedVacancy.operation_centers as any).name}` : ''}
                    {' '}y dejará de mostrarse en el proceso actual.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={transferCandidate.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isBlocked || transferCandidate.isPending || !targetVacancyId || !reason.trim()}
          >
            {transferCandidate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Trasladar candidato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
