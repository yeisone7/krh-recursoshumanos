import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Award, Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCreateCertification } from '@/hooks/useEmployeeHealth';
import { certificationTypeLabels, type CertificationType } from '@/types/employee';

const formSchema = z.object({
  certificationType: z.enum([
    'licencia_conduccion',
    'manejo_defensivo',
    'manipulacion_alimentos',
    'psicosensometrico',
    'bpm',
    'trabajo_alturas',
    'primeros_auxilios',
    'otro',
  ] as const, { required_error: 'Seleccione el tipo de certificación' }),
  certificationName: z.string().max(100).optional(),
  licenseCategory: z.string().max(20).optional(),
  issueDate: z.date().optional(),
  expiryDate: z.date().optional(),
  appliesToPosition: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface CertificationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export function CertificationFormDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  onSuccess,
}: CertificationFormDialogProps) {
  const { toast } = useToast();
  const createCertification = useCreateCertification();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      certificationType: undefined,
      certificationName: '',
      licenseCategory: '',
      appliesToPosition: false,
    },
  });

  const watchType = form.watch('certificationType');

  const onSubmit = async (data: FormData) => {
    try {
      await createCertification.mutateAsync({
        employeeId,
        certificationType: data.certificationType,
        certificationName: data.certificationName,
        licenseCategory: data.licenseCategory,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        appliesToPosition: data.appliesToPosition,
      });

      toast({
        title: 'Certificación registrada',
        description: 'La certificación se ha guardado correctamente',
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo guardar la certificación',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Nueva Certificación
          </DialogTitle>
          <DialogDescription>
            Registrar certificación para {employeeName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Certification Type */}
            <FormField
              control={form.control}
              name="certificationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Certificación *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background">
                      {Object.entries(certificationTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* License Category (for driving license) */}
            {watchType === 'licencia_conduccion' && (
              <FormField
                control={form.control}
                name="licenseCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background">
                        <SelectItem value="A1">A1 - Motocicletas hasta 125cc</SelectItem>
                        <SelectItem value="A2">A2 - Motocicletas más de 125cc</SelectItem>
                        <SelectItem value="B1">B1 - Vehículos particulares</SelectItem>
                        <SelectItem value="B2">B2 - Vehículos de servicio público</SelectItem>
                        <SelectItem value="B3">B3 - Vehículos de servicio público (taxi)</SelectItem>
                        <SelectItem value="C1">C1 - Vehículos de carga</SelectItem>
                        <SelectItem value="C2">C2 - Vehículos de carga pesada</SelectItem>
                        <SelectItem value="C3">C3 - Vehículos articulados</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Certification Name (for "otro" type) */}
            {watchType === 'otro' && (
              <FormField
                control={form.control}
                name="certificationName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Certificación</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Certificación ISO 9001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Issue Date */}
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Emisión</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PP', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expiry Date */}
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha Vencimiento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PP', { locale: es })
                            ) : (
                              <span>Seleccionar</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-background" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Applies to Position */}
            <FormField
              control={form.control}
              name="appliesToPosition"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Aplica al cargo actual</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Esta certificación es requerida para el cargo del empleado
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCertification.isPending}>
                {createCertification.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
