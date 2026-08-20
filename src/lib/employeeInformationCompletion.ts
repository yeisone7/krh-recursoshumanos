export const employeeInformationSections = [
  { key: 'personal', label: 'Datos personales' },
  { key: 'contact', label: 'Contacto y emergencia' },
  { key: 'work', label: 'Información laboral' },
  { key: 'socialSecurity', label: 'Seguridad social' },
  { key: 'bank', label: 'Información bancaria' },
  { key: 'documents', label: 'Documentos cargados' },
] as const;

export type EmployeeInformationSectionKey = (typeof employeeInformationSections)[number]['key'];

export type InformationSectionStatus = Record<EmployeeInformationSectionKey, boolean>;

export interface EmployeeInformationCompletionInput {
  employeeId: string;
  documentNumber: string;
  fullName: string;
  centerName?: string | null;
  personal: {
    birthDate?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
    bloodType?: string | null;
  };
  contact?: {
    email?: string | null;
    personalEmail?: string | null;
    mobile?: string | null;
    phone?: string | null;
    residenceAddress?: string | null;
    residenceCity?: string | null;
    emergencyContactName?: string | null;
    emergencyContactPhone?: string | null;
  } | null;
  work?: {
    operationCenterId?: string | null;
    areaId?: string | null;
    positionName?: string | null;
    hireDate?: string | null;
  } | null;
  socialSecurity?: {
    eps?: string | null;
    afp?: string | null;
    arl?: string | null;
    ccf?: string | null;
  } | null;
  bank?: {
    bankName?: string | null;
    accountType?: string | null;
    accountNumber?: string | null;
  } | null;
  validDocumentCount: number;
}

export interface EmployeeInformationCompletionRow {
  employeeId: string;
  documentNumber: string;
  fullName: string;
  centerName: string;
  sections: InformationSectionStatus;
  completedSections: number;
  totalSections: number;
  percentage: number;
  pendingSections: string[];
}

export interface InformationSectionSummary {
  key: EmployeeInformationSectionKey;
  label: string;
  completedEmployees: number;
  percentage: number;
}

export interface EmployeeInformationCenterSummary {
  centerName: string;
  totalEmployees: number;
  fullyCompletedEmployees: number;
  pendingEmployees: number;
  percentage: number;
}

export interface EmployeeInformationCompletionReportData {
  totalEmployees: number;
  fullyCompletedEmployees: number;
  pendingEmployees: number;
  overallPercentage: number;
  sections: InformationSectionSummary[];
  centers: EmployeeInformationCenterSummary[];
  employees: EmployeeInformationCompletionRow[];
  unavailableSections: string[];
}

function hasValue(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined;
}

function percentage(completed: number, total: number): number {
  return total === 0 ? 0 : Math.round((completed / total) * 100);
}

export function calculateEmployeeInformationCompletion(
  input: EmployeeInformationCompletionInput,
): EmployeeInformationCompletionRow {
  const sections: InformationSectionStatus = {
    personal: [
      input.personal.birthDate,
      input.personal.gender,
      input.personal.maritalStatus,
      input.personal.bloodType,
    ].every(hasValue),
    contact: [
      input.contact?.email || input.contact?.personalEmail,
      input.contact?.mobile || input.contact?.phone,
      input.contact?.residenceAddress,
      input.contact?.residenceCity,
      input.contact?.emergencyContactName,
      input.contact?.emergencyContactPhone,
    ].every(hasValue),
    work: [
      input.work?.operationCenterId,
      input.work?.areaId,
      input.work?.positionName,
      input.work?.hireDate,
    ].every(hasValue),
    socialSecurity: [
      input.socialSecurity?.eps,
      input.socialSecurity?.afp,
      input.socialSecurity?.arl,
      input.socialSecurity?.ccf,
    ].every(hasValue),
    bank: [
      input.bank?.bankName,
      input.bank?.accountType,
      input.bank?.accountNumber,
    ].every(hasValue),
    documents: input.validDocumentCount > 0,
  };

  const pendingSections = employeeInformationSections
    .filter(({ key }) => !sections[key])
    .map(({ label }) => label);
  const completedSections = employeeInformationSections.length - pendingSections.length;

  return {
    employeeId: input.employeeId,
    documentNumber: input.documentNumber,
    fullName: input.fullName,
    centerName: input.centerName?.trim() || 'Sin centro asignado',
    sections,
    completedSections,
    totalSections: employeeInformationSections.length,
    percentage: percentage(completedSections, employeeInformationSections.length),
    pendingSections,
  };
}

export function summarizeEmployeeInformationCompletion(
  employees: EmployeeInformationCompletionRow[],
  unavailableSections: string[] = [],
): EmployeeInformationCompletionReportData {
  const totalSections = employeeInformationSections.length;
  const totalCompletedSections = employees.reduce((total, employee) => total + employee.completedSections, 0);
  const centersMap = new Map<string, EmployeeInformationCompletionRow[]>();

  employees.forEach((employee) => {
    const current = centersMap.get(employee.centerName) || [];
    current.push(employee);
    centersMap.set(employee.centerName, current);
  });

  const centers = Array.from(centersMap.entries())
    .map(([centerName, centerEmployees]) => {
      const fullyCompletedEmployees = centerEmployees.filter((employee) => employee.percentage === 100).length;
      const centerCompletedSections = centerEmployees.reduce(
        (total, employee) => total + employee.completedSections,
        0,
      );

      return {
        centerName,
        totalEmployees: centerEmployees.length,
        fullyCompletedEmployees,
        pendingEmployees: centerEmployees.length - fullyCompletedEmployees,
        percentage: percentage(centerCompletedSections, centerEmployees.length * totalSections),
      };
    })
    .sort((a, b) => a.centerName.localeCompare(b.centerName, 'es'));

  const sections = employeeInformationSections.map(({ key, label }) => {
    const completedEmployees = employees.filter((employee) => employee.sections[key]).length;
    return {
      key,
      label,
      completedEmployees,
      percentage: percentage(completedEmployees, employees.length),
    };
  });

  const sortedEmployees = [...employees].sort((a, b) => {
    const centerComparison = a.centerName.localeCompare(b.centerName, 'es');
    return centerComparison !== 0 ? centerComparison : a.fullName.localeCompare(b.fullName, 'es');
  });
  const fullyCompletedEmployees = employees.filter((employee) => employee.percentage === 100).length;

  return {
    totalEmployees: employees.length,
    fullyCompletedEmployees,
    pendingEmployees: employees.length - fullyCompletedEmployees,
    overallPercentage: percentage(totalCompletedSections, employees.length * totalSections),
    sections,
    centers,
    employees: sortedEmployees,
    unavailableSections,
  };
}
