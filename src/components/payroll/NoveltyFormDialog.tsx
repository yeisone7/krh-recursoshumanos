import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useCreatePayrollNovelty, useUpdatePayrollNovelty } from '@/hooks/usePayrollNovelties';
import { useEmployees } from '@/hooks/useEmployees';
import { useNoveltyReasons } from '@/hooks/useNoveltyReasons';
import { NOVELTY_TYPE_LABELS, type NoveltyType, type PayrollNovelty } from '@/types/payroll';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novelty?: PayrollNovelty | null;
}

export function NoveltyFormDialog({ open, onOpenChange, novelty }: Props) {
  const { data: employees = [] } = useEmployees();
  const { data: reasons = [] } = useNoveltyReasons(true);
  const create = useCreatePayrollNovelty();
  const update = useUpdatePayrollNovelty();

  const [form, setForm] = useState({
    employee_id: '',
    novelty_date: '',
    novelty_type: 'hedo' as NoveltyType,
    hours: 0,
    notes: '',
    start_time: '',
    end_time: '',
    reason_id: '',
  });

  const isEditing = !!novelty;

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: novelty?.employee_id || '',
        novelty_date: novelty?.novelty_date || '',
        novelty_type: (novelty?.novelty_type || 'hedo') as NoveltyType,
        hours: novelty?.hours || 0,
        notes: novelty?.notes || '',
        start_time: (novelty as any)?.start_time || '',
        end_time: (novelty as any)?.end_time || '',
        reason_id: (novelty as any)?.reason_id || '',
      });
    }
  }, [open, novelty]);

  // Auto-calculate end_time when start_time or hours change
  useEffect(() => {
    if (form.start_time && form.hours > 0) {
      const [h, m] = form.start_time.split(':').map(Number);
      const totalMinutes = h * 60 + m + form.hours * 60;
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = Math.round(totalMinutes % 60);
      setForm(f => ({ ...f, end_time: `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}` }));
    }
  }, [form.start_time, form.hours]);

  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: `${e.first_name} ${e.last_name} - ${e.document_number}`,
  }));

  const noveltyTypeOptions = Object.entries(NOVELTY_TYPE_LABELS).map(([value, label]) => ({
    value, label,
  }));

  const handleSave = async () => {
    if (!form.employee_id || !form.novelty_date) {
      toast({ title: 'Complete los campos requeridos', variant: 'destructive' });
      return;
    }

    const payload: any = {
      employee_id: form.employee_id,
      novelty_date: form.novelty_date,
      novelty_type: form.novelty_type,
      hours: form.hours,
      notes: form.notes || undefined,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      reason_id: form.reason_id || null,
    };

    try {
      if (isEditing) {
        await update.mutateAsync({ id: novelty.id, ...payload });
        toast({ title: 'Novedad actualizada' });
      } else {
        await create.mutateAsync(payload);
        toast({ title: 'Novedad creada' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Novedad' : 'Nueva Novedad'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Empleado *</Label>
            <SearchableSelect
              options={employeeOptions}
              value={form.employee_id}
              onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}
              placeholder="Seleccionar empleado..."
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Input
              type="date"
              value={form.novelty_date}
              onChange={e => setForm(f => ({ ...f, novelty_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de novedad</Label>
            <Select value={form.novelty_type} onValueChange={v => setForm(f => ({ ...f, novelty_type: v as NoveltyType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {noveltyTypeOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Hora inicio</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Horas</Label>
              <Input
                type="number"
                step="0.5"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora final</Label>
              <Input
                type="time"
                value={form.end_time}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={form.reason_id} onValueChange={v => setForm(f => ({ ...f, reason_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar motivo..." /></SelectTrigger>
              <SelectContent>
                {reasons.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.item_number}. {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
            {isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
