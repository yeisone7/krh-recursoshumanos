import { describe, expect, it } from 'vitest';
import { getTrainingAttendanceReportCode } from './trainingAttendanceReportFormat';

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
