import { describe, expect, it } from 'vitest';

import {
  getCurrentApprovalStepForRequisition,
  getNextStatusForApprovalStep,
  isApprovalStepActiveForRequisition,
} from './requisitionApprovalFlow';

describe('requisitionApprovalFlow', () => {
  it('activates only coordinadores after submission', () => {
    const requisition = {
      autoriza: 'gerencia_operaciones',
      estado_requisicion: 'en_coordinadores',
      coordinadores_aprobado: null,
      rrhh_aprobado: null,
    };

    expect(getCurrentApprovalStepForRequisition(requisition)).toBe('coordinadores');
    expect(isApprovalStepActiveForRequisition(requisition, 'rrhh')).toBe(false);
  });

  it('requires coordinator approval before RRHH can approve', () => {
    expect(
      isApprovalStepActiveForRequisition(
        {
          autoriza: 'gerencia_operaciones',
          estado_requisicion: 'en_rrhh',
          coordinadores_aprobado: null,
          rrhh_aprobado: null,
        },
        'rrhh',
      ),
    ).toBe(false);

    expect(
      isApprovalStepActiveForRequisition(
        {
          autoriza: 'gerencia_operaciones',
          estado_requisicion: 'en_rrhh',
          coordinadores_aprobado: true,
          rrhh_aprobado: null,
        },
        'rrhh',
      ),
    ).toBe(true);
  });

  it('routes next status according to autoriza', () => {
    expect(getNextStatusForApprovalStep('gerencia_administrativa', 'juridico', true)).toBe('en_gerencia');
    expect(getNextStatusForApprovalStep('gerencia_operaciones', 'juridico', true)).toBe('en_operaciones');
    expect(getNextStatusForApprovalStep('gerencia_operaciones', 'seleccion', true)).toBe('aprobada');
    expect(getNextStatusForApprovalStep('gerencia_operaciones', 'rrhh', false)).toBe('rechazada');
  });
});
