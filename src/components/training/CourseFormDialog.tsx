import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BookOpenCheck, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCourse, useUpdateCourse } from '@/hooks/useTraining';
import { useToast } from '@/hooks/use-toast';
import type { TrainingCourse, TrainingModality } from '@/types/training';

const formSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  category: z.string().min(1, 'La categoría es requerida'),
  description: z.string().optional(),
  modality: z.enum(['presencial', 'virtual', 'mixto']),
  durationHours: z.coerce.number().min(1, 'Duración mínima 1 hora'),
  isMandatory: z.boolean(),
  requiresCertification: z.boolean(),
  validityMonths: z.coerce.number().optional(),
  provider: z.string().optional(),
  prerequisites: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: TrainingCourse | null;
}

const CATEGORIES = [
  'Seguridad y Salud',
  'Técnico Operativo',
  'Habilidades Blandas',
  'Normativo Legal',
  'Calidad',
  'Tecnología',
  'Liderazgo',
  'Inducción',
  'Otro',
];

const MODALITY_LABELS: Record<TrainingModality, string> = {
  presencial: 'Presencial',
  virtual: 'Virtual',
  mixto: 'Mixto',
};

export function CourseFormDialog({ open, onOpenChange, course }: CourseFormDialogProps) {
  const { toast } = useToast();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: course?.code || '',
      name: course?.name || '',
      category: course?.category || '',
      description: course?.description || '',
      modality: (course?.modality as TrainingModality) || 'presencial',
      durationHours: course?.duration_hours || 1,
      isMandatory: course?.is_mandatory || false,
      requiresCertification: course?.requires_certification || false,
      validityMonths: course?.validity_months || undefined,
      provider: course?.provider || '',
      prerequisites: course?.prerequisites || '',
    },
  });

  const watchRequiresCert = form.watch('requiresCertification');

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      if (course) {
        await updateCourse.mutateAsync({ id: course.id, ...data });
        toast({ title: 'Curso actualizado correctamente' });
      } else {
        await createCourse.mutateAsync({
          name: data.name,
          code: data.code,
          category: data.category,
          description: data.description,
          modality: data.modality,
          durationHours: data.durationHours,
          isMandatory: data.isMandatory,
          requiresCertification: data.requiresCertification,
          validityMonths: data.validityMonths,
          provider: data.provider,
          prerequisites: data.prerequisites,
        });
        toast({ title: 'Curso creado correctamente' });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el curso',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-background border-border/50 shadow-2xl rounded-[2rem]">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <BookOpenCheck className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  {course ? 'EDICIÓN' : 'NUEVO REGISTRO'}
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  {course ? 'Editar Curso' : 'Nuevo Curso de Capacitación'}
                </DialogTitle>
                <DialogDescription className="font-medium mt-1">
                  Configura los detalles, requisitos y modalidad de la capacitación
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="CAP-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Curso</FormLabel>
                  <FormControl>
                    <Input placeholder="Trabajo seguro en alturas" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Objetivos y contenido del curso..."
                      className="min-h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modalidad</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(MODALITY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (horas)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del proveedor o interno" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-8">
              <FormField
                control={form.control}
                name="isMandatory"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Curso Obligatorio</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresCertification"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Requiere Certificación</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {watchRequiresCert && (
              <FormField
                control={form.control}
                name="validityMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vigencia del Certificado (meses)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="12" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="prerequisites"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prerrequisitos</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Cursos o requisitos previos necesarios..."
                      className="min-h-16"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-6 border-t border-border/50 bg-muted/10 -mx-8 -mb-6 px-8 py-6">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 px-6 rounded-2xl w-full sm:w-auto font-bold tracking-widest text-xs uppercase">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : course ? 'Actualizar' : 'Crear Curso'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
