import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction = 
  | 'create' | 'update' | 'delete' 
  | 'login' | 'logout' 
  | 'assign_role' | 'remove_role'
  | 'assign_center' | 'remove_center'
  | 'invite_user' | 'terminate_contract'
  | 'extend_contract' | 'deliver_dotation';

export type EntityType = 
  | 'employee' | 'contract' | 'dotation' 
  | 'medical_exam' | 'operation_center' 
  | 'user' | 'company' | 'role'
  | 'disciplinary_process';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string | null;
  company_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface LogActionParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export function useAuditLogs(filters?: {
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['audit_logs', currentCompanyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      query = query.limit(filters?.limit || 100);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useLogAction() {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogActionParams) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        company_id: currentCompanyId,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        old_values: params.oldValues,
        new_values: params.newValues,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
    },
  });
}

// Helper hook that provides a simpler API for logging
export function useAuditLogger() {
  const logAction = useLogAction();

  const log = (params: LogActionParams) => {
    // Fire and forget - don't block UI operations
    logAction.mutate(params);
  };

  return { log, isLogging: logAction.isPending };
}

// Action labels for UI display
export const actionLabels: Record<string, string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  assign_role: 'Asignación de rol',
  remove_role: 'Remoción de rol',
  assign_center: 'Asignación a centro',
  remove_center: 'Remoción de centro',
  invite_user: 'Invitación de usuario',
  terminate_contract: 'Terminación de contrato',
  extend_contract: 'Prórroga de contrato',
  deliver_dotation: 'Entrega de dotación',
};

// Entity type labels for UI display
export const entityTypeLabels: Record<string, string> = {
  employee: 'Empleado',
  contract: 'Contrato',
  dotation: 'Dotación',
  medical_exam: 'Examen Médico',
  operation_center: 'Centro de Operación',
  user: 'Usuario',
  company: 'Empresa',
  role: 'Rol',
  disciplinary_process: 'Proceso Disciplinario',
};
