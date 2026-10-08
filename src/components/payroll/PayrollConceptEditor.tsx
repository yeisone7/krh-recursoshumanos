import { useId } from 'react';
import { Plus, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PayrollConceptDraft } from '@/types/payroll';

interface Props {
  value: PayrollConceptDraft[];
  onChange: (value: PayrollConceptDraft[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}
export function PayrollConceptEditor({ value, onChange, errors, disabled }: Props) {
  const prefix = useId();
  const edit = (id: string, patch: Partial<PayrollConceptDraft>) => onChange(value.map(c => c.id === id ? { ...c, ...patch } : c));
  return <section className="space-y-4" aria-label="Conceptos">
    <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
      <div><h3 className="text-sm font-bold uppercase tracking-widest">Conceptos</h3><p className="mt-1 text-xs text-muted-foreground">Administre los conceptos y sus porcentajes de recargo.</p></div>
      <Button type="button" variant="outline" disabled={disabled} className="shrink-0 rounded-xl" onClick={() => onChange([...value, {
        id: crypto.randomUUID(), company_id: value[0]?.company_id || '', name: '', identifier: '', unit: 'hours', percentage: '0', is_active: true, system_type: null, sort_order: value.length,
      }])}><Plus className="mr-2 h-4 w-4" />Agregar concepto</Button>
    </div>
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-2 sm:p-3">
      {value.map((c, i) => <div key={c.id} className={`rounded-xl border border-border bg-background p-3 ${c.is_active ? '' : 'bg-muted/30'}`}>
        <fieldset disabled={disabled} className="grid min-w-0 grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(120px,1fr)_minmax(100px,.7fr)_100px_100px_auto]">
          <legend className="sr-only">Concepto {i + 1}</legend>
          <div className="col-span-2 min-w-0 lg:col-span-1"><Label htmlFor={`${prefix}-name-${c.id}`} className="text-xs">Nombre</Label><Input id={`${prefix}-name-${c.id}`} value={c.name} aria-invalid={!!errors[c.id]} onChange={e => edit(c.id, { name: e.target.value })} className="mt-1 rounded-lg" /></div>
          <div className="min-w-0"><Label htmlFor={`${prefix}-identifier-${c.id}`} className="text-xs">Identificador</Label><Input id={`${prefix}-identifier-${c.id}`} value={c.identifier} aria-invalid={!!errors[c.id]} onChange={e => edit(c.id, { identifier: e.target.value })} className="mt-1 rounded-lg font-mono" /></div>
          <div><Label htmlFor={`${prefix}-unit-${c.id}`} className="text-xs">Unidad</Label><select id={`${prefix}-unit-${c.id}`} value={c.unit} disabled={c.has_novelties || disabled} onChange={e => edit(c.id, { unit: e.target.value as 'hours' | 'days' })} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-sm" title={c.has_novelties ? 'La unidad no se puede cambiar porque el concepto tiene novedades.' : undefined}><option value="hours">Horas</option><option value="days">Días</option></select></div>
          <div><Label htmlFor={`${prefix}-percentage-${c.id}`} className="text-xs">Porcentaje (%)</Label><Input id={`${prefix}-percentage-${c.id}`} type="number" min="0" step="any" value={c.percentage} aria-invalid={!!errors[c.id]} onChange={e => edit(c.id, { percentage: e.target.value })} className="mt-1 rounded-lg font-mono" /></div>
          <div className="flex h-10 items-center justify-end gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`${c.is_active ? 'Desactivar' : 'Reactivar'} ${c.name || 'concepto'}`} aria-pressed={c.is_active} onClick={() => edit(c.id, { is_active: !c.is_active })}><Power className={`h-4 w-4 ${c.is_active ? 'text-primary' : 'text-muted-foreground'}`} /></Button><Button type="button" variant="ghost" size="icon" disabled={!!c.system_type || c.has_novelties} aria-label={`Eliminar ${c.name || 'concepto'}`} onClick={() => onChange(value.filter(item => item.id !== c.id))}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></div>
        </fieldset>
        {!c.is_active && <p className="mt-2 text-xs text-muted-foreground">Inactivo · disponible en registros históricos</p>}
        {errors[c.id] && <p role="alert" className="mt-2 text-xs text-destructive">{errors[c.id]}</p>}
      </div>)}
      {!value.length && <p className="p-3 text-sm text-muted-foreground">Agregue un concepto para comenzar.</p>}
    </div>
  </section>;
}
