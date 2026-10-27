import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditEvent } from '@/lib/auditService';
import {
  capacityLossFollowUpSchema,
  rehabilitationConceptSchema,
  type CapacityLossFollowUpData,
  type RehabilitationConceptData,
} from '@/types/incapacity';

export function useUpdateIncapacityLegalFollowUp() {
  const queryClient = useQueryClient();
  const { currentCompanyId, canUpdate } = useAuth();

  return useMutation({
    mutationFn: async ({ id, values }: {
      id: string;
      values: RehabilitationConceptData | CapacityLossFollowUpData;
    }) => {
      if (!currentCompanyId || !canUpdate('incapacidades')) {
        throw new Error('No tienes permiso para actualizar el seguimiento.');
      }
      const parsed = 'pcl_percentage' in values
        ? capacityLossFollowUpSchema.parse(values)
        : rehabilitationConceptSchema.parse(values);
      const { data, error } = await supabase.from('employee_incapacities')
        .update(parsed)
        .eq('id', id)
        .eq('company_id', currentCompanyId)
        .eq('is_extension', false)
        .select('id')
        .single();
      if (error) throw error;
      void logAuditEvent({
        company_id: currentCompanyId,
        action: 'update',
        entity_type: 'incapacity',
        module: 'incapacidades',
        entity_id: data.id,
        description: 'Actualización del seguimiento legal de incapacidad',
        new_values: parsed,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incapacity'] });
      void queryClient.invalidateQueries({ queryKey: ['incapacities'] });
      void queryClient.invalidateQueries({ queryKey: ['employee_incapacities'] });
      void queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      void queryClient.invalidateQueries({ queryKey: ['audit_trail', 'incapacity'] });
    },
  });
}
