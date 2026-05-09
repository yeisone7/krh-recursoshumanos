/**
 * auditService.ts
 * ---------------------------------------------------------------
 * Servicio centralizado de logging de auditoría.
 * Diseñado como fire-and-forget para no bloquear la UI.
 * Captura automáticamente: user_agent, URL actual y sesión.
 * ---------------------------------------------------------------
 */
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────

export type AuditAction =
  // CRUD genérico
  | 'create' | 'update' | 'delete'
  // Auth
  | 'login' | 'logout' | 'failed_login' | 'password_reset'
  // Roles y permisos
  | 'assign_role' | 'remove_role' | 'change_permissions'
  // Accesos sensibles
  | 'access_payroll' | 'access_contracts' | 'access_disciplinary'
  // Exportaciones
  | 'export_pdf' | 'export_excel' | 'export_report'
  // IA
  | 'ai_chat' | 'ai_generate_content' | 'ai_action'
  // Sistema
  | 'invite_user' | 'terminate_contract' | 'extend_contract'
  | 'deliver_dotation' | 'assign_center' | 'remove_center'
  | 'system_event';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEventParams {
  company_id: string;
  action: AuditAction;
  entity_type: string;         // tabla afectada: 'employees_v2', 'contracts', etc.
  module?: string;             // módulo de la app: 'empleados', 'nomina', etc.
  entity_id?: string;
  entity_name?: string;
  description?: string;        // texto legible por humanos
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
  session_id?: string;
}

// ─── Función principal ────────────────────────────────────────

/**
 * Registra un evento de auditoría de forma asíncrona (fire & forget).
 * No arroja excepciones para no interrumpir el flujo de la UI.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // No logueamos eventos anónimos

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      company_id: params.company_id,
      action: params.action,
      entity_type: params.entity_type,
      module: params.module ?? params.entity_type,
      entity_id: params.entity_id ?? null,
      entity_name: params.entity_name ?? null,
      description: params.description ?? null,
      old_values: params.old_values ?? null,
      new_values: params.new_values ?? null,
      metadata: {
        url: window.location.pathname,
        ...params.metadata,
      },
      severity: params.severity ?? 'info',
      session_id: params.session_id ?? null,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Silencioso — los errores de auditoría nunca deben romper la UI
  }
}

/**
 * Registra un acceso a un módulo sensible (lectura).
 */
export function logModuleAccess(
  company_id: string,
  module: string,
  severity: AuditSeverity = 'info'
): void {
  logAuditEvent({
    company_id,
    action: 'access_payroll',
    entity_type: module,
    module,
    description: `Acceso al módulo ${module}`,
    severity,
  });
}

/**
 * Registra una exportación.
 */
export function logExport(
  company_id: string,
  module: string,
  format: 'pdf' | 'excel',
  description?: string
): void {
  logAuditEvent({
    company_id,
    action: format === 'pdf' ? 'export_pdf' : 'export_excel',
    entity_type: module,
    module,
    description: description ?? `Exportación ${format.toUpperCase()} desde ${module}`,
    severity: 'info',
  });
}

/**
 * Registra una acción de IA.
 */
export function logAiAction(
  company_id: string,
  action: 'ai_chat' | 'ai_generate_content' | 'ai_action',
  description: string,
  metadata?: Record<string, unknown>
): void {
  logAuditEvent({
    company_id,
    action,
    entity_type: 'ai',
    module: 'asistente_ia',
    description,
    metadata,
    severity: 'info',
  });
}
