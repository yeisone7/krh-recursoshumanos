/**
 * useAuditLog.ts
 * ---------------------------------------------------------------
 * Hooks de auditoría empresarial completos:
 *   - useAuditLogs      → listado paginado con filtros avanzados
 *   - useEntityAuditTrail → historial de una entidad específica
 *   - useAuditStats     → métricas de actividad
 *   - useLogAction      → mutación para registrar eventos
 *   - useAuditLogger    → API simplificada fire-and-forget
 * ---------------------------------------------------------------
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AuditAction, AuditSeverity } from '@/lib/auditService';

// ─── Tipos Exportados ─────────────────────────────────────────

export type { AuditAction, AuditSeverity };

export interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string | null;
  actor_name?: string | null;
  company_id: string | null;
  action: string;
  entity_type: string;
  module: string | null;
  entity_id: string | null;
  entity_name: string | null;
  description: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  severity: AuditSeverity | null;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditFilters {
  userId?: string;
  userEmail?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

export interface LogActionParams {
  action: AuditAction;
  entityType: string;
  module?: string;
  entityId?: string;
  entityName?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  severity?: AuditSeverity;
}

// ─── Labels para UI ───────────────────────────────────────────

export const actionLabels: Record<string, string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Eliminación',
  login: 'Inicio de sesión',
  logout: 'Cierre de sesión',
  failed_login: 'Intento fallido',
  password_reset: 'Cambio de contraseña',
  assign_role: 'Asignación de rol',
  remove_role: 'Remoción de rol',
  change_permissions: 'Cambio de permisos',
  access_payroll: 'Acceso a nómina',
  access_contracts: 'Acceso a contratos',
  access_disciplinary: 'Acceso a disciplinarios',
  export_pdf: 'Exportación PDF',
  export_excel: 'Exportación Excel',
  export_report: 'Exportación de reporte',
  ai_chat: 'Chat con IA',
  ai_generate_content: 'Generación IA',
  ai_action: 'Acción de IA',
  invite_user: 'Invitación de usuario',
  terminate_contract: 'Terminación de contrato',
  extend_contract: 'Prórroga de contrato',
  deliver_dotation: 'Entrega de dotación',
  assign_center: 'Asignación a centro',
  remove_center: 'Remoción de centro',
  system_event: 'Evento de sistema',
};

export const entityTypeLabels: Record<string, string> = {
  // Empleados
  employee: 'Empleado', employee_v2: 'Empleado', employees_v2: 'Empleado', employees: 'Empleado',
  employee_work_info: 'Info Laboral', employee_contact: 'Contacto Empleado',
  employee_family: 'Familia Empleado', employee_bank_info: 'Info Bancaria',
  employee_document: 'Documento Empleado', employee_documents: 'Documento Empleado',
  employee_certification: 'Certificación', employee_certifications: 'Certificación',
  employee_vaccination: 'Vacunación', employee_vaccinations: 'Vacunación',
  employee_incapacity: 'Incapacidad', employee_incapacities: 'Incapacidad',
  employee_termination: 'Desvinculación', employee_terminations: 'Desvinculación',
  employee_loan: 'Préstamo', employee_loans: 'Préstamo',
  employee_deduction: 'Descuento', employee_deductions: 'Descuento',
  employee_transfer: 'Traslado', employee_transfers: 'Traslado',
  employee_shift_assignment: 'Turno', employee_shift_assignments: 'Turno',
  // Contratos
  contract: 'Contrato', contracts: 'Contrato',
  contract_extension: 'Prórroga', contract_extensions: 'Prórroga',
  // Selección y Requisiciones
  requisition: 'Requisición', personnel_requisitions: 'Requisición',
  candidate: 'Candidato', candidates: 'Candidato',
  vacancy: 'Vacante', vacancies: 'Vacante',
  selection_step: 'Paso de Selección', selection_steps: 'Paso de Selección',
  // Capacitaciones
  training_course: 'Capacitación', training_courses: 'Capacitación',
  training_session: 'Sesión de Capacitación', training_sessions: 'Sesión de Capacitación',
  training_plan: 'Plan de Capacitación', training_plans: 'Plan de Capacitación',
  training_plan_item: 'Ítem Plan Capacitación', training_plan_items: 'Ítem Plan Capacitación',
  training_attendance: 'Asistencia Capacitación',
  training_completion: 'Finalización Capacitación', training_completions: 'Finalización Capacitación',
  training_access_token: 'Enlace Capacitación', training_access_tokens: 'Enlace Capacitación',
  // Evaluaciones
  evaluation: 'Evaluación', evaluations: 'Evaluación',
  performance_evaluation: 'Evaluación Desempeño', performance_evaluations: 'Evaluación Desempeño',
  evaluation_template: 'Plantilla Evaluación', evaluation_templates: 'Plantilla Evaluación',
  evaluation_cycle: 'Ciclo Evaluación', evaluation_cycles: 'Ciclo Evaluación',
  performance_goal: 'Meta Desempeño', performance_goals: 'Meta Desempeño',
  // Nómina y financiero
  payroll_novelty: 'Novedad Nómina', payroll_novelties: 'Novedad Nómina',
  overtime: 'Hora Extra', overtime_records: 'Hora Extra',
  cesantias_deposit: 'Cesantías', cesantias_deposits: 'Cesantías',
  cesantias_interest: 'Interés Cesantías', cesantias_interest_payments: 'Interés Cesantías',
  cesantias_withdrawal: 'Retiro Cesantías', cesantias_withdrawals: 'Retiro Cesantías',
  payroll_receipt: 'Comprobante Nómina', payroll_receipts: 'Comprobante Nómina',
  // Vacaciones y permisos
  vacation: 'Vacación', vacation_requests: 'Vacación', vacation_balance: 'Saldo Vacaciones',
  leave_request: 'Permiso', leave_requests: 'Permiso', leave_balance: 'Saldo Permisos',
  // Disciplinario
  disciplinary_process: 'Proceso Disciplinario', disciplinary_processes: 'Proceso Disciplinario',
  // Dotación y Exámenes
  dotation: 'Dotación', dotation_delivery: 'Entrega Dotación',
  dotation_delivery_transaction: 'Transacción Dotación', dotation_transaction: 'Transacción Dotación',
  dotation_inventory: 'Inventario Dotación',
  medical_exam: 'Examen Médico', medical_exams: 'Examen Médico',
  exam_transaction: 'Transacción Examen', exam_delivery_transaction: 'Entrega Examen',
  // Estructura organizacional
  operation_center: 'Centro de Operación', operation_centers: 'Centro de Operación',
  area: 'Área', areas: 'Área',
  position: 'Cargo', positions: 'Cargo',
  position_profile: 'Perfil de Cargo', position_profiles: 'Perfil de Cargo',
  shift: 'Turno', shifts: 'Turno',
  shift_cycle: 'Ciclo de Turnos', shift_cycles: 'Ciclo de Turnos',
  // Usuarios y seguridad
  user: 'Usuario', user_roles: 'Rol de Usuario', user_profile: 'Perfil de Usuario',
  company: 'Empresa', companies: 'Empresa',
  role: 'Rol', custom_roles: 'Rol', custom_role: 'Rol Personalizado',
  // IA
  ai: 'Asistente IA', ai_chat: 'Chat IA', ai_chat_conversation: 'Conversación IA',
};

export const moduleLabels: Record<string, string> = {
  // Claves en español (usadas cuando se logea explícitamente con el módulo)
  empleados: 'Empleados', nomina: 'Nómina', seleccion: 'Selección',
  contratos: 'Contratos', vacaciones: 'Vacaciones', permisos: 'Permisos',
  incapacidades: 'Incapacidades', disciplinarios: 'Disciplinarios',
  capacitaciones: 'Capacitaciones', evaluaciones: 'Evaluaciones',
  dotacion: 'Dotación', examenes: 'Exámenes', centros: 'Centros',
  jornadas: 'Jornadas', novedades: 'Novedades', prestamos: 'Préstamos',
  descuentos: 'Descuentos', cesantias: 'Cesantías', reportes: 'Reportes',
  configuracion: 'Configuración', seguridad: 'Seguridad',
  asistente_ia: 'Asistente IA', sistema: 'Sistema',
  // Claves en inglés/snake_case (backfill desde entity_type en registros históricos)
  employee_v2: 'Empleados', employees_v2: 'Empleados', employees: 'Empleados', employee: 'Empleados',
  employee_work_info: 'Empleados', employee_contact: 'Empleados',
  employee_family: 'Empleados', employee_bank_info: 'Empleados',
  employee_documents: 'Empleados', employee_certifications: 'Empleados',
  employee_vaccinations: 'Empleados', employee_incapacities: 'Incapacidades',
  employee_terminations: 'Empleados', employee_loans: 'Préstamos',
  employee_deductions: 'Descuentos', employee_transfers: 'Empleados',
  employee_shift_assignments: 'Jornadas', employee_shift_assignment: 'Jornadas',
  contracts: 'Contratos', contract: 'Contratos',
  contract_extensions: 'Contratos', contract_extension: 'Contratos',
  personnel_requisitions: 'Selección', requisition: 'Selección',
  candidates: 'Selección', candidate: 'Selección',
  vacancies: 'Selección', vacancy: 'Selección',
  selection_steps: 'Selección', selection_step: 'Selección',
  training_courses: 'Capacitaciones', training_course: 'Capacitaciones',
  training_sessions: 'Capacitaciones', training_session: 'Capacitaciones',
  training_plans: 'Capacitaciones', training_plan: 'Capacitaciones',
  training_plan_items: 'Capacitaciones', training_plan_item: 'Capacitaciones',
  training_attendance: 'Capacitaciones',
  training_completions: 'Capacitaciones', training_completion: 'Capacitaciones',
  training_access_tokens: 'Capacitaciones', training_access_token: 'Capacitaciones',
  performance_evaluations: 'Evaluaciones', performance_evaluation: 'Evaluaciones',
  evaluation_templates: 'Evaluaciones', evaluation_template: 'Evaluaciones',
  evaluation_cycles: 'Evaluaciones', evaluation_cycle: 'Evaluaciones',
  performance_goals: 'Evaluaciones', performance_goal: 'Evaluaciones',
  payroll_novelties: 'Nómina', payroll_novelty: 'Nómina',
  overtime_records: 'Nómina', overtime: 'Nómina',
  cesantias_deposits: 'Cesantías', cesantias_deposit: 'Cesantías',
  cesantias_interest_payments: 'Cesantías', cesantias_withdrawals: 'Cesantías',
  payroll_receipts: 'Nómina',
  vacation_requests: 'Vacaciones', vacation: 'Vacaciones', vacation_balance: 'Vacaciones',
  vacation_balances: 'Vacaciones',
  leave_requests: 'Permisos', leave_request: 'Permisos', leave_balances: 'Permisos',
  disciplinary_processes: 'Disciplinarios', disciplinary_process: 'Disciplinarios',
  medical_exams: 'Exámenes', medical_exam: 'Exámenes',
  exam_delivery_transactions: 'Exámenes', exam_transaction: 'Exámenes',
  dotation_deliveries: 'Dotación', dotation_delivery: 'Dotación',
  dotation_delivery_transactions: 'Dotación', dotation_inventory: 'Dotación',
  operation_centers: 'Centros', operation_center: 'Centros',
  areas: 'Configuración', area: 'Configuración',
  positions: 'Configuración', position: 'Configuración',
  position_profiles: 'Configuración', position_profile: 'Configuración',
  shifts: 'Jornadas', shift: 'Jornadas',
  shift_cycles: 'Jornadas', shift_cycle: 'Jornadas',
  custom_roles: 'Seguridad', custom_role: 'Seguridad',
  user_custom_roles: 'Seguridad', user_roles: 'Seguridad',
  companies: 'Configuración', company: 'Configuración',
  ai_chat_conversations: 'Asistente IA', ai_chat_messages: 'Asistente IA',
  notifications: 'Sistema',
};

/**
 * Resuelve el label legible de un módulo usando ambos diccionarios como fallback.
 * Orden: moduleLabels → entityTypeLabels → valor original con formato mejorado.
 */
export function resolveModuleLabel(module: string | null | undefined): string {
  if (!module) return '—';
  return (
    moduleLabels[module] ??
    entityTypeLabels[module] ??
    // Fallback: convierte snake_case a palabras capitalizadas
    module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  );
}

const approvalStepLabels: Record<string, string> = {
  coordinadores: 'Coordinadores',
  rrhh: 'Recursos Humanos',
  juridico: 'Jurídico',
  operaciones: 'Operaciones',
  gerencia: 'Gerencia',
  seleccion: 'Selección',
};

const entityNameKeys = [
  'full_name',
  'display_name',
  'name',
  'employee_name',
  'employee_full_name',
  'candidate_name',
  'cargo_solicitado',
  'position_title',
  'requisition_code',
  'email',
  'user_email',
  'role_name',
  'title',
];

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getValues(log: AuditLogEntry): Record<string, unknown> {
  return {
    ...(log.old_values ?? {}),
    ...(log.new_values ?? {}),
    ...(log.metadata ?? {}),
  };
}

function valueFromKeys(values: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = cleanText(values[key]);
    if (value) return value;
  }
  return null;
}

function getTargetName(log: AuditLogEntry): string | null {
  return cleanText(log.entity_name) || valueFromKeys(getValues(log), entityNameKeys);
}

function getRoleName(log: AuditLogEntry): string | null {
  return cleanText(log.new_values?.role_name) || cleanText(log.old_values?.role_name) || cleanText(getValues(log).role);
}

function getApprovalChange(log: AuditLogEntry): { step: string; approved: boolean } | null {
  const values = log.new_values ?? {};

  for (const [key, value] of Object.entries(values)) {
    const match = key.match(/^(.+)_aprobado$/);
    if (!match || typeof value !== 'boolean') continue;
    const rawStep = match[1];
    return {
      step: approvalStepLabels[rawStep] ?? rawStep.replace(/_/g, ' '),
      approved: value,
    };
  }

  return null;
}

function getActivationAction(log: AuditLogEntry): 'activo' | 'inactivo' | null {
  const candidates = ['is_active', 'active', 'enabled'];

  for (const key of candidates) {
    if (typeof log.new_values?.[key] === 'boolean') {
      return log.new_values[key] ? 'activo' : 'inactivo';
    }
  }

  const status = cleanText(log.new_values?.status)?.toLowerCase();
  if (!status) return null;
  if (['inactive', 'inactivo', 'suspended', 'suspendido'].includes(status)) return 'inactivo';
  if (['active', 'activo'].includes(status)) return 'activo';
  return null;
}

function describeEntity(log: AuditLogEntry): string {
  const entityLabel = entityTypeLabels[log.entity_type] ?? log.entity_type.replace(/_/g, ' ');
  const targetName = getTargetName(log);
  const normalizedEntity = entityLabel.toLowerCase();

  if (normalizedEntity.includes('usuario')) {
    return targetName ? `a ${targetName} como usuario` : 'un usuario';
  }

  if (normalizedEntity.includes('requisicion') || normalizedEntity.includes('requisici')) {
    return targetName ? `la Requisición ${targetName}` : 'una Requisición';
  }

  if (normalizedEntity.includes('rol')) {
    return targetName ? `el rol ${targetName}` : 'un rol';
  }

  return targetName ? `${entityLabel} ${targetName}` : entityLabel;
}

export function getAuditActorName(log: AuditLogEntry): string {
  return (
    cleanText(log.actor_name) ||
    cleanText(log.metadata?.actor_name) ||
    cleanText(log.metadata?.user_name) ||
    cleanText(log.user_email?.split('@')[0]) ||
    'Sistema'
  );
}

export function getAuditEventSummary(log: AuditLogEntry): string {
  const actor = getAuditActorName(log);
  const approval = getApprovalChange(log);
  const targetName = getTargetName(log);

  if (approval && (log.entity_type === 'requisition' || log.entity_type === 'personnel_requisitions')) {
    const verb = approval.approved ? 'aprobó' : 'rechazó';
    return `${actor} ${verb} Requisición en ${approval.step}${targetName ? ` (${targetName})` : ''}`;
  }

  if (log.action === 'assign_role') {
    const roleName = getRoleName(log);
    return `${actor} asignó${roleName ? ` el rol ${roleName}` : ' un rol'} a ${targetName ?? 'un usuario'}`;
  }

  if (log.action === 'remove_role') {
    const roleName = getRoleName(log);
    return `${actor} retiró${roleName ? ` el rol ${roleName}` : ' un rol'} a ${targetName ?? 'un usuario'}`;
  }

  if (log.action === 'change_permissions') {
    return `${actor} cambió los permisos de ${describeEntity(log)}`;
  }

  if (log.action === 'create' || log.action === 'invite_user') {
    return `${actor} creó ${describeEntity(log)}`;
  }

  if (log.action === 'delete') {
    return `${actor} eliminó ${describeEntity(log)}`;
  }

  if (log.action === 'update') {
    const activationAction = getActivationAction(log);
    if (activationAction === 'inactivo') return `${actor} inactivó ${describeEntity(log)}`;
    if (activationAction === 'activo') return `${actor} activó ${describeEntity(log)}`;
    return `${actor} actualizó ${describeEntity(log)}`;
  }

  if (log.action === 'login') return `${actor} inició sesión`;
  if (log.action === 'logout') return `${actor} cerró sesión`;
  if (log.action === 'failed_login') return `${actor} tuvo un intento fallido de ingreso`;

  if (log.action.startsWith('export_')) {
    return `${actor} exportó información de ${resolveModuleLabel(log.module)}`;
  }

  if (log.description) return log.description;

  return `${actor} realizó ${actionLabels[log.action]?.toLowerCase() ?? log.action} en ${describeEntity(log)}`;
}

export const severityConfig: Record<AuditSeverity, { label: string; class: string }> = {
  info:     { label: 'Info',     class: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  warning:  { label: 'Alerta',   class: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  critical: { label: 'Crítico',  class: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
};

export const actionConfig: Record<string, { class: string; icon?: string }> = {
  create:  { class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  update:  { class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  delete:  { class: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  login:   { class: 'bg-violet-500/10 text-violet-600 border-violet-500/20' },
  logout:  { class: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  failed_login: { class: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  export_pdf:   { class: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' },
  export_excel: { class: 'bg-green-500/10 text-green-600 border-green-500/20' },
  ai_chat:      { class: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  ai_generate_content: { class: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
};

// ─── Hook: Lista Paginada de Logs ────────────────────────────

export function useAuditLogs(
  page = 0,
  pageSize = 25,
  filters?: AuditFilters
) {
  const { currentCompanyId, isSuperAdmin } = useAuth();

  return useQuery({
    queryKey: ['audit_logs', currentCompanyId, page, pageSize, filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Multi-tenant: filtrar por empresa a menos que sea super admin sin filtro
      if (!isSuperAdmin && currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      } else if (currentCompanyId) {
        query = query.eq('company_id', currentCompanyId);
      }

      if (filters?.userId)     query = query.eq('user_id', filters.userId);
      if (filters?.module)     query = query.eq('module', filters.module);
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters?.entityId)   query = query.eq('entity_id', filters.entityId);
      if (filters?.action)     query = query.eq('action', filters.action);
      if (filters?.severity)   query = query.eq('severity', filters.severity);

      if (filters?.startDate)
        query = query.gte('created_at', filters.startDate.toISOString());
      if (filters?.endDate)
        query = query.lte('created_at', filters.endDate.toISOString());

      // Búsqueda por texto: filtramos por email o entity_name
      if (filters?.search) {
        query = query.or(
          `user_email.ilike.%${filters.search}%,entity_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const logs = (data ?? []) as AuditLogEntry[];
      const userIds = Array.from(new Set(logs.map(log => log.user_id).filter(Boolean)));
      let profileMap = new Map<string, string>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, display_name')
          .in('id', userIds);

        profileMap = new Map(
          (profiles ?? []).map(profile => [
            profile.id,
            profile.full_name || profile.display_name || profile.id,
          ])
        );
      }

      return {
        data: logs.map(log => ({
          ...log,
          actor_name: profileMap.get(log.user_id) ?? null,
        })),
        total: count ?? 0,
      };
    },
    enabled: !!currentCompanyId,
    staleTime: 1000 * 30, // 30s cache
  });
}

// ─── Hook: Trail de una Entidad ───────────────────────────────

export function useEntityAuditTrail(entityType: string, entityId: string, enabled = true) {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['audit_trail', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as AuditLogEntry[];
    },
    enabled: enabled && !!currentCompanyId && !!entityId,
  });
}

// ─── Hook: Stats de Auditoría ─────────────────────────────────

export interface AuditStats {
  total: number;
  today: number;
  critical: number;
  deletes: number;
  topUsers: { email: string; count: number }[];
  byModule: { module: string; count: number }[];
}

export function useAuditStats() {
  const { currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ['audit_stats', currentCompanyId],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalRes, todayRes, criticalRes, deletesRes, userRes, moduleRes] = await Promise.all([
        supabase.from('audit_logs').select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompanyId!),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompanyId!).gte('created_at', todayStart.toISOString()),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompanyId!).eq('severity', 'critical'),
        supabase.from('audit_logs').select('id', { count: 'exact', head: true })
          .eq('company_id', currentCompanyId!).eq('action', 'delete'),
        // Top usuarios (últimos 30 días)
        supabase.rpc('audit_top_users', {
          p_company_id: currentCompanyId,
          p_limit: 5
        }).select('*'),
        // Por módulo
        supabase.rpc('audit_by_module', {
          p_company_id: currentCompanyId,
          p_limit: 8
        }).select('*'),
      ]);

      return {
        total: totalRes.count ?? 0,
        today: todayRes.count ?? 0,
        critical: criticalRes.count ?? 0,
        deletes: deletesRes.count ?? 0,
        topUsers: (userRes.data ?? []) as { email: string; count: number }[],
        byModule: (moduleRes.data ?? []) as { module: string; count: number }[],
      } satisfies AuditStats;
    },
    enabled: !!currentCompanyId,
    staleTime: 1000 * 60, // 1 min
  });
}

// ─── Hook: Mutación para Registrar Eventos ────────────────────

export function useLogAction() {
  const { user, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LogActionParams) => {
      if (!user || !currentCompanyId) return;

      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        company_id: currentCompanyId,
        action: params.action,
        entity_type: params.entityType,
        module: params.module ?? params.entityType,
        entity_id: params.entityId ?? null,
        entity_name: params.entityName ?? null,
        description: params.description ?? null,
        old_values: params.oldValues ?? null,
        new_values: params.newValues ?? null,
        metadata: params.metadata ?? null,
        severity: params.severity ?? 'info',
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit_stats'] });
    },
  });
}

// ─── Hook: API simplificada ───────────────────────────────────

export function useAuditLogger() {
  const logAction = useLogAction();
  const log = (params: LogActionParams) => logAction.mutate(params);
  return { log, isLogging: logAction.isPending };
}
