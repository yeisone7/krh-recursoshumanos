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
import { useCreatePayrollNovelty, useUpdatePayrollNovelty } from '@/hooks/usePayrollNovelties';
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

  const isEditing = !!novelty;
  const selectedEmployee = employees.find(e => e.id === form.employee_id);

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
    label: `${e.first_name} ${e.last_name} - ${e.document_number}`,
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="px-6 sm:px-8 pt-4 border-b border-border/50 bg-background">
            <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start overflow-x-auto no-scrollbar">
              <TabsTrigger value="detalles" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <FileText className={cn("w-4 h-4 transition-colors", activeTab === 'detalles' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'detalles' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Solicitud
                  </span>
                </div>
                {activeTab === 'detalles' && (
                  <motion.div layoutId="activeTabDotNovelty" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="horario" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <Clock className={cn("w-4 h-4 transition-colors", activeTab === 'horario' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'horario' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Condiciones
                  </span>
                </div>
                {activeTab === 'horario' && (
                  <motion.div layoutId="activeTabDotNovelty" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
              <TabsTrigger value="observaciones" className="relative h-12 px-0 bg-transparent border-none data-[state=active]:bg-transparent data-[state=active]:shadow-none group">
                <div className="flex items-center gap-2">
                  <MessageSquare className={cn("w-4 h-4 transition-colors", activeTab === 'observaciones' ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", activeTab === 'observaciones' ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    Observaciones
                  </span>
                </div>
                {activeTab === 'observaciones' && (
                  <motion.div layoutId="activeTabDotNovelty" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 sm:p-8 overflow-y-auto">
             <TabsContent value="detalles" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
             </TabsContent>

             <TabsContent value="horario" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="p-6 rounded-2xl border border-border mb-6">
                 <div className="flex items-center gap-3 mb-2">
                   <Clock className="w-5 h-5 text-primary" />
                   <h3 className="font-black tracking-tight text-primary">Configuración de Tiempos</h3>
                 </div>
                 <p className="text-xs font-medium text-primary/80">
                   Indique la hora de inicio y el número de horas para calcular automáticamente la hora final de la novedad reportada.
                 </p>
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
             </TabsContent>

             <TabsContent value="observaciones" className="m-0 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="space-y-2">
                 <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Comentarios y Observaciones</Label>
                 <Textarea
                   value={form.notes}
                   onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                   rows={6}
                   placeholder="Añada cualquier detalle adicional relevante para esta novedad..."
                   className="rounded-2xl bg-background border-border focus:bg-background p-4 resize-none"
                 />
               </div>
             </TabsContent>
          </div>
        </Tabs>

        <div className="p-6 border-t border-border/50 bg-background /10 flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[11px] border-border " onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 bg-primary text-primary-foreground" onClick={handleSave} disabled={create.isPending || update.isPending}>
            {isEditing ? 'Actualizar Novedad' : 'Crear Novedad'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

