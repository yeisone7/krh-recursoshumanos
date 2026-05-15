import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Stethoscope, FileText, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  medicalExamFormSchema,
  MedicalExamFormData,
  examTypeLabels,
  examResultLabels,
  PERIODIC_EXAM_VALIDITY_MONTHS,
} from '@/types/medicalExam';
import { useEmployees } from '@/hooks/useEmployees';
import { getEmployeeFullName } from '@/types/employee';
import { useCreateMedicalExam } from '@/hooks/useMedicalExams';

interface ExamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: MedicalExamFormData) => void;
}

export function ExamFormDialog({ open, onOpenChange, onSubmit }: ExamFormDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const { data: employees = [] } = useEmployees();
  const createExam = useCreateMedicalExam();

  const form = useForm<MedicalExamFormData>({
    resolver: zodResolver(medicalExamFormSchema),
    defaultValues: {
      employeeId: '',
      examType: undefined,
      examDate: undefined,
      result: 'pendiente',
      concept: '',
      restrictions: '',
      provider: '',
      doctorName: '',
      observations: '',
    },
  });

  const watchExamType = form.watch('examType');
  const watchExamDate = form.watch('examDate');

  const calculatedExpiration = watchExamDate && watchExamType !== 'egreso'
    ? addMonths(watchExamDate, PERIODIC_EXAM_VALIDITY_MONTHS)
    : null;

  const handleSubmit = async (data: MedicalExamFormData) => {
    try {
      await createExam.mutateAsync({
        employee_id: data.employeeId,
        exam_type: data.examType,
        exam_date: format(data.examDate, 'yyyy-MM-dd'),
        expiration_date: calculatedExpiration 
          ? format(calculatedExpiration, 'yyyy-MM-dd') 
          : null,
        result: data.result,
        concept: data.concept,
        restrictions: data.restrictions || null,
        provider: data.provider,
        doctor_name: data.doctorName,
        observations: data.observations || null,
      });
      
      toast.success('Examen registrado exitosamente');
      onSubmit?.(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Error al registrar el examen');
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  // Filter only active employees
  const activeEmployees = employees.filter(emp => emp.is_active);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto p-4 sm:w-full sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Stethoscope className="w-5 h-5 text-primary" />
            Registrar Examen Médico
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto overscroll-x-contain p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-3">
                <TabsTrigger value="general" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs sm:text-sm">
                  <FileText className="w-4 h-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="resultado" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs sm:text-sm">
                  <Stethoscope className="w-4 h-4" />
                  Resultado
                </TabsTrigger>
                <TabsTrigger value="proveedor" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs sm:text-sm">
                  <Building2 className="w-4 h-4" />
                  Proveedor
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empleado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un empleado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {getEmployeeFullName(emp)} - {emp.document_number}
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
                  name="examType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Examen</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(examTypeLabels) as Array<keyof typeof examTypeLabels>).map((type) => (
                            <SelectItem key={type} value={type}>
                              {examTypeLabels[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {watchExamType === 'ingreso' && 'Examen previo al inicio del contrato laboral'}
                        {watchExamType === 'periodico' && 'Examen de seguimiento durante la vigencia del contrato'}
                        {watchExamType === 'egreso' && 'Examen al finalizar el contrato laboral'}
                        {watchExamType === 'reintegro' && 'Examen posterior a una incapacidad prolongada'}
                        {watchExamType === 'post_incapacidad' && 'Examen posterior a una incapacidad'}
                        {watchExamType === 'cambio_cargo' && 'Examen por cambio de cargo o funciones'}
                        {watchExamType === 'seguimiento' && 'Examen de seguimiento a condiciones de salud'}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="examDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha del Examen</FormLabel>
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
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Seleccione una fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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

                {calculatedExpiration && (
                  <div className="p-4 bg-info-light rounded-lg border border-info/20">
                    <p className="text-sm font-medium text-info">
                      Fecha de Vencimiento Calculada
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {format(calculatedExpiration, 'PPP', { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vigencia de {PERIODIC_EXAM_VALIDITY_MONTHS} meses según normativa colombiana
                    </p>
                  </div>
                )}

                {watchExamType === 'egreso' && (
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground">
                      Los exámenes de egreso no tienen fecha de vencimiento
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="resultado" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="result"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resultado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el resultado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(examResultLabels) as Array<keyof typeof examResultLabels>).map((result) => (
                            <SelectItem key={result} value={result}>
                              {examResultLabels[result]}
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
                  name="concept"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Concepto Médico</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describa el concepto médico emitido..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="restrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restricciones (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Indique restricciones laborales si aplica..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Solo aplica si el resultado es "Apto con Restricciones"
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observaciones (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observaciones adicionales..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="proveedor" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proveedor / IPS</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la IPS o proveedor" {...field} />
                      </FormControl>
                      <FormDescription>
                        Institución Prestadora de Servicios de Salud
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Médico Evaluador</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del médico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-4 bg-background rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Documento de Soporte
                  </p>
                  <p className="text-xs text-muted-foreground">
                    La carga de documentos estará disponible próximamente.
                    Los documentos serán versionados y nunca eliminados según la política de auditoría.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-1 gap-2 border-t pt-4 sm:flex sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="bg-primary hover:bg-primary-hover"
                disabled={createExam.isPending}
              >
                {createExam.isPending ? 'Registrando...' : 'Registrar Examen'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
