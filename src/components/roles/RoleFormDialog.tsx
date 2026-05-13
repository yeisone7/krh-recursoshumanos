import { useEffect } from 'react';
import { Award, Building2, Info, Loader2, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateRole, useUpdateRole, CustomRole } from '@/hooks/useRolesPermissions';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

const roleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingRole: CustomRole | null;
}

export function RoleFormDialog({ open, onOpenChange, editingRole }: RoleFormDialogProps) {
  const { currentCompanyId, user } = useAuth();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const isSystem = editingRole?.is_system || false;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: editingRole?.name || '',
        description: editingRole?.description || '',
      });
    }
  }, [open, editingRole, form]);

  const onSubmit = async (values: RoleFormValues) => {
    if (editingRole) {
      const data: any = { id: editingRole.id };
      if (!isSystem) data.name = values.name.trim();
      data.description = values.description?.trim() || null;
      await updateRole.mutateAsync(data);
    } else {
      await createRole.mutateAsync({
        company_id: currentCompanyId!,
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        created_by: user?.id,
      });
    }
    onOpenChange(false);
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
                <ShieldCheck className="relative w-8 h-8 text-primary" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20 mb-1">
                  {editingRole ? 'Actualizando Privilegios' : 'Nueva Identidad de Acceso'}
                </div>
                <DialogTitle className="text-4xl font-black tracking-tight text-slate-900 leading-none">
                  {editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                </DialogTitle>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Award className="w-3.5 h-3.5" />
                    Protocolo de Seguridad
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Building2 className="w-3.5 h-3.5" />
                    Gestión de Empresa
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="relative flex-1 overflow-y-auto p-8 custom-scrollbar">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-8">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nombre del Rol *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Administrador, Auditor, Consulta..." 
                            {...field} 
                            disabled={isSystem}
                            className="h-14 rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-bold text-slate-700"
                          />
                        </FormControl>
                        {isSystem && (
                          <p className="text-[10px] font-bold text-destructive uppercase tracking-wider mt-1 ml-1">Este es un rol de sistema y no puede ser renombrado</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Descripción de Funciones</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe qué acciones podrá realizar este rol en el sistema..." 
                            {...field} 
                            value={field.value || ''}
                            className="min-h-[120px] rounded-2xl bg-white border border-slate-200 shadow-sm focus-visible:ring-4 ring-primary/5 transition-all font-medium text-slate-600 resize-none p-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm text-primary">
                      <Info className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-900 uppercase tracking-tight">Nota de Seguridad</p>
                      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                        Después de crear el rol, deberás dirigirte a la matriz de permisos para asignar los módulos específicos a los que este perfil tendrá acceso.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)}
                    className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-slate-600 transition-all"
                  >
                    CANCELAR
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createRole.isPending || updateRole.isPending} 
                    className="h-14 px-12 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {createRole.isPending || updateRole.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : editingRole ? (
                      'GUARDAR CAMBIOS'
                    ) : (
                      'REGISTRAR ROL'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
