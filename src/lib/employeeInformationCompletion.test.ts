import { describe, expect, it } from 'vitest';
import {
  calculateEmployeeInformationCompletion,
  summarizeEmployeeInformationCompletion,
} from './employeeInformationCompletion';

const completeEmployee = {
  employeeId: 'employee-1',
  documentNumber: '123456789',
  fullName: 'Ana Pérez',
  centerName: 'Centro Norte',
  personal: { birthDate: '1990-01-01', gender: 'female', maritalStatus: 'single', bloodType: 'O+' },
  contact: {
    email: 'ana@example.com',
    mobile: '3000000000',
    residenceAddress: 'Calle 1',
    residenceCity: 'Bogotá',
    emergencyContactName: 'Luis Pérez',
    emergencyContactPhone: '3010000000',
  },
  work: { operationCenterId: 'center-1', areaId: 'area-1', positionName: 'Analista', hireDate: '2025-01-01' },
  socialSecurity: { eps: 'EPS', afp: 'AFP', arl: 'ARL', ccf: 'CCF' },
  bank: { bankName: 'Banco', accountType: 'savings', accountNumber: '12345' },
  validDocumentCount: 1,
};

describe('employee information completion', () => {
  it('calculates all six sections for a fully completed profile', () => {
    const result = calculateEmployeeInformationCompletion(completeEmployee);

    expect(result.percentage).toBe(100);
    expect(result.pendingSections).toEqual([]);
    expect(result.completedSections).toBe(6);
  });

  it('identifies missing sections and aggregates them by center', () => {
    const incomplete = calculateEmployeeInformationCompletion({
      ...completeEmployee,
      employeeId: 'employee-2',
      fullName: 'Carlos Díaz',
      centerName: undefined,
      bank: undefined,
      validDocumentCount: 0,
    });
    const complete = calculateEmployeeInformationCompletion(completeEmployee);
    const summary = summarizeEmployeeInformationCompletion([complete, incomplete]);

    expect(incomplete.pendingSections).toEqual(['Información bancaria', 'Documentos cargados']);
    expect(incomplete.centerName).toBe('Sin centro asignado');
    expect(summary.overallPercentage).toBe(83);
    expect(summary.centers).toHaveLength(2);
    expect(summary.fullyCompletedEmployees).toBe(1);
  });
});
