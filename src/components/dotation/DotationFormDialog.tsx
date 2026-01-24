import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Package, User, FileText } from 'lucide-react';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

import { 
  dotationDeliverySchema, 
  DotationDeliveryFormData,
  dotationItemTypeLabels,
  DOTATION_PERIOD_MONTHS,
} from '@/types/dotation';

interface DotationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: DotationDeliveryFormData) => void;
}

// Mock employees for selection
const mockEmployees = [
  { id: 'emp-001', name: 'María García', document: '1234567890', center: 'Centro Norte' },
  { id: 'emp-002', name: 'Carlos Rodríguez', document: '0987654321', center: 'Centro Sur' },
  { id: 'emp-003', name: 'Ana Martínez', document: '1122334455', center: 'Centro Este' },
  { id: 'emp-004', name: 'Pedro López', document: '5566778899', center: 'Centro Oeste' },
];

// Size options
const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const shoeSizeOptions = Array.from({ length: 13 }, (_, i) => (35 + i).toString());

export function DotationFormDialog({ open, onOpenChange, onSubmit }: DotationFormDialogProps) {
  const form = useForm<DotationDeliveryFormData>({
    resolver: zodResolver(dotationDeliverySchema),
    defaultValues: {
      quantity: 1,
      deliveryDate: new Date(),
      expirationDate: addMonths(new Date(), DOTATION_PERIOD_MONTHS),
      deliveredBy: '',
      notes: '',
    },
  });

  const selectedEmployee = mockEmployees.find(e => e.id === form.watch('employeeId'));
  const selectedItemType = form.watch('itemType');
  const isFootwear = selectedItemType === 'shoes' || selectedItemType === 'boots';

  const handleSubmit = (data: DotationDeliveryFormData) => {
    console.log('Dotation delivery data:', data);
    onSubmit?.(data);
    
    toast({
      title: 'Entrega registrada',
      description: `Se ha registrado la entrega de ${data.itemName} para ${selectedEmployee?.name || 'el empleado'}.`,
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Nueva Entrega de Dotación
          </DialogTitle>
          <DialogDescription>
            Registra una nueva entrega de dotación a un empleado
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="employee" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="employee" className="gap-2">
                  <User className="w-4 h-4" />
                  Empleado
                </TabsTrigger>
                <TabsTrigger value="item" className="gap-2">
                  <Package className="w-4 h-4" />
                  Artículo
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Entrega
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto pr-2">
                {/* Employee Tab */}
                <TabsContent value="employee" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empleado *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar empleado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mockEmployees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name} - {emp.document}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedEmployee && (
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Documento:</span>
                        <span className="font-medium">{selectedEmployee.document}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Centro de Operación:</span>
                        <span className="font-medium">{selectedEmployee.center}</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Item Tab */}
                <TabsContent value="item" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="itemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Artículo *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(dotationItemTypeLabels).map(([value, label]) => (
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

                  <FormField
                    control={form.control}
                    name="itemName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre/Descripción del Artículo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Camisa polo azul corporativa" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Talla</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(isFootwear ? shoeSizeOptions : sizeOptions).map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                {/* Delivery Tab */}
                <TabsContent value="delivery" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Entrega *</FormLabel>
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
                                    <span>Seleccionar</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={(date) => {
                                  field.onChange(date);
                                  // Auto-set expiration to 4 months later
                                  if (date) {
                                    form.setValue('expirationDate', addMonths(date, DOTATION_PERIOD_MONTHS));
                                  }
                                }}
                                locale={es}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Fecha de Vencimiento *</FormLabel>
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
                                    <span>Seleccionar</span>
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
                                disabled={(date) => date <= form.getValues('deliveryDate')}
                                locale={es}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Por ley, la dotación vence cada {DOTATION_PERIOD_MONTHS} meses
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deliveredBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entregado por *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre de quien entrega" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Observaciones adicionales sobre la entrega..."
                            className="resize-none"
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2">
                <Package className="w-4 h-4" />
                Registrar Entrega
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
