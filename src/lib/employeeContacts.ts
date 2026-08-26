import type { EmployeeV2WithRelations } from '@/types/employee';
import { getEmployeeFullName } from '@/types/employee';

export type EmployeeContactExportRow = {
  'Nombre completo': string;
  Documento: string;
  Cargo: string;
  'Centro(s) de operacion': string;
  'Correo corporativo': string;
  'Correo personal': string;
  Celular: string;
  Telefono: string;
  Direccion: string;
  Ciudad: string;
  Departamento: string;
  'Contacto de emergencia': string;
  'Telefono de emergencia': string;
  Parentesco: string;
};

const normalize = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('es');

export function getEmployeeCenterIds(employee: EmployeeV2WithRelations): string[] {
  return [...new Set([
    employee.work_info?.operation_center_id,
    ...(employee.operation_center_assignments || []).map((assignment) => assignment.operation_center_id),
  ].filter((id): id is string => Boolean(id)))];
}

export function getEmployeeCenterNames(employee: EmployeeV2WithRelations): string[] {
  return [...new Set([
    employee.operation_centers?.name,
    ...(employee.operation_center_assignments || []).map((assignment) => assignment.operation_centers?.name),
  ].filter((name): name is string => Boolean(name)))];
}

export function filterEmployeeContacts(
  employees: EmployeeV2WithRelations[],
  search: string,
  centerId: string,
): EmployeeV2WithRelations[] {
  const term = normalize(search);

  return employees.filter((employee) => {
    const matchesCenter = centerId === 'all' || getEmployeeCenterIds(employee).includes(centerId);
    if (!matchesCenter) return false;
    if (!term) return true;

    const contact = employee.contact;
    return [
      getEmployeeFullName(employee),
      employee.document_number,
      employee.work_info?.position_name,
      ...getEmployeeCenterNames(employee),
      contact?.email,
      contact?.personal_email,
      contact?.mobile,
      contact?.phone,
      contact?.residence_address,
      contact?.residence_city,
      contact?.residence_department,
      contact?.emergency_contact_name,
      contact?.emergency_contact_phone,
    ].some((value) => normalize(value).includes(term));
  });
}

export function toEmployeeContactExportRows(
  employees: EmployeeV2WithRelations[],
): EmployeeContactExportRow[] {
  return employees.map((employee) => {
    const contact = employee.contact;
    return {
      'Nombre completo': getEmployeeFullName(employee),
      Documento: employee.document_number || '',
      Cargo: employee.work_info?.position_name || '',
      'Centro(s) de operacion': getEmployeeCenterNames(employee).join(', '),
      'Correo corporativo': contact?.email || '',
      'Correo personal': contact?.personal_email || '',
      Celular: contact?.mobile || '',
      Telefono: contact?.phone || '',
      Direccion: [contact?.residence_address, contact?.residence_neighborhood].filter(Boolean).join(', '),
      Ciudad: contact?.residence_city || '',
      Departamento: contact?.residence_department || '',
      'Contacto de emergencia': contact?.emergency_contact_name || '',
      'Telefono de emergencia': contact?.emergency_contact_phone || '',
      Parentesco: contact?.emergency_contact_relationship || '',
    };
  });
}
