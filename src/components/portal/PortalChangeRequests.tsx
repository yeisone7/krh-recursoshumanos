import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Plus, Clock, CheckCircle, XCircle, FileEdit } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EmployeeChangeRequest } from '@/types/portal';
import { requestTypeLabels, fieldLabels, statusLabels, statusColors } from '@/types/portal';

const changeRequestSchema = z.object({
  request_type: z.string().min(1, 'Seleccione una categoría'),
  field_name: z.string().min(1, 'Seleccione un campo'),
  current_value: z.string().optional(),
  requested_value: z.string().min(1, 'Ingrese el nuevo valor'),
});

type ChangeRequestFormData = z.infer<typeof changeRequestSchema>;

interface PortalChangeRequestsProps {
  changeRequests: EmployeeChangeRequest[];
  onSubmit: (data: Omit<ChangeRequestFormData, 'current_value'> & { current_value: string | null }) => void;
  isSubmitting: boolean;
}

const fieldOptions: Record<string, { value: string; label: string }[]> = {
  contact: [
    { value: 'residence_department', label: 'Departamento de Residencia' },
    { value: 'residence_city', label: 'Ciudad de Residencia' },
    { value: 'residence_address', label: 'Dirección' },
    { value: 'residence_neighborhood', label: 'Barrio' },
    { value: 'phone', label: 'Teléfono Fijo' },
    { value: 'mobile', label: 'Celular' },
    { value: 'personal_email', label: 'Correo Personal' },
  ],
  emergency_contact: [
    { value: 'emergency_contact_name', label: 'Nombre' },
    { value: 'emergency_contact_phone', label: 'Teléfono' },
    { value: 'emergency_contact_relationship', label: 'Parentesco' },
  ],
  family: [
    { value: 'spouse_name', label: 'Nombre del Cónyuge' },
    { value: 'children_count', label: 'Número de Hijos' },
  ],
  bank_info: [
    { value: 'bank_name', label: 'Banco' },
    { value: 'account_type', label: 'Tipo de Cuenta' },
    { value: 'account_number', label: 'Número de Cuenta' },
  ],
  social_security: [
    { value: 'eps', label: 'EPS' },
    { value: 'afp', label: 'Fondo de Pensiones' },
    { value: 'afc', label: 'Fondo de Cesantías' },
    { value: 'ccf', label: 'Caja de Compensación' },
  ],
};

export function PortalChangeRequests({ changeRequests, onSubmit, isSubmitting }: PortalChangeRequestsProps) {
  const [open, setOpen] = useState(false);
  
  const form = useForm<ChangeRequestFormData>({
    resolver: zodResolver(changeRequestSchema),
    defaultValues: {
      request_type: '',
      field_name: '',
      current_value: '',
      requested_value: '',
    },
  });

  const selectedType = form.watch('request_type');
  const availableFields = fieldOptions[selectedType] || [];

  const handleSubmit = (data: ChangeRequestFormData) => {
    onSubmit({
      ...data,
      current_value: data.current_value || null,
    });
    form.reset();
    setOpen(false);
  };

  const pendingRequests = changeRequests.filter(r => r.status === 'pendiente');
  const processedRequests = changeRequests.filter(r => r.status !== 'pendiente');

  return (
    <div className="space-y-6">
      {/* New Request Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Solicitar Cambio de Datos
              </CardTitle>
              <CardDescription>
                Envía una solicitud a RRHH para actualizar tu información personal
              </CardDescription>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Solicitud
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Solicitud de Cambio</DialogTitle>
                  <DialogDescription>
                    Ingresa los datos que deseas actualizar. Tu solicitud será revisada por RRHH.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="request_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(requestTypeLabels).map(([value, label]) => (
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
                      name="field_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Campo a Modificar</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                            disabled={!selectedType}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione campo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableFields.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
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
                      name="current_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Actual (opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Valor actual del campo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requested_value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nuevo Valor</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Ingrese el nuevo valor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Enviando...' : 'Enviar Solicitud'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Clock className="h-5 w-5" />
              Solicitudes Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Historial de Solicitudes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {processedRequests.length > 0 ? (
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay solicitudes procesadas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestCard({ request }: { request: EmployeeChangeRequest }) {
  const StatusIcon = request.status === 'aprobado' ? CheckCircle : 
                     request.status === 'rechazado' ? XCircle : Clock;

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">
              {requestTypeLabels[request.request_type] || request.request_type}
            </p>
            <Badge className={statusColors[request.status]}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusLabels[request.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {fieldLabels[request.field_name] || request.field_name}
          </p>
          <div className="text-sm">
            <span className="text-muted-foreground">Solicitado: </span>
            <span className="font-medium">{request.requested_value}</span>
          </div>
          {request.review_notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{request.review_notes}"
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {format(new Date(request.created_at), 'PPP', { locale: es })}
        </div>
      </div>
    </div>
  );
}
