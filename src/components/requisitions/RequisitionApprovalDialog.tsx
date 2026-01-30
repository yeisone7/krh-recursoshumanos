import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useApproveRequisitionStep, PersonnelRequisition } from '@/hooks/useRequisitions';
import { useContractTypes } from '@/hooks/useContractTypes';
import { recruitmentTypeLabels, RecruitmentType } from '@/types/requisition';

type ApprovalStep = 'operaciones' | 'rrhh' | 'juridico' | 'seleccion' | 'gerencia';

interface RequisitionApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requisition: PersonnelRequisition | null;
  step: ApprovalStep;
}

const stepTitles: Record<ApprovalStep, string> = {
  operaciones: 'Aprobación de Operaciones',
  rrhh: 'Aprobación de RRHH',
  juridico: 'Aprobación de Jurídico',
  seleccion: 'Aprobación de Selección',
  gerencia: 'Aprobación de Gerencia',
};

export function RequisitionApprovalDialog({
  open,
  onOpenChange,
  requisition,
  step,
}: RequisitionApprovalDialogProps) {
  const { user } = useAuth();
  const approveStep = useApproveRequisitionStep();
  const { data: contractTypes = [] } = useContractTypes();
  
  const [approverName, setApproverName] = useState(user?.email?.split('@')[0] || '');
  const [approved, setApproved] = useState(true);
  const [observations, setObservations] = useState('');
  
  // Step-specific fields
  const [salarioAprobado, setSalarioAprobado] = useState(true);
  const [asignacionSalarial, setAsignacionSalarial] = useState<number | undefined>();
  const [tipoConvocatoria, setTipoConvocatoria] = useState<string>('');
  const [condicionesAdicionales, setCondicionesAdicionales] = useState('');
  const [tipoContrato, setTipoContrato] = useState('');
  const [duracion, setDuracion] = useState('');
  const [fechaInicioProceso, setFechaInicioProceso] = useState<Date | undefined>();

  const onSubmit = async () => {
    if (!requisition) return;

    const data: Record<string, any> = {
      [`${step}_quien_aprobo`]: approverName,
      [`${step}_observaciones`]: observations,
    };

    // Add step-specific data
    if (step === 'operaciones') {
      data.operaciones_aprobado_salario = salarioAprobado;
    } else if (step === 'rrhh') {
      data.rrhh_asignacion_salarial = asignacionSalarial;
      data.rrhh_tipo_convocatoria = tipoConvocatoria || null;
      data.rrhh_condiciones_adicionales = condicionesAdicionales || null;
    } else if (step === 'juridico') {
      data.juridico_tipo_contrato = tipoContrato || null;
      data.juridico_duracion = duracion || null;
    } else if (step === 'seleccion') {
      data.seleccion_fecha_inicio_proceso = fechaInicioProceso ? format(fechaInicioProceso, 'yyyy-MM-dd') : null;
    } else if (step === 'gerencia') {
      data.gerencia_aprobado_salario = salarioAprobado;
    }

    await approveStep.mutateAsync({
      id: requisition.id,
      step,
      approved,
      data,
    });

    onOpenChange(false);
  };

  if (!requisition) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <DialogDescription>
            Requisición: {requisition.cargo_solicitado} ({requisition.cantidad_vacantes_requeridas} vacantes)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Approver name */}
          <div className="space-y-2">
            <Label>Nombre del aprobador</Label>
            <Input
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          {/* Step-specific fields */}
          {step === 'operaciones' && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Salario Aprobado</Label>
                <p className="text-sm text-muted-foreground">
                  ¿Se aprueba el salario propuesto?
                </p>
              </div>
              <Switch checked={salarioAprobado} onCheckedChange={setSalarioAprobado} />
            </div>
          )}

          {step === 'rrhh' && (
            <>
              <div className="space-y-2">
                <Label>Asignación Salarial</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={asignacionSalarial || ''}
                  onChange={(e) => setAsignacionSalarial(parseFloat(e.target.value) || undefined)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Convocatoria</Label>
                <Select value={tipoConvocatoria} onValueChange={setTipoConvocatoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {(Object.keys(recruitmentTypeLabels) as RecruitmentType[]).map((type) => (
                      <SelectItem key={type} value={type}>
                        {recruitmentTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condiciones Adicionales</Label>
                <Textarea
                  value={condicionesAdicionales}
                  onChange={(e) => setCondicionesAdicionales(e.target.value)}
                  placeholder="Condiciones especiales..."
                />
              </div>
            </>
          )}

          {step === 'juridico' && (
            <>
              <div className="space-y-2">
                <Label>Tipo de Contrato</Label>
                <Select value={tipoContrato} onValueChange={setTipoContrato}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    {contractTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.contract_type}>
                        {ct.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duración del Contrato</Label>
                <Input
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  placeholder="Ej: 6 meses, Indefinido..."
                />
              </div>
            </>
          )}

          {step === 'seleccion' && (
            <div className="space-y-2">
              <Label>Fecha Inicio del Proceso</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full pl-3 text-left font-normal',
                      !fechaInicioProceso && 'text-muted-foreground'
                    )}
                  >
                    {fechaInicioProceso ? format(fechaInicioProceso, 'dd/MM/yyyy') : 'Seleccionar fecha'}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaInicioProceso}
                    onSelect={setFechaInicioProceso}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {step === 'gerencia' && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Salario Aprobado por Gerencia</Label>
                <p className="text-sm text-muted-foreground">
                  ¿Gerencia aprueba el salario asignado?
                </p>
              </div>
              <Switch checked={salarioAprobado} onCheckedChange={setSalarioAprobado} />
            </div>
          )}

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Approval toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">
                {approved ? '✓ Aprobar' : '✗ Rechazar'}
              </Label>
              <p className="text-sm text-muted-foreground">
                {approved
                  ? 'La requisición continuará al siguiente paso.'
                  : 'La requisición será rechazada.'}
              </p>
            </div>
            <Switch checked={approved} onCheckedChange={setApproved} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={approveStep.isPending}>
              {approveStep.isPending ? 'Procesando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
