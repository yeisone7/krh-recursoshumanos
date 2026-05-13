import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Award, ShieldCheck, Building2, Info, GraduationCap } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useEducationLevels, EducationLevel } from '@/hooks/useEducationLevels';

const educationLevelSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  is_active: z.boolean().default(true),
});

type EducationLevelFormData = z.infer<typeof educationLevelSchema>;

interface EducationLevelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  educationLevel?: EducationLevel | null;
}

export function EducationLevelFormDialog({ open, onOpenChange, educationLevel }: EducationLevelFormDialogProps) {
  const isEditing = !!educationLevel;
  const { create, update, isCreating, isUpdating } = useEducationLevels();

  const form = useForm<EducationLevelFormData>({
    resolver: zodResolver(educationLevelSchema),
    defaultValues: {
      name: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (educationLevel) {
        form.reset({
          name: educationLevel.name,
          is_active: educationLevel.is_active,
        });
      } else {
        form.reset({
          name: '',
          is_active: true,
        });
      }
    }
  }, [open, educationLevel, form]);

  const onSubmit = async (data: EducationLevelFormData) => {
    try {
      if (isEditing && educationLevel) {
        await update({ 
          id: educationLevel.id, 
          name: data.name,
          is_active: data.is_active
        });
      } else {
        await create(data.name);
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] p-0 overflow-hidden bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] focus:outline-none flex flex-col">
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          
          <DialogHeader className="relative px-8 pt-10 pb-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-6">
              <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-white border border-slate-100 shadow-xl overflow-hidden group">
                <div className="absolute inset-0 bg-slate-50 group-hover:bg-primary/5 transition-colors" />
                <Award className="relative w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 mb-1">
                  {isEditing ? 'Actualizando Grado' : 'Nuevo Registro Académico'}
                </div>
                <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                  {isEditing ? 'Editar Nivel' : 'Nuevo Nivel'}
                </DialogTitle>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Formación Profesional
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Building2 className="w-3.5 h-3.5" />
                    Catálogo Maestro
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 custom-scrollbar bg-[#f8fafc]">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre del Nivel Educativo *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Profesional, Especialista, Técnico..." 
                            {...field} 
                            className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200 shadow-sm group hover:border-primary/30 transition-all">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" />
                            <FormLabel className="text-xs font-black text-slate-700 uppercase tracking-widest">Estado del Nivel</FormLabel>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium leading-tight">Activa este nivel para que sea seleccionable en la hoja de vida</p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="data-[state=checked]:bg-primary"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
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
                  type="submit" 
                  disabled={isCreating || isUpdating} 
                  className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isCreating || isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isEditing ? (
                    'GUARDAR CAMBIOS'
                  ) : (
                    'REGISTRAR NIVEL'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
