import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, FileText, Building, DollarSign, Briefcase } from 'lucide-react';

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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

import {
  contractFormSchema,
  ContractFormData,
  contractTypeLabels,
} from '@/types/contract';

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: ContractFormData) => void;
}

// Mock employees for select
const mockEmployees = [
  { id: '1', name: 'María García López' },
  { id: '2', name: 'Carlos Rodríguez Mejía' },
  { id: '3', name: 'Ana Martínez Suárez' },
  { id: '4', name: 'Pedro López Hernández' },
  { id: '5', name: 'Laura Sánchez Torres' },
];

const operationCenters = [
  { value: 'bogota-centro', label: 'Bogotá Centro' },
  { value: 'bogota-norte', label: 'Bogotá Norte' },
  { value: 'medellin-norte', label: 'Medellín Norte' },
  { value: 'medellin-sur', label: 'Medellín Sur' },
  { value: 'cali-sur', label: 'Cali Sur' },
  { value: 'barranquilla', label: 'Barranquilla' },
];

export function ContractFormDialog({ open, onOpenChange, onSubmit }: ContractFormDialogProps) {
  const [activeTab, setActiveTab] = useState('general');

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      salaryType: 'monthly',
      transportAllowance: true,
      hasNonCompeteClause: false,
      hasConfidentialityClause: true,
      trialPeriodDays: 0,
    },
  });

  const contractType = form.watch('contractType');
  const needsEndDate = contractType && contractType !== 'indefinite';

  const handleSubmit = (data: ContractFormData) => {
    console.log('Contract data:', data);
    onSubmit?.(data);
    
    const employeeName = mockEmployees.find(e => e.id === data.employeeId)?.name || '';
    toast({
      title: 'Contrato creado',
      description: `El contrato de ${employeeName} ha sido registrado exitosamente.`,
    });
    onOpenChange(false);
    form.reset();
  };

  const tabItems = [
    { value: 'general', label: 'General', icon: FileText },
    { value: 'salary', label: 'Salario', icon: DollarSign },
    { value: 'workplace', label: 'Lugar de Trabajo', icon: Building },
    { value: 'clauses', label: 'Cláusulas', icon: Briefcase },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nuevo Contrato
          </DialogTitle>
          <DialogDescription>
            Complete la información del contrato laboral.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 pt-2">
                <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
                  {tabItems.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 min-w-[100px] gap-2 data-[state=active]:bg-background"
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <ScrollArea className="h-[calc(90vh-260px)] px-6 py-4">
                {/* General Tab */}
                <TabsContent value="general" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Empleado y Tipo de Contrato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employeeId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Empleado *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar empleado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {mockEmployees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contractType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Contrato *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {Object.entries(contractTypeLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Fechas del Contrato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha de Inicio *</FormLabel>
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
                                      <span>Seleccionar fecha</span>
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
                      {needsEndDate && (
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Fecha de Fin *</FormLabel>
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
                                        <span>Seleccionar fecha</span>
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
                              <FormDescription className="text-xs">
                                Esta fecha puede extenderse con prórrogas
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    {!needsEndDate && contractType === 'indefinite' && (
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        Los contratos indefinidos no tienen fecha de finalización.
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Período de Prueba</h3>
                    <FormField
                      control={form.control}
                      name="trialPeriodDays"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel>Días de Período de Prueba</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="60"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            Máximo 60 días según legislación colombiana
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Salary Tab */}
                <TabsContent value="salary" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Información Salarial</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="salary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salario Mensual *</FormLabel>
                            <FormControl>
                              <Input placeholder="$3.500.000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="salaryType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Salario *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                <SelectItem value="monthly">Salario Ordinario</SelectItem>
                                <SelectItem value="integral">Salario Integral</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="transportAllowance"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Auxilio de Transporte</FormLabel>
                            <FormDescription className="text-xs">
                              Aplica para salarios hasta 2 SMLV
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Workplace Tab */}
                <TabsContent value="workplace" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Lugar y Cargo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="operationCenter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Centro de Operación *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar centro" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-background">
                                {operationCenters.map((center) => (
                                  <SelectItem key={center.value} value={center.value}>
                                    {center.label}
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
                        name="area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Área *</FormLabel>
                            <FormControl>
                              <Input placeholder="Tecnología" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cargo *</FormLabel>
                            <FormControl>
                              <Input placeholder="Analista de Sistemas" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workSchedule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horario de Trabajo</FormLabel>
                            <FormControl>
                              <Input placeholder="Lunes a Viernes 8:00 - 17:00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Clauses Tab */}
                <TabsContent value="clauses" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Cláusulas Adicionales</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="hasConfidentialityClause"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cláusula de Confidencialidad</FormLabel>
                              <FormDescription className="text-xs">
                                El empleado se compromete a mantener la confidencialidad de la información de la empresa
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hasNonCompeteClause"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cláusula de No Competencia</FormLabel>
                              <FormDescription className="text-xs">
                                Restricción de trabajar con la competencia durante un período después de terminar el contrato
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground border-b pb-2">Notas</h3>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observaciones del Contrato</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notas adicionales sobre el contrato..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <div className="flex gap-2">
                {activeTab !== 'general' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const tabs = ['general', 'salary', 'workplace', 'clauses'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                    }}
                  >
                    Anterior
                  </Button>
                )}
                {activeTab !== 'clauses' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const tabs = ['general', 'salary', 'workplace', 'clauses'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                    }}
                    className="gradient-primary text-primary-foreground"
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button type="submit" className="gradient-primary text-primary-foreground">
                    Guardar Contrato
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
