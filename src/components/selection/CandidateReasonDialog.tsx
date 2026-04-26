import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReasonType = 'rejection' | 'withdrawal';

const rejectionReasons = [
  { value: 'no_aprobo_emo', label: 'No aprobó EMO (Examen Médico Ocupacional)' },
  { value: 'no_aprobo_eds', label: 'No aprobó EDS (Estudio de Seguridad)' },
  { value: 'no_aprobo_pruebas', label: 'No aprobó pruebas (conocimiento o psicotécnicas)' },
  { value: 'otro', label: 'Otro motivo' },
];

const withdrawalReasons = [
  { value: 'otra_oferta', label: 'Otra oferta laboral' },
  { value: 'motivos_personales', label: 'Motivos personales' },
  { value: 'salario', label: 'Salario' },
  { value: 'otro', label: 'Otro motivo' },
];

interface CandidateReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ReasonType;
  onConfirm: (reason: string, observations: string) => void;
  isPending?: boolean;
  candidateName?: string;
}

export function CandidateReasonDialog({
  open,
  onOpenChange,
  type,
  onConfirm,
  isPending,
  candidateName,
}: CandidateReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [observations, setObservations] = useState('');

  const isRejection = type === 'rejection';
  const reasons = isRejection ? rejectionReasons : withdrawalReasons;

  const handleConfirm = () => {
    if (!reason) return;
    onConfirm(reason, observations);
    setReason('');
    setObservations('');
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setReason('');
      setObservations('');
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1rem)] max-w-md overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {isRejection ? 'Motivo de No Selección' : 'Motivo de Retiro'}
          </DialogTitle>
          <DialogDescription>
            {isRejection
              ? `Registra el motivo por el cual ${candidateName || 'el candidato'} no continúa en el proceso.`
              : `Registra la causa por la cual ${candidateName || 'el candidato'} se retira del proceso.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>{isRejection ? 'Motivo del descarte *' : 'Causa del retiro *'}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Observaciones adicionales..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant={isRejection ? 'destructive' : 'default'}
              className="w-full sm:w-auto"
              onClick={handleConfirm}
              disabled={!reason || isPending}
            >
              {isPending ? 'Procesando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
