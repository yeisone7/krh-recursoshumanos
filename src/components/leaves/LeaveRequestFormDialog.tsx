import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Upload, AlertCircle, FileText, X } from 'lucide-react';
import { useAbsenceConflicts } from '@/hooks/useAbsenceConflicts';
import { AbsenceConflictAlert } from '@/components/shared/AbsenceConflictAlert';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useLeaveTypeConfigs, useCreateLeaveRequest, calculateBusinessDays } from '@/hooks/useLeaves';
import { useHolidaysSet } from '@/hooks/useHolidays';
import { LeaveType, LeaveDurationType, LEAVE_DURATION_TYPE_LABELS } from '@/types/leave';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formSchema = z.object({
  employee_id: z.string().min(1, 'Seleccione un empleado'),
  leave_type: z.string().min(1, 'Seleccione el tipo de permiso'),
  duration_type: z.enum(['dias_completos', 'medio_dia', 'horas']),
  start_date: z.date({ required_error: 'Seleccione la fecha de inicio' }),
  end_date: z.date({ required_error: 'Seleccione la fecha de fin' }),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  reason: z.string().min(10, 'La razón debe tener al menos 10 caracteres'),
});

interface LeaveRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedEmployeeId?: string;
}

export function LeaveRequestFormDialog({
  open,
  onOpenChange,
  preselectedEmployeeId,
}: LeaveRequestFormDialogProps) {
  const { data: employees = [] } = useEmployees();
  const { data: leaveTypeConfigs = [] } = useLeaveTypeConfigs();
  const { data: holidaysSet } = useHolidaysSet();
  const createRequest = useCreateLeaveRequest();
  
  const [selectedTypeConfig, setSelectedTypeConfig] = useState<typeof leaveTypeConfigs[0] | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { currentCompanyId } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: preselectedEmployeeId || '',
      leave_type: '',
      duration_type: 'dias_completos',
      reason: '',
    },
  });

  const watchDurationType = form.watch('duration_type');
  const watchStartDate = form.watch('start_date');
  const watchEndDate = form.watch('end_date');
  const watchLeaveType = form.watch('leave_type');
  const watchEmployeeId = form.watch('employee_id');

  // Unified absence conflict detection
  const { data: leaveConflicts = [] } = useAbsenceConflicts(
    watchEmployeeId || undefined,
    watchStartDate,
    watchEndDate,
  );
  const hasLeaveConflicts = leaveConflicts.length > 0;

  // Update selected type config when leave type changes
  useEffect(() => {
    if (watchLeaveType) {
      const config = leaveTypeConfigs.find(c => c.leave_type === watchLeaveType);
      setSelectedTypeConfig(config || null);
    } else {
      setSelectedTypeConfig(null);
    }
  }, [watchLeaveType, leaveTypeConfigs]);

  // Calculate days when dates change
  useEffect(() => {
    if (watchStartDate && watchEndDate) {
      if (watchDurationType === 'dias_completos') {
        const days = calculateBusinessDays(watchStartDate, watchEndDate, holidaysSet);
        setCalculatedDays(days);
      } else if (watchDurationType === 'medio_dia') {
        setCalculatedDays(0.5);
      }
    }
  }, [watchStartDate, watchEndDate, watchDurationType, holidaysSet]);

  const activeLeaveTypes = leaveTypeConfigs.filter(c => c.is_active);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      let totalDays = calculatedDays;
      let totalHours: number | undefined;

      if (values.duration_type === 'horas' && values.start_time && values.end_time) {
        const [startH, startM] = values.start_time.split(':').map(Number);
        const [endH, endM] = values.end_time.split(':').map(Number);
        totalHours = (endH * 60 + endM - startH * 60 - startM) / 60;
        totalDays = totalHours / 8;
      }

      let documentUrl: string | undefined;
      let documentName: string | undefined;

      // Upload document if provided
      if (documentFile && currentCompanyId) {
        setIsUploading(true);
        const fileExt = documentFile.name.split('.').pop();
        const sanitized = documentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${currentCompanyId}/leaves/${values.employee_id}/${Date.now()}_${sanitized}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, documentFile, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;
        documentUrl = filePath;
        documentName = documentFile.name;
        setIsUploading(false);
      }

      await createRequest.mutateAsync({
        employee_id: values.employee_id,
        leave_type: values.leave_type as LeaveType,
        duration_type: values.duration_type as LeaveDurationType,
        start_date: format(values.start_date, 'yyyy-MM-dd'),
        end_date: format(values.end_date, 'yyyy-MM-dd'),
        start_time: values.start_time,
        end_time: values.end_time,
        total_days: totalDays,
        total_hours: totalHours,
        reason: values.reason,
        document_url: documentUrl,
        document_name: documentName,
      });

      toast.success('Solicitud de permiso creada exitosamente');
      form.reset();
      setDocumentFile(null);
      onOpenChange(false);
    } catch (error: any) {
      setIsUploading(false);
      toast.error(error.message || 'Error al crear la solicitud');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border/50 shadow-2xl rounded-[2rem]">
        
        {/* Premium Gradient Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 px-8 py-8 border-b border-border/50">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[9px] px-2 py-0.5 mb-1">
                  PERMISOS
                </Badge>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
                  Nueva Solicitud
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-8 py-6 max-h-[70vh] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-muted/30 rounded-2xl mb-6">
                  <TabsTrigger value="general" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="fechas" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                    Fechas
                  </TabsTrigger>
                  <TabsTrigger value="notas" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary font-bold text-xs uppercase tracking-widest transition-all">
                    Detalles
                  </TabsTrigger>
                </TabsList>

                {/* GENERAL TAB */}
                <TabsContent value="general" className="space-y-6 mt-0">
                  <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-6">
                    {/* Employee Selection */}
                    <FormField
                      control={form.control}
                      name="employee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Empleado</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-2xl bg-background border-border/50 font-medium">
                                <SelectValue placeholder="Seleccione un empleado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-primary/10">
                              {employees.filter(e => e.is_active).map((emp) => (
                                <SelectItem key={emp.id} value={emp.id} className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                                    <span className="text-[10px] text-muted-foreground opacity-70">CC: {emp.document_number}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Leave Type */}
                    <FormField
                      control={form.control}
                      name="leave_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Tipo de Permiso</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-2xl bg-background border-border/50 font-medium">
                                <SelectValue placeholder="Seleccione el tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-primary/10">
                              {activeLeaveTypes.map((type) => (
                                <SelectItem key={type.leave_type} value={type.leave_type} className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: type.color }}
                                    />
                                    {type.display_name}
                                    {!type.is_paid && (
                                      <span className="text-xs text-muted-foreground ml-2">(No remunerado)</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedTypeConfig?.description && (
                            <FormDescription>{selectedTypeConfig.description}</FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Info Alert for Selected Type */}
                  {selectedTypeConfig && (
                    <Alert className="rounded-2xl border-primary/20 bg-primary/5">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <AlertDescription className="space-y-1 ml-2 text-primary font-medium">
                        <div className="flex flex-wrap gap-4 text-sm">
                          {selectedTypeConfig.max_days_per_year && (
                            <span>Máximo: {selectedTypeConfig.max_days_per_year} días/año</span>
                          )}
                          {selectedTypeConfig.min_days_advance > 0 && (
                            <span>Anticipación mínima: {selectedTypeConfig.min_days_advance} días</span>
                          )}
                          <span>{selectedTypeConfig.is_paid ? 'Remunerado' : 'No remunerado'}</span>
                          {selectedTypeConfig.requires_document && (
                            <span className="text-destructive font-bold flex items-center gap-1">
                              Soporte obligatorio
                            </span>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="button" 
                      onClick={() => setActiveTab('fechas')}
                      className="rounded-xl bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors h-12 px-8"
                    >
                      Continuar a Fechas →
                    </Button>
                  </div>
                </TabsContent>

                {/* DATES TAB */}
                <TabsContent value="fechas" className="space-y-6 mt-0">
                  <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-6">
                    {/* Duration Type */}
                    <FormField
                      control={form.control}
                      name="duration_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Tipo de Duración</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-14 rounded-2xl bg-background border-border/50 font-medium">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl border-primary/10">
                              <SelectItem value="dias_completos" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">Días Completos</SelectItem>
                              {selectedTypeConfig?.allows_half_day && (
                                <SelectItem value="medio_dia" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">Medio Día</SelectItem>
                              )}
                              {selectedTypeConfig?.allows_hours && (
                                <SelectItem value="horas" className="rounded-xl focus:bg-primary/10 focus:text-primary cursor-pointer my-1">Horas</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dates */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Fecha de Inicio</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'h-14 rounded-2xl w-full justify-start whitespace-normal pl-3 text-left font-medium border-border/50 bg-background',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: es })
                                    ) : (
                                      <span>Seleccione fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl border-primary/10" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Fecha de Fin</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'h-14 rounded-2xl w-full justify-start whitespace-normal pl-3 text-left font-medium border-border/50 bg-background',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, 'PPP', { locale: es })
                                    ) : (
                                      <span>Seleccione fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-2xl border-primary/10" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => 
                                    date < new Date() || 
                                    (watchStartDate && date < watchStartDate)
                                  }
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

                    {/* Time fields for hours duration */}
                    {watchDurationType === 'horas' && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="start_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Hora de Inicio</FormLabel>
                              <FormControl>
                                <Input type="time" className="h-14 rounded-2xl bg-background border-border/50 font-medium" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="end_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Hora de Fin</FormLabel>
                              <FormControl>
                                <Input type="time" className="h-14 rounded-2xl bg-background border-border/50 font-medium" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Calculated Days Display */}
                    {calculatedDays > 0 && (
                      <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-black uppercase tracking-widest text-primary">Días Hábiles:</span>
                          <span className="text-xl font-black text-primary">{calculatedDays}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button 
                      type="button" 
                      variant="ghost"
                      onClick={() => setActiveTab('general')}
                      className="rounded-xl text-muted-foreground hover:bg-muted h-12 px-6"
                    >
                      ← Volver
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setActiveTab('notas')}
                      className="rounded-xl bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors h-12 px-8"
                    >
                      Continuar a Detalles →
                    </Button>
                  </div>
                </TabsContent>

                {/* OBSERVACIONES TAB */}
                <TabsContent value="notas" className="space-y-6 mt-0">
                  <div className="p-6 rounded-3xl bg-muted/20 border border-border/50 space-y-6">
                    {/* Reason */}
                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Motivo de la Solicitud</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describa de forma detallada el motivo del permiso..."
                              className="min-h-[120px] rounded-2xl bg-background border-border/50 resize-none font-medium p-4"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Document Upload */}
                    <div className="space-y-2">
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                        Documento de Soporte
                        {selectedTypeConfig?.requires_document && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </FormLabel>
                      {selectedTypeConfig?.requires_document && selectedTypeConfig.document_description && (
                        <p className="text-xs text-muted-foreground font-medium mb-2">{selectedTypeConfig.document_description}</p>
                      )}
                      
                      {documentFile ? (
                        <div className="flex items-center gap-3 p-4 border border-primary/20 bg-primary/5 rounded-2xl shadow-sm">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground">{documentFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(documentFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive rounded-full"
                            onClick={() => setDocumentFile(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-border hover:border-primary/50 rounded-2xl cursor-pointer hover:bg-muted/30 transition-all group">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                            <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="text-center">
                            <span className="block text-sm font-medium text-foreground mb-1">
                              Haga clic para seleccionar o arrastre un archivo
                            </span>
                            <span className="block text-xs text-muted-foreground">PDF, JPG, PNG (máx. 10 MB)</span>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 10 * 1024 * 1024) {
                                  toast.error('El archivo no puede superar 10 MB');
                                  return;
                                }
                                setDocumentFile(file);
                              }
                            }}
                          />
                        </label>
                      )}
                      
                      {selectedTypeConfig?.requires_document && !documentFile && (
                        <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Este tipo de permiso requiere un soporte para su aprobación.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Absence Conflict Alert */}
                  <div className="mt-4">
                    <AbsenceConflictAlert conflicts={leaveConflicts} />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse gap-3 pt-6 sm:flex-row sm:justify-between border-t border-border/50">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className="rounded-xl font-bold uppercase tracking-widest text-xs h-12 px-6" 
                      onClick={() => onOpenChange(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRequest.isPending || isUploading || hasLeaveConflicts}
                      className="rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all h-12 px-8"
                    >
                      {isUploading ? 'Subiendo documento...' : createRequest.isPending ? 'Procesando...' : 'Crear Solicitud'}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
