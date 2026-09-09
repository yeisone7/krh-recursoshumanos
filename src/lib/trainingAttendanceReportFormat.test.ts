import { describe, expect, it } from 'vitest';
import {
  TRAINING_ATTENDANCE_REPORT_COURSE_FIELDS,
  getTrainingAttendanceReportCode,
  getTrainingAttendanceReportObjective,
  getTrainingAttendanceReportPosition,
} from './trainingAttendanceReportFormat';

describe('training attendance report query contract', () => {
  it('requests the structured course content needed for the real objective', () => {
    expect(TRAINING_ATTENDANCE_REPORT_COURSE_FIELDS.split(',').map((field) => field.trim()))
      .toContain('content');
  });
});

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

describe('getTrainingAttendanceReportPosition', () => {
  it('uses the normalized position relation used by Petrocasinos', () => {
    expect(getTrainingAttendanceReportPosition([{
      is_current: true,
      position_name: null,
      positions: { name: 'Auxiliar de Cocina' },
    }])).toBe('Auxiliar de Cocina');
  });

  it('keeps the legacy position name used by existing companies', () => {
    expect(getTrainingAttendanceReportPosition([{
      is_current: true,
      position_name: 'Facilitadora de Calidad',
    }])).toBe('Facilitadora de Calidad');
  });

  it('uses a dash when no position is available', () => {
    expect(getTrainingAttendanceReportPosition([])).toBe('-');
  });
});
