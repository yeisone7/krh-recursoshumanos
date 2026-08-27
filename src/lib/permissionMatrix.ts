export const SENSITIVE_PERMISSION_MODULE_CODES = new Set([
  'req_confidential_requisitions',
  'catalogos_seleccion_lista_rosada',
]);

export const AUTO_EXPANDED_PERMISSION_MODULE_CODES = new Set([
  ...SENSITIVE_PERMISSION_MODULE_CODES,
  'leave_approve_manager',
  'leave_approve_area_leader',
  'leave_type_configuration',
]);

const PERMISSION_MODULE_LABELS: Record<string, string> = {
  leave_approve_manager: 'Aprobar como Jefe Inmediato',
  leave_approve_area_leader: 'Aprobar como Líder de Área',
  leave_type_configuration: 'Configurar tipos de permisos',
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
