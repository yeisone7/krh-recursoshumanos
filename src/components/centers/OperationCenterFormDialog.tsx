import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, MapPin, Phone, User, CalendarIcon, FileText, Handshake, ClipboardList, Loader2, Globe, Target } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';

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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useCreateOperationCenter, useUpdateOperationCenter } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';
import { CityDepartmentSelect } from '@/components/ui/city-department-select';

const operationCenterSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
  contractStartDate: z.date().optional().nullable(),
  contractCommercialDate: z.date().optional().nullable(),
  mainClient: z.string().optional(),
  notes: z.string().optional(),
});

type OperationCenterFormData = z.infer<typeof operationCenterSchema>;

interface OperationCenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editCenter?: any | null;
}

export function OperationCenterFormDialog({ open, onOpenChange, onSuccess, editCenter }: OperationCenterFormDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const { currentCompanyId } = useAuth();
  const createCenter = useCreateOperationCenter();
  const updateCenter = useUpdateOperationCenter();
  const isEditing = !!editCenter;

  const form = useForm<OperationCenterFormData>({
    resolver: zodResolver(operationCenterSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      department: '',
      phone: '',
      managerName: '',
      contractStartDate: null,
      contractCommercialDate: null,
      mainClient: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (editCenter) {
      form.reset({
        name: editCenter.name || '',
        code: editCenter.code || '',
        address: editCenter.address || '',
        city: editCenter.city || '',
        department: editCenter.department || '',
        phone: editCenter.phone || '',
        managerName: editCenter.manager_name || '',
        contractStartDate: editCenter.contract_start_date
          ? new Date(editCenter.contract_start_date + 'T00:00:00')
          : null,
        contractCommercialDate: editCenter.contract_commercial_date
          ? new Date(editCenter.contract_commercial_date + 'T00:00:00')
          : null,
        mainClient: editCenter.main_client || '',
        notes: editCenter.notes || '',
      });
    } else {
      form.reset({
        name: '',
        code: '',
        address: '',
        city: '',
        department: '',
        phone: '',
        managerName: '',
        contractStartDate: null,
        contractCommercialDate: null,
        mainClient: '',
        notes: '',
      });
    }
  }, [editCenter, open]);

  const handleSubmit = async (data: OperationCenterFormData) => {
    if (!currentCompanyId) {
      toast.error('Error: No hay empresa seleccionada');
      return;
    }

    try {
      const payload: any = {
        name: data.name,
        code: data.code || null,
        address: data.address || null,
        city: data.city || null,
        department: data.department || null,
        phone: data.phone || null,
        manager_name: data.managerName || null,
        contract_start_date: data.contractStartDate ? format(data.contractStartDate, 'yyyy-MM-dd') : null,
        contract_commercial_date: data.contractCommercialDate ? format(data.contractCommercialDate, 'yyyy-MM-dd') : null,
        main_client: data.mainClient || null,
        notes: data.notes || null,
      };

      if (isEditing) {
        await updateCenter.mutateAsync({ id: editCenter.id, ...payload });
        toast.success('Centro actualizado', {
          description: `El centro "${data.name}" ha sido actualizado exitosamente.`,
        });
      } else {
        await createCenter.mutateAsync({
          company_id: currentCompanyId,
          ...payload,
        } as any);
        toast.success('Centro creado', {
          description: `El centro "${data.name}" ha sido creado exitosamente.`,
        });
      }

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving operation center:', error);
      toast.error(isEditing ? 'Error al actualizar centro' : 'Error al crear centro', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  const isPending = createCenter.isPending || updateCenter.isPending;

  const tabItems = [
    { value: 'general', label: 'General', icon: Building2 },
    { value: 'location', label: 'Ubicación', icon: MapPin },
    { value: 'contract', label: 'Contrato', icon: Handshake },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] max-w-2xl p-0 overflow-hidden sm:w-full border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">
          {isEditing ? 'Editar Centro de Operación' : 'Nuevo Centro de Operación'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para la gestión de centros de operación de la empresa.
        </DialogDescription>

        <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent/10 px-4 pt-10 pb-8 sm:px-10 sm:pt-12">
          {/* Enhanced decorative patterns */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-primary/10 blur-[100px] pointer-events-none animate-pulse" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 rounded-full bg-accent/10 blur-[80px] pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Branded Avatar */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-20 h-20 rounded-2xl bg-background flex items-center justify-center text-primary font-black text-3xl shadow-xl border border-primary/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                {form.watch('name') ? form.watch('name').substring(0, 2).toUpperCase() : 'CO'}
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0.5 px-3 rounded-full font-bold uppercase tracking-widest text-[9px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 animate-ping" />
                  {isEditing ? 'Gestión Activa' : 'Nuevo Registro'}
                </Badge>
                {form.watch('code') && (
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-bold py-0.5 px-3 rounded-full text-[10px]">
                    ID: {form.watch('code')}
                  </Badge>
                )}
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tighter leading-none">
                {form.watch('name') || (isEditing ? 'Editar Centro' : 'Nuevo Centro')}
              </h2>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2 text-xs font-bold text-muted-foreground/80 uppercase tracking-tight">
                <div className="flex items-center gap-2 group cursor-default">
                  <div className="p-1 rounded-md bg-primary/10 group-hover:bg-primary transition-colors">
                    <MapPin className="w-3.5 h-3.5 group-hover:text-primary-foreground" />
                  </div>
                  {form.watch('city') || 'Ubicación pendiente'}
                </div>
                <div className="flex items-center gap-2 group cursor-default">
                  <div className="p-1 rounded-md bg-primary/10 group-hover:bg-primary transition-colors">
                    <Building2 className="w-3.5 h-3.5 group-hover:text-primary-foreground" />
                  </div>
                  Empresa Vinculada
                </div>
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-4 sm:px-10">
                <TabsList className="w-full h-12 bg-muted/30 p-1.5 rounded-2xl border border-primary/5">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 gap-2 rounded-xl font-bold text-[11px] uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all"
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(95dvh-400px)] px-6 py-6 sm:px-10 sm:py-8">
                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <Building2 className="w-3.5 h-3.5" />
                            Nombre Identificativo <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="group relative">
                              <Input placeholder="Ej: SEDE NORTE - LOGÍSTICA" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background focus:ring-4 focus:ring-primary/5 transition-all text-sm font-bold placeholder:font-normal" {...field} />
                              <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary scale-x-0 group-focus-within:scale-x-100 transition-transform origin-left rounded-full" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold uppercase ml-1" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <ClipboardList className="w-3.5 h-3.5" />
                            Código de Centro
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="CO-001" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-mono font-bold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mainClient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <User className="w-3.5 h-3.5" />
                            Cliente Principal
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre de la entidad" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                          <FileText className="w-3.5 h-3.5" />
                          Observaciones Estratégicas
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detalle aquí particularidades de operación, accesos o requerimientos especiales..."
                            className="min-h-[140px] resize-none rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-medium leading-relaxed"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* Location Tab */}
                <TabsContent value="location" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 gap-8">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Dirección de Referencia
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Av. Principal con Calle 10" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-primary/[0.02] p-8 rounded-[2rem] border border-primary/5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <Globe className="w-24 h-24" />
                      </div>
                      <CityDepartmentSelect
                        cityValue={form.watch('city')}
                        departmentValue={form.watch('department')}
                        onCityChange={(city) => form.setValue('city', city)}
                        onDepartmentChange={(dept) => form.setValue('department', dept)}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                              <Phone className="w-3.5 h-3.5" />
                              Línea de Contacto
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Fijo o Celular" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="managerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] font-black uppercase tracking-widest text-primary flex items-center gap-2 ml-1">
                              <User className="w-3.5 h-3.5" />
                              Líder / Responsable
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre Completo" className="h-12 rounded-2xl bg-muted/30 border-primary/5 focus:bg-background transition-all font-bold" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Contract Tab */}
                <TabsContent value="contract" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="relative overflow-hidden bg-gradient-to-br from-primary/[0.08] to-accent/[0.04] p-8 rounded-[2rem] border border-primary/10 shadow-inner">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                    
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 rounded-2xl bg-primary shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground transform -rotate-3">
                        <Handshake className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-foreground tracking-tight">Periodo de Vigencia</h4>
                        <p className="text-xs font-bold text-primary/70 uppercase tracking-widest">Cronograma Contractual Comercial</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 relative z-10">
                      <FormField
                        control={form.control}
                        name="contractStartDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-black uppercase tracking-wider text-primary/80 mb-2 ml-1">Apertura de Operación</FormLabel>
                            <FormControl>
                               <DatePickerWithDropdowns
                                 selected={field.value ?? undefined}
                                 onSelect={field.onChange}
                                 fromYear={2000}
                                 toYear={new Date().getFullYear() + 5}
                                 className="h-12 rounded-2xl bg-background border-primary/10 font-bold"
                               />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contractCommercialDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-[10px] font-black uppercase tracking-wider text-primary/80 mb-2 ml-1">Clausura Estimada</FormLabel>
                            <FormControl>
                               <DatePickerWithDropdowns
                                 selected={field.value ?? undefined}
                                 onSelect={field.onChange}
                                 fromYear={2000}
                                 toYear={new Date().getFullYear() + 10}
                                 className="h-12 rounded-2xl bg-background border-primary/10 font-bold"
                               />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-10 p-4 rounded-xl bg-background/50 border border-primary/5 flex items-start gap-3">
                       <Target className="w-5 h-5 text-primary shrink-0" />
                       <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                          Asegúrese de que las fechas comerciales coincidan con los anexos legales firmados con el cliente principal para evitar discrepancias en la facturación.
                       </p>
                    </div>
                  </div>
                </TabsContent>
              </ScrollArea>

              <div className="flex flex-col sm:flex-row justify-end gap-3 px-6 py-6 sm:px-10 sm:py-8 bg-muted/5 border-t border-border/50">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-12 px-8 rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-all font-bold uppercase tracking-widest text-[11px] order-2 sm:order-1"
                >
                  Descartar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending}
                  className="h-12 px-10 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20 active:scale-95 transition-all font-black uppercase tracking-widest text-[11px] order-1 sm:order-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    isEditing ? 'Guardar Cambios' : 'Confirmar Registro'
                  )}
                </Button>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
