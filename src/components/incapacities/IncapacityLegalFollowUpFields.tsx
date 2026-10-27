import { useId, useState } from 'react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCie10Lookup } from '@/hooks/useCie10Lookup';
import { useUpdateIncapacityLegalFollowUp } from '@/hooks/useIncapacityLegalFollowUp';
import type { EmployeeIncapacity, RehabilitationConceptData, CapacityLossFollowUpData } from '@/types/incapacity';
import { Cie10SearchInput } from './Cie10SearchInput';

function OriginSelect({ id, value, onChange, disabled }: {
  id: string;
  value: 'comun' | 'laboral' | null;
  onChange: (value: 'comun' | 'laboral' | null) => void;
  disabled: boolean;
}) {
  return (
    <Select value={value || 'none'} onValueChange={(next) => onChange(next === 'none' ? null : next as 'comun' | 'laboral')} disabled={disabled}>
      <SelectTrigger id={id}><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin registrar</SelectItem>
        <SelectItem value="comun">Común</SelectItem>
        <SelectItem value="laboral">Laboral</SelectItem>
      </SelectContent>
    </Select>
  );
}

function LegalFollowUpForm({ incapacity, kind }: {
  incapacity: EmployeeIncapacity;
  kind: 'rehabilitation' | 'pcl';
}) {
  const fieldId = useId();
  const { canUpdate } = useAuth();
  const mutation = useUpdateIncapacityLegalFollowUp();
  const { lookup, isLoaded } = useCie10Lookup();
  const [origin, setOrigin] = useState<'comun' | 'laboral' | null>(
    (kind === 'rehabilitation' ? incapacity.rehabilitation_origin : incapacity.pcl_origin) ?? null,
  );
  const [outcome, setOutcome] = useState(incapacity.rehabilitation_outcome ?? null);
  const [percentage, setPercentage] = useState(incapacity.pcl_percentage?.toString() ?? '');
  const [codes, setCodes] = useState(incapacity.pcl_diagnosis_codes ?? []);
  const [code, setCode] = useState('');
  const [dirty, setDirty] = useState(false);
  const disabled = !canUpdate('incapacidades') || mutation.isPending;

  const addDiagnosis = () => {
    const normalized = code.trim().toUpperCase().replace(/[.\-\s]/g, '');
    if (!isLoaded || !lookup(normalized)) {
      toast.error('Selecciona un diagnóstico válido del catálogo CIE-10.');
      return;
    }
    if (!codes.includes(normalized)) {
      setCodes([...codes, normalized]);
      setDirty(true);
    }
    setCode('');
  };

  const save = async () => {
    if (kind === 'pcl' && code.trim()) {
      toast.error('Agrega el diagnóstico seleccionado antes de guardar.');
      return;
    }
    const pclPercentage = percentage.trim() === '' ? null : Number(percentage);
    if (kind === 'pcl' && pclPercentage !== null && (!Number.isFinite(pclPercentage) || pclPercentage < 0 || pclPercentage > 100)) {
      toast.error('El porcentaje PCL debe estar entre 0 y 100.');
      return;
    }
    const values: RehabilitationConceptData | CapacityLossFollowUpData = kind === 'rehabilitation'
      ? { rehabilitation_origin: origin, rehabilitation_outcome: outcome }
      : { pcl_percentage: pclPercentage, pcl_origin: origin, pcl_diagnosis_codes: codes };
    try {
      await mutation.mutateAsync({ id: incapacity.id, values });
      setDirty(false);
      toast.success('Seguimiento guardado');
    } catch {
      toast.error('No se pudo guardar el seguimiento. Intenta nuevamente.');
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <fieldset disabled={disabled} className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-origin`}>{kind === 'rehabilitation' ? 'Origen' : 'Origen de la enfermedad'}</Label>
          <OriginSelect id={`${fieldId}-origin`} value={origin} onChange={(value) => { setOrigin(value); setDirty(true); }} disabled={disabled} />
        </div>
        {kind === 'rehabilitation' ? (
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-outcome`}>Resultado del concepto</Label>
            <Select value={outcome || 'none'} onValueChange={(value) => { setOutcome(value === 'none' ? null : value as 'favorable' | 'desfavorable'); setDirty(true); }} disabled={disabled}>
              <SelectTrigger id={`${fieldId}-outcome`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin registrar</SelectItem>
                <SelectItem value="favorable">Favorable</SelectItem>
                <SelectItem value="desfavorable">Desfavorable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`${fieldId}-percentage`}>Pérdida de capacidad laboral (PCL) %</Label>
              <Input id={`${fieldId}-percentage`} type="number" min="0" max="100" step="any" value={percentage} placeholder="Ej: 35.5" onChange={(event) => { setPercentage(event.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${fieldId}-diagnosis`}>Diagnósticos calificados (Código CIE-10)</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1">
                  <Cie10SearchInput id={`${fieldId}-diagnosis`} value={code} onChange={setCode} onDiagnosisFound={ignoreDiagnosis} placeholder="Buscar por código o diagnóstico..." />
                </div>
                <Button type="button" variant="outline" onClick={addDiagnosis} disabled={disabled || !code.trim() || !isLoaded}>
                  <Plus className="mr-1 h-4 w-4" />Agregar
                </Button>
              </div>
              {codes.length === 0 && <p className="text-xs text-muted-foreground">Sin diagnósticos calificados registrados.</p>}
              <ul className="space-y-1">
                {codes.map((selectedCode) => (
                  <li key={selectedCode} className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-xs">
                    <span><strong>{selectedCode}</strong> — {lookup(selectedCode) || 'Diagnóstico registrado'}</span>
                    {!disabled && <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label={`Quitar diagnóstico ${selectedCode}`} onClick={() => { setCodes(codes.filter((item) => item !== selectedCode)); setDirty(true); }}><X className="h-3.5 w-3.5" /></Button>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </fieldset>
      {canUpdate('incapacidades') && (
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={save} disabled={disabled || (!dirty && !code.trim())}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar seguimiento
          </Button>
        </div>
      )}
    </div>
  );
}

function ignoreDiagnosis() {}

export function IncapacityLegalFollowUpFields(props: {
  incapacity: EmployeeIncapacity;
  kind: 'rehabilitation' | 'pcl';
}) {
  const { incapacity, kind } = props;
  // Reset the draft when switching cases or receiving saved values, while keeping
  // unsaved edits stable during unrelated document or detail refetches.
  const savedValues = kind === 'rehabilitation'
    ? [incapacity.rehabilitation_origin, incapacity.rehabilitation_outcome]
    : [incapacity.pcl_percentage, incapacity.pcl_origin, incapacity.pcl_diagnosis_codes];
  return <LegalFollowUpForm key={`${incapacity.id}-${kind}-${JSON.stringify(savedValues)}`} {...props} />;
}
