import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  FileText, 
  Settings2, 
  Info, 
  Hash, 
  Loader2,
  MessageSquare,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { useCreateNoveltyReason, useUpdateNoveltyReason, type NoveltyReason } from '@/hooks/useNoveltyReasons';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: NoveltyReason | null;
  nextItemNumber?: number;
}

export function NoveltyReasonFormDialog({ open, onOpenChange, reason, nextItemNumber = 1 }: Props) {
  const create = useCreateNoveltyReason();
  const update = useUpdateNoveltyReason();
  const isEditing = !!reason;

  const [form, setForm] = useState({
    item_number: reason?.item_number || nextItemNumber,
    name: reason?.name || '',
    description: reason?.description || '',
    is_active: reason?.is_active ?? true,
  });

  useEffect(() => {
    if (open) {
      setForm({
        item_number: reason?.item_number || nextItemNumber,
        name: reason?.name || '',
        description: reason?.description || '',
        is_active: reason?.is_active ?? true,
      });
    }
  }, [open, reason, nextItemNumber]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Complete los campos requeridos', variant: 'destructive' });
      return;
    }
    try {
      if (isEditing) {
        await update.mutateAsync({ id: reason.id, ...form });
        toast({ title: 'Motivo actualizado' });
      } else {
        await create.mutateAsync(form);
        toast({ title: 'Motivo creado' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
        <div className="relative flex-1 flex flex-col min-h-0">
          {/* Header Decorativo */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          
          <DialogHeader className="relative px-8 pt-10 pb-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute -inset-2 bg-primary/5 rounded-3xl blur-xl" />
                <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden group">
                  <div className="absolute inset-0 bg-slate-50 group-hover:bg-primary/5 transition-colors" />
                  <FileText className="relative w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/50 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isEditing ? 'Editando Motivo' : 'Nuevo Motivo'}
                </div>
                <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                  {isEditing ? 'Editar Motivo' : 'Nuevo Motivo'}
                </DialogTitle>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Catálogo de Nómina
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Building2 className="w-3.5 h-3.5" />
                    Configuración Global
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]">
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1 space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1"># Item</Label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                      <Input
                        disabled
                        value={form.item_number}
                        className="h-14 pl-12 rounded-2xl bg-slate-100/50 border border-slate-200 shadow-sm font-black text-slate-400"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre del Motivo *</Label>
                    <Input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Ej: Incapacidad Médica, Licencia..."
                      className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descripción Detallada</Label>
                  <div className="relative">
                    <MessageSquare className="absolute left-4 top-4 w-4 h-4 text-primary" />
                    <Textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Explica brevemente cuándo aplicar este motivo..."
                      className="min-h-[120px] pl-12 pt-4 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-medium text-slate-600 leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200 shadow-sm group hover:border-primary/30 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      <Label className="text-xs font-black text-slate-700 uppercase tracking-widest">Estado del Motivo</Label>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-tight">Habilitar o inhabilitar este motivo para su uso en reportes</p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 px-10 py-8 border-t border-slate-100 bg-[#f1f5f9] flex items-center justify-end gap-6 rounded-b-[2.5rem]">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)} 
                className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-600 hover:bg-slate-200 transition-all"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={create.isPending || update.isPending || !form.name.trim()} 
                className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-[#004a7c] hover:bg-[#003a61] text-white shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {create.isPending || update.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isEditing ? (
                  'GUARDAR CAMBIOS'
                ) : (
                  'CREAR MOTIVO'
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
