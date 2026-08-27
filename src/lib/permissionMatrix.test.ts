import { describe, expect, it } from 'vitest';

import {
  AUTO_EXPANDED_PERMISSION_MODULE_CODES,
  getPermissionModuleLabel,
} from './permissionMatrix';

describe('permission matrix helpers', () => {
  it('keeps both leave approval stages visible by default', () => {
    expect(AUTO_EXPANDED_PERMISSION_MODULE_CODES.has('leave_approve_manager')).toBe(true);
    expect(AUTO_EXPANDED_PERMISSION_MODULE_CODES.has('leave_approve_area_leader')).toBe(true);
    expect(AUTO_EXPANDED_PERMISSION_MODULE_CODES.has('leave_type_configuration')).toBe(true);
  });

  it('uses clear labels for leave approvers', () => {
    expect(getPermissionModuleLabel(
      { code: 'leave_approve_manager', name: 'Permisos: Aprobar como Jefe Inmediato' },
      'Permisos: Aprobar como Jefe Inmediato',
    )).toBe('Aprobar como Jefe Inmediato');

    expect(getPermissionModuleLabel(
      { code: 'leave_approve_area_leader', name: 'Permisos: Aprobar como Lider de Area' },
      'Permisos: Aprobar como Lider de Area',
    )).toBe('Aprobar como Líder de Área');

    expect(getPermissionModuleLabel(
      { code: 'leave_type_configuration', name: 'Permisos: Configurar tipos de permisos' },
      'Configurar tipos y reglas de permisos',
    )).toBe('Configurar tipos de permisos');
  });
});
