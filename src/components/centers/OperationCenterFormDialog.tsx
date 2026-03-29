import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, MapPin, Phone, User, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useEffect } from 'react';

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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {isEditing ? 'Editar Centro de Operación' : 'Nuevo Centro de Operación'}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Modifica los datos del centro de operación' : 'Crea un nuevo centro de operación para tu empresa'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nombre del Centro *</FormLabel>
                    <FormControl>
                      <Input placeholder="Centro Norte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="CN-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="6012345678" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Calle 100 # 15-20" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <CityDepartmentSelect
              cityValue={form.watch('city')}
              departmentValue={form.watch('department')}
              onCityChange={(city) => form.setValue('city', city)}
              onDepartmentChange={(dept) => form.setValue('department', dept)}
            />

            <FormField
              control={form.control}
              name="managerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsable del Centro</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Nombre del responsable" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractStartDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Inicio del Contrato</FormLabel>
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
                          {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractCommercialDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha Terminación Comercial del Contrato</FormLabel>
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
                          {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Seleccionar fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones o notas adicionales"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Guardando...' : isEditing ? 'Actualizar Centro' : 'Crear Centro'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
