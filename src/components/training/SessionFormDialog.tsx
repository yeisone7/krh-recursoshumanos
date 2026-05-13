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
import { CalendarClock, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTrainingCourses, useCreateSession } from '@/hooks/useTraining';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  courseId: z.string().min(1, 'Seleccione un curso'),
  instructorName: z.string().optional(),
  startDate: z.string().min(1, 'Fecha de inicio requerida'),
  startTime: z.string().optional(),
  endDate: z.string().min(1, 'Fecha de fin requerida'),
  endTime: z.string().optional(),
  location: z.string().optional(),
  maxParticipants: z.coerce.number().optional(),
  observations: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface SessionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCourseId?: string;
}

export function SessionFormDialog({ open, onOpenChange, preselectedCourseId }: SessionFormDialogProps) {
  const { toast } = useToast();
  const { data: courses } = useTrainingCourses();
  const createSession = useCreateSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      courseId: preselectedCourseId || '',
      instructorName: '',
      startDate: '',
      startTime: '08:00',
      endDate: '',
      endTime: '17:00',
      location: '',
      observations: '',
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime || '08:00'}`);
      const endDateTime = new Date(`${data.endDate}T${data.endTime || '17:00'}`);

      await createSession.mutateAsync({
        courseId: data.courseId,
        instructorName: data.instructorName,
        startDate: startDateTime,
        endDate: endDateTime,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        maxParticipants: data.maxParticipants,
        observations: data.observations,
      });

      toast({ title: 'Sesión programada correctamente' });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo programar la sesión',
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
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  NUEVO REGISTRO
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Programar Nueva Sesión
                </DialogTitle>
                <DialogDescription className="font-medium mt-1">
                  Planifica las fechas, horario y cupos de la capacitación
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-6">
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curso</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code ? `${course.code} - ` : ''}{course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructor</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del instructor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha Fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl>
                    <Input placeholder="Sala de capacitación o enlace virtual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Máx. Participantes</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} placeholder="Sin límite" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observaciones</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales..."
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
                  {isSubmitting ? 'Guardando...' : 'Programar Sesión'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
