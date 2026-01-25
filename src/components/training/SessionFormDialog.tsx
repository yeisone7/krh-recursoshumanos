import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Programar Nueva Sesión</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Programar Sesión'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
