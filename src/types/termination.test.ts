import { describe, expect, it } from 'vitest';

import {
  initiateTerminationSchema,
  requiredDocumentsByType,
  selectableTerminationTypes,
  terminationTypeLabels,
} from './termination';
import { generateTerminationDocument } from '@/lib/terminationPdfGenerator';

const baseTermination = {
  terminationType: 'con_justa_causa' as const,
  terminationDate: new Date('2026-08-20'),
  effectiveDate: new Date('2026-08-21'),
};

describe('termination type con_justa_causa', () => {
  it('is exposed with its user-facing label and required checklist', () => {
    expect(terminationTypeLabels.con_justa_causa).toBe('Con Justa Causa');
    expect(selectableTerminationTypes).toContainEqual(['con_justa_causa', 'Con Justa Causa']);
    expect(requiredDocumentsByType.con_justa_causa).toContain('acta_terminacion');
  });

  it('requires the facts and reasons that support the just cause', () => {
    expect(initiateTerminationSchema.safeParse(baseTermination).success).toBe(false);
    expect(initiateTerminationSchema.safeParse({
      ...baseTermination,
      reason: 'Incumplimiento grave documentado en el proceso disciplinario.',
    }).success).toBe(true);
  });

  it('routes the termination letter to the just-cause template', () => {
    const documentData = {
      companyName: 'Empresa de prueba',
      companyNit: '900000000-1',
      employeeFullName: 'Empleado de Prueba',
      employeeDocumentType: 'C.C.',
      employeeDocumentNumber: '1000000000',
      employeePosition: 'Cargo de prueba',
      contractType: 'Indefinido',
      contractStartDate: new Date('2025-01-01'),
      salary: 1500000,
      terminationType: 'con_justa_causa' as const,
      terminationDate: new Date('2026-08-20'),
      effectiveDate: new Date('2026-08-21'),
      hrManagerName: 'Responsable de Talento Humano',
      hrManagerPosition: 'Talento Humano',
      documentDate: new Date('2026-08-20'),
      documentCity: 'Bogotá',
    };

    expect(() => generateTerminationDocument('acta_terminacion', documentData)).toThrow(
      'La terminación con justa causa requiere describir los hechos y motivos.',
    );

    expect(() => generateTerminationDocument('acta_terminacion', {
      ...documentData,
      reason: 'Incumplimiento grave documentado en el proceso disciplinario.',
    })).not.toThrow();
  });
});
