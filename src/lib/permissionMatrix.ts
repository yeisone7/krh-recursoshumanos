export const SENSITIVE_PERMISSION_MODULE_CODES = new Set([
  'req_confidential_requisitions',
  'catalogos_seleccion_lista_rosada',
]);

export const AUTO_EXPANDED_PERMISSION_MODULE_CODES = new Set([
  'cortes_control',
  'correction_tickets',
  'correction_tickets_analytics',
  ...SENSITIVE_PERMISSION_MODULE_CODES,
  'leave_approve_manager',
  'leave_approve_area_leader',
  'leave_type_configuration',
]);

const PERMISSION_MODULE_LABELS: Record<string, string> = {
  leave_approve_manager: 'Aprobar como Jefe Inmediato',
  leave_approve_area_leader: 'Aprobar como Líder de Área',
  leave_type_configuration: 'Configurar tipos de permisos',
  correction_tickets_analytics: 'Ver analítica de correcciones',
};

export const PAYROLL_PERMISSION_LABELS: Record<string, Partial<Record<string, string>>> = {
  jornadas: { view: 'Ver revisión', approve: 'Aprobar o rechazar jornadas' },
  correction_tickets: {
    view: 'Ver solicitudes', create: 'Solicitar corrección',
    approve: 'Autorizar o rechazar', update: 'Revocar', export: 'Consultar auditoría',
  },
  correction_tickets_analytics: { view: 'Ver dashboard' },
};

export function getPermissionModuleLabel(
  module: { code: string; name: string },
  permissionDescription?: string | null,
) {
  const customLabel = PERMISSION_MODULE_LABELS[module.code];
  if (customLabel) return customLabel;
  if (!permissionDescription) return module.name;

  return permissionDescription.replace(/\s+-\s+(Ver|Crear|Modificar|Eliminar)$/i, '').trim();
}
