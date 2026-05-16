import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Calendar, Clock, FileText, MessageSquare, Briefcase } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useCreatePayrollNovelty, useUpdatePayrollNovelty, usePayrollNovelties } from '@/hooks/usePayrollNovelties';
import { useEmployees } from '@/hooks/useEmployees';
import { useNoveltyReasons } from '@/hooks/useNoveltyReasons';
import { NOVELTY_TYPE_LABELS, type NoveltyType, type PayrollNovelty } from '@/types/payroll';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const { data: existingNovelties = [] } = usePayrollNovelties();

  const [activeTab, setActiveTab] = useState('detalles');

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

  const isEditing = !!novelty?.id;
  const selectedEmployee = employees.find(e => e.id === form.employee_id);

  useEffect(() => {
    if (open) {
      setForm({
        employee_id: novelty?.employee_id || '',
        novelty_date: novelty?.novelty_date || '',
        novelty_type: (novelty?.novelty_type || 'hedo') as NoveltyType,
        hours: novelty?.hours || 0,
        notes: novelty?.notes || '',
        start_time: novelty?.start_time || '',
        end_time: novelty?.end_time || '',
        reason_id: novelty?.reason_id || '',
      });
      setActiveTab('detalles');
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
    label: `${e.first_name} ${e.last_name} - ${e.document_number} (${(e as any).operation_centers?.name || 'S.C.'})`,
  }));

  const noveltyTypeOptions = Object.entries(NOVELTY_TYPE_LABELS).map(([value, label]) => ({
    value, label,
  }));

  const handleSave = async () => {
    if (!form.employee_id || !form.novelty_date) {
      toast({ title: 'Complete los campos requeridos', variant: 'destructive' });
      setActiveTab('detalles');
      return;
    }

    const payload = {
      employee_id: form.employee_id,
      novelty_date: form.novelty_date,
      novelty_type: form.novelty_type,
      hours: form.hours,
      notes: form.notes || undefined,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      reason_id: form.reason_id || null,
    };

    // Validation: check for duplicates
    if (!isEditing) {
      const isDuplicate = existingNovelties.some(n => 
        n.employee_id === payload.employee_id &&
        n.novelty_date === payload.novelty_date &&
        n.novelty_type === payload.novelty_type &&
        n.start_time === payload.start_time &&
        n.reason_id === payload.reason_id
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
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 shadow-2xl w-[calc(100vw-2rem)] sm:max-w-2xl overflow-hidden rounded-[2rem] flex flex-col max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Editar Novedad' : 'Nueva Novedad'}</DialogTitle>
        </DialogHeader>

        {/* Header Premium */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 px-6 sm:px-8 py-6 sm:py-8 border-b border-border ">
          
          
          <div className="flex items-start gap-4 sm:gap-5 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[1.25rem] bg-primary/10 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shrink-0 shadow-inner">
              NN
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                  {isEditing ? 'Edición' : 'Nueva'}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase tracking-widest text-[9px] px-2.5 py-0.5">
                  Nómina
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground mb-3 truncate">
                {isEditing ? 'Editar Novedad' : 'Nueva Novedad'}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground/80">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary/60" />
                  {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : 'Empleado no seleccionado'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  {form.novelty_date ? format(new Date(`${form.novelty_date}T12:00:00`), 'MMMM yyyy', { locale: es }) : 'Mes sin definir'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8">
          <section className="space-y-6">
             <div className="flex items-center gap-2 border-b border-border pb-2">
                <FileText className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Información General</h3>
             </div>
             
             <div className="space-y-2">
               <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Empleado Requerido *</Label>
               <SearchableSelect
                 options={employeeOptions}
                 value={form.employee_id}
                 onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}
                 placeholder="Seleccionar empleado..."
               />
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Fecha Novedad *</Label>
                 <Input
                   type="date"
                   value={form.novelty_date}
                   onChange={e => setForm(f => ({ ...f, novelty_date: e.target.value }))}
                   className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                 />
               </div>

               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Tipo de Novedad</Label>
                 <Select value={form.novelty_type} onValueChange={v => setForm(f => ({ ...f, novelty_type: v as NoveltyType }))}>
                   <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background">
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
               <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Motivo Específico</Label>
               <Select value={form.reason_id} onValueChange={v => setForm(f => ({ ...f, reason_id: v }))}>
                 <SelectTrigger className="h-12 rounded-2xl bg-background border-border focus:bg-background">
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

          <section className="space-y-6">
             <div className="flex items-center gap-2 border-b border-border pb-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Horario y Tiempos</h3>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hora de Inicio</Label>
                 <Input
                   type="time"
                   value={form.start_time}
                   onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                   className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cantidad Horas</Label>
                 <Input
                   type="number"
                   step="0.5"
                   min="0"
                   value={form.hours || ''}
                   onChange={e => setForm(f => ({ ...f, hours: Number(e.target.value) }))}
                   className="h-12 rounded-2xl bg-background border-border focus:bg-background"
                 />
               </div>
               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Hora Final</Label>
                 <Input
                   type="time"
                   value={form.end_time}
                   readOnly
                   className="h-12 rounded-2xl bg-background border-transparent text-muted-foreground pointer-events-none"
                 />
               </div>
             </div>
          </section>

          <section className="space-y-6">
             <div className="flex items-center gap-2 border-b border-border pb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Observaciones</h3>
             </div>
             <div className="space-y-2">
               <Textarea
                 value={form.notes}
                 onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                 rows={4}
                 placeholder="Detalles adicionales relevantes..."
                 className="rounded-2xl bg-background border-border focus:bg-background p-4 resize-none"
               />
             </div>
          </section>
        </div>

        <div className="p-6 border-t border-border/50 bg-background/10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border " onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={create.isPending || update.isPending}>
            {isEditing ? 'Actualizar Novedad' : 'Crear Novedad'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

