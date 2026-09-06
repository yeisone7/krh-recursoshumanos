import { describe, expect, it } from 'vitest';
import {
  getTrainingAttendanceReportCode,
  getTrainingAttendanceReportObjective,
} from './trainingAttendanceReportFormat';

describe('getTrainingAttendanceReportCode', () => {
  it.each([
    'Cosecharte SAS',
    'Cosecharte S.A.S.',
    '  COSECHARTE S.A.S.  ',
  ])('uses the Cosecharte format for %s', (companyName) => {
    expect(getTrainingAttendanceReportCode(companyName)).toBe('Codigo GH-FO-04-DR');
  });

  it.each([
    'Petrocasinos S.A.',
    'Otra empresa',
    null,
    undefined,
  ])('keeps the existing format for %s', (companyName) => {
    expect(getTrainingAttendanceReportCode(companyName)).toBe('Codigo GH FO 36');
  });
});

describe('getTrainingAttendanceReportObjective', () => {
  it('uses the detailed learning objectives instead of the objective category', () => {
    expect(getTrainingAttendanceReportObjective({
      objective: 'Sensibilización',
      content: {
        objetivos: ['Fortalecer los conocimientos financieros de los colaboradores.'],
      },
    })).toBe('Fortalecer los conocimientos financieros de los colaboradores.');
  });

  it('includes every non-empty learning objective', () => {
    expect(getTrainingAttendanceReportObjective({
      content: { objetivos: ['Identificar riesgos.', '  ', 'Aplicar controles.'] },
    })).toBe('Identificar riesgos. Aplicar controles.');
  });

  it('keeps the objective category as a fallback for legacy courses', () => {
    expect(getTrainingAttendanceReportObjective({ objective: 'Sensibilización' }))
      .toBe('Sensibilización');
  });
});
