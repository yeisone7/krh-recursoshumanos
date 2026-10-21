import { useState, useEffect } from 'react';
import { Clock, FileText, MessageSquare, Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCreatePayrollNovelty, useUpdatePayrollNovelty, usePayrollNovelties } from '@/hooks/usePayrollNovelties';
import { useEmployees } from '@/hooks/useEmployees';
import { useNoveltyReasons } from '@/hooks/useNoveltyReasons';
import { type NoveltyType, type PayrollNovelty } from '@/types/payroll';
import { toast } from '@/hooks/use-toast';
import { usePayrollConcepts } from '@/hooks/usePayrollConcepts';
import { usePayrollConfig } from '@/hooks/usePayrollConfig';
import { conceptOptions } from '@/lib/payrollConcepts';
import { CorrectionTicketRequest } from '@/components/payroll/CorrectionTicketRequest';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelty?: PayrollNovelty | null;
}

export function NoveltyFormDialog({ open, onOpenChange, novelty }: Props) {
  const { data: employees = [] } = useEmployees();
  const { data: reasons = [] } = useNoveltyReasons(true);
  const conceptsQuery = usePayrollConcepts();
  const concepts = conceptsQuery.data ?? [];
  const { data: config } = usePayrollConfig();
  const create = useCreatePayrollNovelty();
  const update = useUpdatePayrollNovelty();
  const { data: existingNovelties = [] } = usePayrollNovelties();

  const [form, setForm] = useState({
    employee_id: '',
    novelty_date: '',
    novelty_type: 'hedo' as string,
    hours: 0,
    notes: '',
    start_time: '',
    end_time: '',
    reason_id: '',
  });

  const isEditing = !!novelty?.id;
  const selectedConcept = concepts.find(c => (c.system_type || `concept:${c.id}`) === form.novelty_type);
  const unit = selectedConcept?.unit ?? 'hours';
  const equivalentHours = unit === 'days' ? form.hours * (config?.daily_hours || 8) : form.hours;

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: novelty?.employee_id || '',
        novelty_date: novelty?.novelty_date || '',
        novelty_type: novelty?.novelty_type === 'custom' ? `concept:${novelty.concept_id}` : novelty?.novelty_type || 'hedo',
        hours: novelty?.quantity ?? novelty?.hours ?? 0,
        notes: novelty?.notes || '',
        start_time: novelty?.start_time || '',
        end_time: novelty?.end_time || '',
        reason_id: novelty?.reason_id || '',
      });
    }
  }, [open, novelty]);

  // Auto-calculate end_time when start_time or hours change
  useEffect(() => {
    if (unit === 'hours' && form.start_time && form.hours > 0) {
      const [h, m] = form.start_time.split(':').map(Number);
      const totalMinutes = h * 60 + m + form.hours * 60;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = Math.round(totalMinutes % 60);
      setForm(f => ({ ...f, end_time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}` }));
    }
  }, [form.start_time, form.hours, unit]);

  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name} - ${e.document_number} (${e.operation_centers?.name || 'S.C.'})`,
  }));

  const noveltyTypeOptions = conceptOptions(concepts, isEditing ? novelty?.concept_id : null);

  const handleSave = async () => {
    if (!form.employee_id || !form.novelty_date) {
      toast({ title: 'Complete los campos requeridos', variant: 'destructive' });
      return;
    }

    if (!Number.isFinite(form.hours) || form.hours <= 0 || !noveltyTypeOptions.some(o => o.value === form.novelty_type) || !conceptsQuery.isSuccess) {
      toast({ title: 'Seleccione un concepto disponible e ingrese una cantidad mayor que cero.', variant: 'destructive' });
      return;
    }
    const payload = {
      employee_id: form.employee_id,
      novelty_date: form.novelty_date,
      novelty_type: (selectedConcept?.system_type || (selectedConcept ? 'custom' : form.novelty_type)) as NoveltyType,
      concept_id: selectedConcept?.id ?? null,
      quantity: form.hours,
      quantity_unit: unit,
      hours: equivalentHours,
      notes: form.notes || undefined,
      start_time: unit === 'hours' ? form.start_time || null : null,
      end_time: unit === 'hours' ? form.end_time || null : null,
      reason_id: form.reason_id || null,
    };

    // Validation: check for duplicates
    if (!isEditing) {
      const isDuplicate = existingNovelties.some(n => 
        n.employee_id === payload.employee_id &&
        n.novelty_date === payload.novelty_date &&
        n.novelty_type === payload.novelty_type &&
        (n.concept_id ?? null) === payload.concept_id &&
        (payload.novelty_type === 'custom' || (n.start_time === payload.start_time &&
        n.reason_id === payload.reason_id))
      );

      if (isDuplicate) {
        toast({ 
          title: 'Registro Duplicado', 
          description: 'Ya existe una novedad idéntica para este empleado en la misma fecha.', 
          variant: 'destructive' 
        });
        return;
      }
    }

    try {
      if (isEditing) {
        await update.mutateAsync({ id: novelty.id, ...payload });
        toast({ title: 'Novedad actualizada' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Novedad creada' });
      }
      onOpenChange(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'No se pudo guardar la novedad.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="novelty-form-dialog gap-0 p-0 sm:p-0 w-[calc(100vw-1rem)] sm:max-w-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh]">
        <DialogHeader className="novelty-form-header shrink-0 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/10" aria-hidden="true">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Nómina</p>
            <DialogTitle className="text-xl font-semibold leading-7 tracking-tight">{isEditing ? 'Editar Novedad' : 'Nueva Novedad'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="novelty-form-body min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-3 p-3 sm:p-4">
          <section className="novelty-form-section space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-sm" aria-labelledby="novelty-general-heading">
             <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 id="novelty-general-heading" className="text-sm font-semibold text-foreground">Información general</h3>
             </div>
             
             <div className="space-y-2">
               <Label className="text-sm font-medium text-muted-foreground">Empleado *</Label>
               <SearchableSelect
                 options={employeeOptions}
                 value={form.employee_id}
                 onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}
                 placeholder="Seleccionar empleado..."
               />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <div className="space-y-2">
                 <Label htmlFor="novelty-date" className="text-sm font-medium text-muted-foreground">Fecha de la novedad *</Label>
                 <Input
                   id="novelty-date"
                   type="date"
                   value={form.novelty_date}
                   onChange={e => setForm(f => ({ ...f, novelty_date: e.target.value }))}
                   className="h-11 rounded-lg bg-card border-input"
                 />
               </div>

               <div className="space-y-2">
                 <Label htmlFor="novelty-type" className="text-sm font-medium text-muted-foreground">Tipo de novedad</Label>
                 <Select value={form.novelty_type} onValueChange={v => setForm(f => ({ ...f, novelty_type: v, hours: 0, start_time: '', end_time: '' }))}>
                   <SelectTrigger id="novelty-type" className="h-11 rounded-lg bg-card border-input">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent className="rounded-2xl border-border ">
                     {noveltyTypeOptions.map(o => (
                       <SelectItem key={o.value} value={o.value} className="font-medium text-sm p-3">
                         {o.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="novelty-reason" className="text-sm font-medium text-muted-foreground">Motivo específico</Label>
               <Select value={form.reason_id} onValueChange={v => setForm(f => ({ ...f, reason_id: v }))}>
                 <SelectTrigger id="novelty-reason" className="h-11 rounded-lg bg-card border-input">
                   <SelectValue placeholder="Seleccionar motivo..." />
                 </SelectTrigger>
                 <SelectContent className="rounded-2xl border-border ">
                   {reasons.map(r => (
                     <SelectItem key={r.id} value={r.id} className="font-medium text-sm p-3">
                       {r.item_number}. {r.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </section>

          <section className="novelty-form-section novelty-form-time space-y-3 rounded-xl border border-primary/15 bg-card p-3 sm:p-4 shadow-sm" aria-labelledby="novelty-time-heading">
             <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 id="novelty-time-heading" className="text-sm font-semibold text-foreground">Horario y tiempos</h3>
             </div>

             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
               <div className="space-y-2">
                 <Label htmlFor="novelty-start" className="text-sm font-medium text-muted-foreground">Hora de inicio</Label>
                 <Input
                   id="novelty-start"
                   type="time"
                   disabled={unit === 'days'}
                   value={form.start_time}
                   onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                   className="h-11 rounded-lg bg-card border-input tabular-nums"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="novelty-quantity" className="text-sm font-medium text-muted-foreground">{unit === 'days' ? 'Cantidad Días' : 'Cantidad Horas'}</Label>
                 <Input
                   id="novelty-quantity"
                   type="number"
                   step="any"
                   min="0"
                   value={form.hours || ''}
                   onChange={e => setForm(f => ({ ...f, hours: Number(e.target.value) }))}
                   className="h-11 rounded-lg bg-card border-input tabular-nums"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="novelty-end" className="text-sm font-medium text-muted-foreground">Hora final</Label>
                 <Input
                   id="novelty-end"
                   type="time"
                   disabled={unit === 'days'}
                   value={form.end_time}
                   readOnly
                   className="novelty-calculated-time h-11 rounded-lg tabular-nums text-muted-foreground"
                 />
               </div>
             </div>
          </section>

          <section className="novelty-form-section space-y-3 rounded-xl border border-border/70 bg-card p-3 sm:p-4 shadow-sm" aria-labelledby="novelty-notes-heading">
             <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <Label htmlFor="novelty-notes" id="novelty-notes-heading" className="novelty-notes-label text-sm font-semibold text-foreground">Observaciones <span className="ml-1 text-xs font-normal text-muted-foreground">Opcional</span></Label>
             </div>
             <div className="space-y-2">
               <Textarea
                 id="novelty-notes"
                 value={form.notes}
                 onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                 rows={2}
                 placeholder="Detalles adicionales relevantes..."
                 className="rounded-lg bg-card border-border resize-y"
               />
             </div>
          </section>
        </div>

        <div className="novelty-form-footer border-t border-border bg-card flex flex-wrap items-center justify-end gap-2 px-3 py-3 sm:px-4 shrink-0">
          <div className="mr-auto empty:hidden [&>button]:h-9 [&>button]:px-2 [&>button]:text-xs [&>button]:text-muted-foreground [&>button]:border-transparent [&>button]:shadow-none">
            <CorrectionTicketRequest label="Permiso de corrección" defaults={{ module: 'novedades', employeeId: form.employee_id, startDate: form.novelty_date, endDate: form.novelty_date }} />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <Button variant="outline" className="h-10 px-4 rounded-lg font-medium" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="h-10 px-4 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" onClick={handleSave} disabled={create.isPending || update.isPending || !conceptsQuery.isSuccess}>
            {(create.isPending || update.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEditing ? 'Actualizar Novedad' : 'Crear Novedad'}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

