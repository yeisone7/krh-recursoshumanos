import { describe, expect, it } from 'vitest';
import type { EmployeeV2WithRelations } from '@/types/employee';
import {
  filterEmployeeContacts,
  getEmployeeCenterIds,
  getEmployeeCenterNames,
  toEmployeeContactExportRows,
} from '@/lib/employeeContacts';

const employee = {
  id: 'employee-1',
  first_name: 'Ana',
  middle_name: null,
  last_name: 'Pérez',
  second_last_name: null,
  document_number: '101010',
  document_type: 'CC',
  work_info: { operation_center_id: 'center-1', position_name: 'Analista' },
  operation_centers: { id: 'center-1', name: 'Centro Norte' },
  operation_center_assignments: [
    { operation_center_id: 'center-2', operation_centers: { id: 'center-2', name: 'Centro Sur' } },
  ],
  contact: {
    email: 'ana@empresa.com',
    personal_email: 'ana@gmail.com',
    mobile: '3001234567',
    phone: null,
    residence_address: 'Calle 10',
    residence_neighborhood: 'Centro',
    residence_city: 'Medellín',
    residence_department: 'Antioquia',
    emergency_contact_name: 'Luis Pérez',
    emergency_contact_phone: '3100000000',
    emergency_contact_relationship: 'Padre',
  },
} as unknown as EmployeeV2WithRelations;

describe('employee contact directory helpers', () => {
  it('includes primary and additional operation centers without duplicates', () => {
    expect(getEmployeeCenterIds(employee)).toEqual(['center-1', 'center-2']);
    expect(getEmployeeCenterNames(employee)).toEqual(['Centro Norte', 'Centro Sur']);
  });

  it('filters by operation center and contact information', () => {
    expect(filterEmployeeContacts([employee], 'gmail', 'center-2')).toEqual([employee]);
    expect(filterEmployeeContacts([employee], 'gmail', 'center-3')).toEqual([]);
    expect(filterEmployeeContacts([employee], 'bogotá', 'all')).toEqual([]);
  });

  it('maps all relevant contact fields for export', () => {
    expect(toEmployeeContactExportRows([employee])[0]).toMatchObject({
      'Nombre completo': 'Ana Pérez',
      'Centro(s) de operacion': 'Centro Norte, Centro Sur',
      'Correo personal': 'ana@gmail.com',
      Direccion: 'Calle 10, Centro',
      'Telefono de emergencia': '3100000000',
    });
  });
});
