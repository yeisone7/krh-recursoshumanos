import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationCenters } from '@/hooks/useCompanies';
import { usePositions, useAreas } from '@/hooks/useSystemConfig';
import { getEmployeeFullName } from '@/types/employee';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RotateCcw } from 'lucide-react';

interface RehireEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
}

export function RehireEmployeeDialog({ open, onOpenChange, employee }: RehireEmployeeDialogProps) {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const { data: operationCenters } = useOperationCenters();
  const { data: positions } = usePositions();
  const { data: areas } = useAreas();

  const [operationCenterId, setOperationCenterId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [positionName, setPositionName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [hireDate, setHireDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [linkType, setLinkType] = useState('indefinido');

  const rehireMutation = useMutation({
    mutationFn: async () => {
      if (!currentCompanyId || !user || !employee) throw new Error('Datos incompletos');

      const selectedPosition = positions?.find(p => p.id === positionId);
      const finalPositionName = positionName || selectedPosition?.name || 'Sin cargo';

      // 1. Reactivate employee
      const { error: empError } = await supabase
        .from('employees_v2')
        .update({ is_active: true, status: 'active' as any })
        .eq('id', employee.id);
      if (empError) throw empError;

      // 2. Create new work_info record
      const { error: workError } = await supabase
        .from('employee_work_info')
        .insert([{
          employee_id: employee.id,
          company_id: currentCompanyId,
          operation_center_id: operationCenterId || null,
          position_id: positionId || null,
          position_name: finalPositionName,
          area_id: areaId || null,
          hire_date: hireDate,
          link_type: linkType as any,
          is_current: true,
          created_by: user.id,
        }]);
      if (workError) throw workError;

      // 3. Recreate current contact record if none exists
      const { data: existingContact } = await supabase
        .from('employee_contact')
        .select('id')
        .eq('employee_id', employee.id)
        .eq('is_current', true)
        .maybeSingle();

      if (!existingContact) {
        // Get the last contact record to copy data
        const { data: lastContact } = await supabase
          .from('employee_contact')
          .select('*')
          .eq('employee_id', employee.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        await supabase.from('employee_contact').insert({
          employee_id: employee.id,
          company_id: currentCompanyId!,
          email: lastContact?.email || null,
          mobile: lastContact?.mobile || null,
          phone: lastContact?.phone || null,
          residence_city: lastContact?.residence_city || null,
          residence_department: lastContact?.residence_department || null,
          residence_address: lastContact?.residence_address || null,
          emergency_contact_name: lastContact?.emergency_contact_name || null,
          emergency_contact_phone: lastContact?.emergency_contact_phone || null,
          is_current: true,
        });
      }

      // 4. Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        company_id: currentCompanyId,
        action: 'rehire',
        entity_type: 'employee_v2',
        entity_id: employee.id,
        entity_name: getEmployeeFullName(employee),
        new_values: { position: finalPositionName, operation_center_id: operationCenterId, hire_date: hireDate },
        user_agent: navigator.userAgent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_v2'] });
      toast.success('Empleado recontratado', {
        description: `${getEmployeeFullName(employee)} ha sido reactivado exitosamente.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Error al recontratar', { description: error.message });
    },
  });

  const handlePositionChange = (value: string) => {
    setPositionId(value);
    const selected = positions?.find(p => p.id === value);
    if (selected) setPositionName(selected.name);
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-primary" />
            Recontratar Empleado
          </DialogTitle>
          <DialogDescription>
            Reactivar a <strong>{getEmployeeFullName(employee)}</strong> con nueva información laboral.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Centro de Operación *</Label>
            <Select value={operationCenterId} onValueChange={setOperationCenterId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar centro" />
              </SelectTrigger>
              <SelectContent>
                {operationCenters?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cargo *</Label>
            <Select value={positionId} onValueChange={handlePositionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cargo" />
              </SelectTrigger>
              <SelectContent>
                {positions?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Área</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar área" />
              </SelectTrigger>
              <SelectContent>
                {areas?.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Vinculación</Label>
            <Select value={linkType} onValueChange={setLinkType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="indefinido">Indefinido</SelectItem>
                <SelectItem value="fijo">Fijo</SelectItem>
                <SelectItem value="obra_labor">Obra o Labor</SelectItem>
                <SelectItem value="prestacion_servicios">Prestación de Servicios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Reingreso *</Label>
            <Input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => rehireMutation.mutate()}
            disabled={rehireMutation.isPending || !operationCenterId || !positionId}
            className="gradient-primary text-primary-foreground"
          >
            {rehireMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Recontratar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
