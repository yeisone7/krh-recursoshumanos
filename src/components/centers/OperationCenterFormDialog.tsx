import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, MapPin, Phone, User } from 'lucide-react';

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
import { toast } from 'sonner';

import { useCreateOperationCenter } from '@/hooks/useCompanies';
import { useAuth } from '@/contexts/AuthContext';

const operationCenterSchema = z.object({
  name: z.string().min(2, 'El nombre es requerido'),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
});

type OperationCenterFormData = z.infer<typeof operationCenterSchema>;

interface OperationCenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Import city/department selector
import { CityDepartmentSelect } from '@/components/ui/city-department-select';

export function OperationCenterFormDialog({ open, onOpenChange, onSuccess }: OperationCenterFormDialogProps) {
  const { currentCompanyId } = useAuth();
  const createCenter = useCreateOperationCenter();

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
    },
  });

  const handleSubmit = async (data: OperationCenterFormData) => {
    if (!currentCompanyId) {
      toast.error('Error: No hay empresa seleccionada');
      return;
    }

    try {
      await createCenter.mutateAsync({
        company_id: currentCompanyId,
        name: data.name,
        code: data.code || null,
        address: data.address || null,
        city: data.city || null,
        department: data.department || null,
        phone: data.phone || null,
        manager_name: data.managerName || null,
      });

      toast.success('Centro creado', {
        description: `El centro "${data.name}" ha sido creado exitosamente.`,
      });

      onOpenChange(false);
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating operation center:', error);
      toast.error('Error al crear centro', {
        description: error.message || 'Por favor intenta de nuevo',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Nuevo Centro de Operación
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo centro de operación para tu empresa
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCenter.isPending}>
                {createCenter.isPending ? 'Creando...' : 'Crear Centro'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
