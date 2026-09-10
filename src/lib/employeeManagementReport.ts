import XLSX, { type WorkBook } from 'xlsx';
import { format } from 'date-fns';
import { createExcelWorkbook, type ReportColumn, type ReportData } from '@/lib/reportExporter';
import type { GeneralEmployeeReportRow, GeneralEmployeeReportValue } from '@/lib/generalEmployeeReport';

type RequirementLevel = 'Obligatorio' | 'Complementario';

interface Requirement {
  key: string;
  label: string;
  section: string;
  level: RequirementLevel;
  activeOnly?: boolean;
  test?: (row: GeneralEmployeeReportRow) => boolean;
}
export interface EmployeeManagementDetail {
  employee_id: string;
  documento: string;
  nombre: string;
  estado: string;
  centro: string;
  area: string;
  cargo: string;
  campos_obligatorios: number;
  obligatorios_faltantes: number;
  diligenciamiento_obligatorio: number;
  complementarios_aplicables: number;
  complementarios_faltantes: number;
  diligenciamiento_complementario: number;
  documentos_vigentes: number;
  documentos_vencidos: number;
  sin_documentos: string;
  contrato_vigente: string;
  contrato_aprobado: string;
  soporte_contrato: string;
  certificaciones: number;
  vacunas: number;
  prioridad: string;
}

export interface MissingInformationDetail {
  documento: string;
  empleado: string;
  estado: string;
  centro: string;
  nivel: RequirementLevel;
  seccion: string;
  campo_faltante: string;
  accion_sugerida: string;
  prioridad: string;
}

export interface FieldCompletionSummary {
  nivel: RequirementLevel;
  seccion: string;
  campo: string;
  aplicables: number;
  diligenciados: number;
  faltantes: number;
  porcentaje_diligenciado: number;
}

export interface ModuleCoverageSummary {
  modulo: string;
  empleados_aplicables: number;
  empleados_con_informacion: number;
  empleados_sin_informacion: number;
  porcentaje_cobertura: number;
}

export interface EmployeeManagementAnalysis {
  employees: EmployeeManagementDetail[];
  missing: MissingInformationDetail[];
  fields: FieldCompletionSummary[];
  modules: ModuleCoverageSummary[];
  documents: Array<Record<string, string | number>>;
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    employeesWithoutDocuments: number;
    activeWithoutDocuments: number;
    percentWithoutDocuments: number;
    averageRequiredCompletion: number;
    employeesWithRequiredGaps: number;
    activeWithoutCurrentContract: number;
    activeWithoutApprovedContract: number;
    activeWithoutContractSupport: number;
    expiredDocuments: number;
  };
}

const REQUIREMENTS: Requirement[] = [
  { key: 'tipo_identificacion', label: 'Tipo de identificación', section: 'Identificación', level: 'Obligatorio' },
  { key: 'documento', label: 'Número de documento', section: 'Identificación', level: 'Obligatorio' },
  { key: 'primer_nombre', label: 'Primer nombre', section: 'Identificación', level: 'Obligatorio' },
  { key: 'primer_apellido', label: 'Primer apellido', section: 'Identificación', level: 'Obligatorio' },
  { key: 'fecha_nacimiento', label: 'Fecha de nacimiento', section: 'Identificación', level: 'Obligatorio' },
  { key: 'sexo_biologico', label: 'Sexo biológico', section: 'Identificación', level: 'Obligatorio' },
  { key: 'estado_civil', label: 'Estado civil', section: 'Identificación', level: 'Obligatorio' },
  { key: 'departamento_residencia', label: 'Departamento de residencia', section: 'Contacto', level: 'Obligatorio' },
  { key: 'ciudad_residencia', label: 'Ciudad de residencia', section: 'Contacto', level: 'Obligatorio' },
  { key: 'direccion_residencia', label: 'Dirección de residencia', section: 'Contacto', level: 'Obligatorio' },
  { key: 'telefono_contacto', label: 'Teléfono o celular', section: 'Contacto', level: 'Obligatorio', test: (row) => hasValue(row.telefono) || hasValue(row.celular) },
  { key: 'contacto_emergencia', label: 'Contacto de emergencia', section: 'Contacto', level: 'Obligatorio' },
  { key: 'telefono_emergencia', label: 'Teléfono de emergencia', section: 'Contacto', level: 'Obligatorio' },
  { key: 'parentesco_emergencia', label: 'Parentesco de emergencia', section: 'Contacto', level: 'Obligatorio' },
  { key: 'centro', label: 'Centro de operación', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'centro_costos', label: 'Centro de costos', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'area', label: 'Área', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'cargo', label: 'Cargo', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'ciudad_trabajo', label: 'Ciudad de trabajo', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'fecha_ingreso', label: 'Fecha de ingreso', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'tipo_vinculacion', label: 'Tipo de vinculación', section: 'Información laboral', level: 'Obligatorio' },
  { key: 'nivel_riesgo', label: 'Nivel de riesgo', section: 'Seguridad social', level: 'Obligatorio' },
  { key: 'eps', label: 'EPS', section: 'Seguridad social', level: 'Obligatorio' },
  { key: 'afp', label: 'AFP', section: 'Seguridad social', level: 'Obligatorio' },
  { key: 'arl', label: 'ARL', section: 'Seguridad social', level: 'Obligatorio' },
  { key: 'ccf', label: 'Caja de compensación', section: 'Seguridad social', level: 'Obligatorio' },
  { key: 'banco', label: 'Banco', section: 'Información bancaria', level: 'Obligatorio' },
  { key: 'tipo_cuenta', label: 'Tipo de cuenta', section: 'Información bancaria', level: 'Obligatorio' },
  { key: 'numero_cuenta', label: 'Número de cuenta', section: 'Información bancaria', level: 'Obligatorio' },
  { key: 'cuenta_registrada', label: 'Cuenta registrada', section: 'Información bancaria', level: 'Obligatorio', test: (row) => isYes(row.cuenta_registrada) },
  { key: 'tipo_nomina', label: 'Tipo de nómina', section: 'Jornada', level: 'Obligatorio' },
  { key: 'dia_descanso', label: 'Día de descanso', section: 'Jornada', level: 'Obligatorio' },
  { key: 'modalidad_tiempo', label: 'Modalidad de tiempo', section: 'Jornada', level: 'Obligatorio' },
  { key: 'horario_o_ciclo', label: 'Horario o ciclo', section: 'Jornada', level: 'Obligatorio' },
  { key: 'contrato_vigente', label: 'Contrato vigente', section: 'Contrato', level: 'Obligatorio', activeOnly: true, test: (row) => isYes(row.contrato_vigente) },
  { key: 'contrato_aprobado', label: 'Contrato aprobado', section: 'Contrato', level: 'Obligatorio', activeOnly: true, test: (row) => isYes(row.contrato_aprobado) },
  { key: 'salario', label: 'Salario válido', section: 'Contrato', level: 'Obligatorio', activeOnly: true, test: (row) => Number(row.salario || 0) > 0 },
  { key: 'soporte_contrato', label: 'Soporte de contrato', section: 'Contrato', level: 'Obligatorio', activeOnly: true, test: (row) => isYes(row.soporte_contrato) },
  { key: 'numero_documentos', label: 'Al menos un documento vigente', section: 'Documentos', level: 'Obligatorio', test: (row) => Number(row.numero_documentos || 0) > 0 },
  { key: 'ciudad_expedicion', label: 'Ciudad de expedición', section: 'Identificación', level: 'Complementario' },
  { key: 'fecha_expedicion', label: 'Fecha de expedición', section: 'Identificación', level: 'Complementario' },
  { key: 'pais_nacimiento', label: 'País de nacimiento', section: 'Demografía', level: 'Complementario' },
  { key: 'departamento_nacimiento', label: 'Departamento de nacimiento', section: 'Demografía', level: 'Complementario' },
  { key: 'ciudad_nacimiento', label: 'Ciudad de nacimiento', section: 'Demografía', level: 'Complementario' },
  { key: 'grupo_sanguineo', label: 'Grupo sanguíneo', section: 'Demografía', level: 'Complementario' },
  { key: 'nivel_educativo', label: 'Nivel educativo', section: 'Demografía', level: 'Complementario' },
  { key: 'profesion', label: 'Profesión', section: 'Demografía', level: 'Complementario' },
  { key: 'barrio_residencia', label: 'Barrio de residencia', section: 'Contacto', level: 'Complementario' },
  { key: 'correo_contacto', label: 'Correo corporativo o personal', section: 'Contacto', level: 'Complementario', test: (row) => hasValue(row.correo_corporativo) || hasValue(row.correo_personal) },
];

const ACTIONS: Record<string, string> = {
  Identificación: 'Completar la ficha básica del empleado.',
  Demografía: 'Actualizar la información demográfica.',
  Contacto: 'Actualizar datos de contacto y emergencia.',
  'Información laboral': 'Completar la asignación laboral vigente.',
  'Seguridad social': 'Registrar afiliaciones de seguridad social.',
  'Información bancaria': 'Validar y completar los datos bancarios.',
  Jornada: 'Asignar nómina, jornada y horario o ciclo.',
  Contrato: 'Revisar el contrato vigente, aprobación y soporte.',
  Documentos: 'Adjuntar al menos un documento vigente del empleado.',
};

const MODULES = [
  { name: 'Identificación', sections: ['Identificación', 'Demografía'] },
  { name: 'Contacto', sections: ['Contacto'] },
  { name: 'Información laboral', sections: ['Información laboral'] },
  { name: 'Seguridad social', sections: ['Seguridad social'] },
  { name: 'Información bancaria', sections: ['Información bancaria'] },
  { name: 'Jornada y horario', sections: ['Jornada'] },
  { name: 'Contratos', sections: ['Contrato'] },
  { name: 'Documentos', sections: ['Documentos'] },
] as const;

function hasValue(value: GeneralEmployeeReportValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  const normalized = String(value).trim().toLocaleLowerCase('es');
  return !['', '-', 'sin centro', 'sin centro asignado', 'sin área', 'sin area', 'no aplica'].includes(normalized);
}

function isYes(value: GeneralEmployeeReportValue | undefined): boolean {
  return ['sí', 'si', 'true'].includes(String(value ?? '').trim().toLocaleLowerCase('es'));
}

function applies(requirement: Requirement, row: GeneralEmployeeReportRow): boolean {
  return !requirement.activeOnly || isYes(row.activo);
}

function isComplete(requirement: Requirement, row: GeneralEmployeeReportRow): boolean {
  return requirement.test ? requirement.test(row) : hasValue(row[requirement.key]);
}

function percentage(value: number, total: number): number {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}

function detailPriority(active: boolean, requiredMissing: number, withoutDocuments: boolean): string {
  if (active && (withoutDocuments || requiredMissing >= 10)) return 'Alta';
  if (active && requiredMissing > 0) return 'Media';
  if (requiredMissing > 0) return 'Baja';
  return 'Sin acción';
}

export function analyzeEmployeeManagementReport(rows: GeneralEmployeeReportRow[]): EmployeeManagementAnalysis {
  const missing: MissingInformationDetail[] = [];
  const fieldCounters = new Map<string, { requirement: Requirement; applicable: number; complete: number }>();

  const employees = rows.map((row) => {
    const active = isYes(row.activo);
    const applicable = REQUIREMENTS.filter((requirement) => applies(requirement, row));
    const required = applicable.filter((requirement) => requirement.level === 'Obligatorio');
    const complementary = applicable.filter((requirement) => requirement.level === 'Complementario');
    const requiredMissing = required.filter((requirement) => !isComplete(requirement, row));
    const complementaryMissing = complementary.filter((requirement) => !isComplete(requirement, row));
    const withoutDocuments = Number(row.numero_documentos || 0) === 0;
    const priority = detailPriority(active, requiredMissing.length, withoutDocuments);

    applicable.forEach((requirement) => {
      const counterKey = `${requirement.level}|${requirement.section}|${requirement.key}`;
      const counter = fieldCounters.get(counterKey) || { requirement, applicable: 0, complete: 0 };
      counter.applicable += 1;
      if (isComplete(requirement, row)) counter.complete += 1;
      fieldCounters.set(counterKey, counter);
    });

    [...requiredMissing, ...complementaryMissing].forEach((requirement) => {
      missing.push({
        documento: String(row.documento || '-'),
        empleado: String(row.nombre_completo || '-'),
        estado: String(row.estado || '-'),
        centro: String(row.centro || '-'),
        nivel: requirement.level,
        seccion: requirement.section,
        campo_faltante: requirement.label,
        accion_sugerida: ACTIONS[requirement.section] || 'Completar la información en la ficha del empleado.',
        prioridad: requirement.level === 'Obligatorio' ? priority : active ? 'Baja' : 'Informativa',
      });
    });

    return {
      employee_id: row.employee_id,
      documento: String(row.documento || '-'),
      nombre: String(row.nombre_completo || '-'),
      estado: String(row.estado || '-'),
      centro: String(row.centro || '-'),
      area: String(row.area || '-'),
      cargo: String(row.cargo || '-'),
      campos_obligatorios: required.length,
      obligatorios_faltantes: requiredMissing.length,
      diligenciamiento_obligatorio: percentage(required.length - requiredMissing.length, required.length),
      complementarios_aplicables: complementary.length,
      complementarios_faltantes: complementaryMissing.length,
      diligenciamiento_complementario: percentage(complementary.length - complementaryMissing.length, complementary.length),
      documentos_vigentes: Number(row.numero_documentos || 0),
      documentos_vencidos: Number(row.documentos_vencidos || 0),
      sin_documentos: withoutDocuments ? 'Sí' : 'No',
      contrato_vigente: String(row.contrato_vigente || 'No'),
      contrato_aprobado: String(row.contrato_aprobado || 'No'),
      soporte_contrato: String(row.soporte_contrato || 'No'),
      certificaciones: Number(row.numero_certificaciones || 0),
      vacunas: Number(row.numero_vacunas || 0),
      prioridad: priority,
    } satisfies EmployeeManagementDetail;
  });

  const fields = Array.from(fieldCounters.values()).map(({ requirement, applicable, complete }) => ({
    nivel: requirement.level,
    seccion: requirement.section,
    campo: requirement.label,
    aplicables: applicable,
    diligenciados: complete,
    faltantes: applicable - complete,
    porcentaje_diligenciado: percentage(complete, applicable),
  })).sort((left, right) => left.nivel.localeCompare(right.nivel, 'es')
    || left.seccion.localeCompare(right.seccion, 'es')
    || left.porcentaje_diligenciado - right.porcentaje_diligenciado);

  const modules = MODULES.map((module) => {
    const moduleRequirements = REQUIREMENTS.filter((requirement) => module.sections.includes(requirement.section as never));
    const applicableEmployees = rows.filter((row) => moduleRequirements.some((requirement) => applies(requirement, row)));
    const employeesWithInformation = applicableEmployees.filter((row) => moduleRequirements
      .filter((requirement) => applies(requirement, row))
      .some((requirement) => isComplete(requirement, row))).length;
    return {
      modulo: module.name,
      empleados_aplicables: applicableEmployees.length,
      empleados_con_informacion: employeesWithInformation,
      empleados_sin_informacion: applicableEmployees.length - employeesWithInformation,
      porcentaje_cobertura: percentage(employeesWithInformation, applicableEmployees.length),
    };
  });

  const activeEmployees = employees.filter((employee) => employee.estado === 'Activo');
  const employeesWithoutDocuments = employees.filter((employee) => employee.sin_documentos === 'Sí');
  const requiredPossible = employees.reduce((sum, employee) => sum + employee.campos_obligatorios, 0);
  const requiredComplete = employees.reduce((sum, employee) => sum + employee.campos_obligatorios - employee.obligatorios_faltantes, 0);

  return {
    employees,
    missing: missing.sort((left, right) => left.prioridad.localeCompare(right.prioridad, 'es') || left.empleado.localeCompare(right.empleado, 'es')),
    fields,
    modules,
    documents: employees.map((employee, index) => ({
      documento: employee.documento,
      empleado: employee.nombre,
      estado: employee.estado,
      centro: employee.centro,
      documentos_vigentes: employee.documentos_vigentes,
      documentos_vencidos: employee.documentos_vencidos,
      sin_documentos: employee.sin_documentos,
      detalle_documentos: String(rows[index]?.detalle_documentos || '-'),
      certificaciones: employee.certificaciones,
      vacunas: employee.vacunas,
    })),
    kpis: {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      employeesWithoutDocuments: employeesWithoutDocuments.length,
      activeWithoutDocuments: activeEmployees.filter((employee) => employee.sin_documentos === 'Sí').length,
      percentWithoutDocuments: percentage(employeesWithoutDocuments.length, employees.length),
      averageRequiredCompletion: percentage(requiredComplete, requiredPossible),
      employeesWithRequiredGaps: employees.filter((employee) => employee.obligatorios_faltantes > 0).length,
      activeWithoutCurrentContract: activeEmployees.filter((employee) => !isYes(employee.contrato_vigente)).length,
      activeWithoutApprovedContract: activeEmployees.filter((employee) => !isYes(employee.contrato_aprobado)).length,
      activeWithoutContractSupport: activeEmployees.filter((employee) => !isYes(employee.soporte_contrato)).length,
      expiredDocuments: employees.reduce((sum, employee) => sum + employee.documentos_vencidos, 0),
    },
  };
}

function report(
  title: string,
  sheetName: string,
  companyName: string,
  generatedAt: Date,
  columns: ReportColumn[],
  data: ReportData['data'],
  options: Partial<ReportData> = {},
): ReportData {
  return {
    title,
    subtitle: `Empresa seleccionada: ${companyName}`,
    organization: companyName,
    generatedAt,
    institutional: true,
    sheetName,
    columns,
    data,
    ...options,
  };
}

function appendReport(workbook: WorkBook, reportData: ReportData): void {
  const partial = createExcelWorkbook(reportData);
  XLSX.utils.book_append_sheet(workbook, partial.Sheets[partial.SheetNames[0]], reportData.sheetName);
}

export function createEmployeeManagementWorkbook(
  rows: GeneralEmployeeReportRow[],
  companyName: string,
  generatedAt = new Date(),
): WorkBook {
  const analysis = analyzeEmployeeManagementReport(rows);
  const { kpis } = analysis;
  const workbook = XLSX.utils.book_new();

  appendReport(workbook, report(
    'Informe de gestión de información de empleados',
    'Resumen',
    companyName,
    generatedAt,
    [
      { key: 'indicador', header: 'Indicador', width: 38 },
      { key: 'cantidad', header: 'Cantidad', width: 18 },
      { key: 'porcentaje', header: 'Porcentaje (%)', width: 20 },
      { key: 'lectura', header: 'Lectura de gestión', width: 52 },
    ],
    [
      { indicador: 'Total de empleados', cantidad: kpis.totalEmployees, porcentaje: 100, lectura: 'Población incluida para la empresa seleccionada.' },
      { indicador: 'Empleados activos', cantidad: kpis.activeEmployees, porcentaje: percentage(kpis.activeEmployees, kpis.totalEmployees), lectura: 'Empleados cuyo estado actual es activo.' },
      { indicador: 'Empleados sin documentos vigentes', cantidad: kpis.employeesWithoutDocuments, porcentaje: kpis.percentWithoutDocuments, lectura: 'No tienen archivos válidos, adjuntos y no vencidos.' },
      { indicador: 'Activos sin documentos vigentes', cantidad: kpis.activeWithoutDocuments, porcentaje: percentage(kpis.activeWithoutDocuments, kpis.activeEmployees), lectura: 'Prioridad documental sobre la población activa.' },
      { indicador: 'Diligenciamiento obligatorio promedio', cantidad: kpis.totalEmployees, porcentaje: kpis.averageRequiredCompletion, lectura: 'Cobertura ponderada de los campos obligatorios aplicables.' },
      { indicador: 'Empleados con faltantes obligatorios', cantidad: kpis.employeesWithRequiredGaps, porcentaje: percentage(kpis.employeesWithRequiredGaps, kpis.totalEmployees), lectura: 'Requieren actualización de uno o más datos obligatorios.' },
      { indicador: 'Activos sin contrato vigente', cantidad: kpis.activeWithoutCurrentContract, porcentaje: percentage(kpis.activeWithoutCurrentContract, kpis.activeEmployees), lectura: 'Contrato ausente, terminado, aún no iniciado o vencido.' },
      { indicador: 'Activos sin contrato aprobado', cantidad: kpis.activeWithoutApprovedContract, porcentaje: percentage(kpis.activeWithoutApprovedContract, kpis.activeEmployees), lectura: 'El contrato actual no figura aprobado.' },
      { indicador: 'Activos sin soporte de contrato', cantidad: kpis.activeWithoutContractSupport, porcentaje: percentage(kpis.activeWithoutContractSupport, kpis.activeEmployees), lectura: 'No hay URL en contrato ni documento vigente en Contratos y Otro sí.' },
      { indicador: 'Documentos vencidos marcados válidos', cantidad: kpis.expiredDocuments, porcentaje: percentage(kpis.expiredDocuments, Math.max(1, kpis.totalEmployees)), lectura: 'Archivos excluidos del conteo vigente por fecha de vencimiento.' },
    ],
    {
      integerKeys: ['cantidad'],
      summary: [
        { label: 'Empleados', value: kpis.totalEmployees, format: 'number' },
        { label: 'Activos', value: kpis.activeEmployees, format: 'number' },
        { label: 'Sin documentos', value: kpis.employeesWithoutDocuments, format: 'number', tone: 'warning' },
        { label: 'Diligenciamiento', value: `${kpis.averageRequiredCompletion}%`, tone: kpis.averageRequiredCompletion >= 90 ? 'positive' : 'warning' },
      ],
    },
  ));

  appendReport(workbook, report(
    'Diagnóstico por empleado', 'Empleados', companyName, generatedAt,
    [
      { key: 'documento', header: 'Documento', width: 18 }, { key: 'nombre', header: 'Empleado', width: 30 },
      { key: 'estado', header: 'Estado', width: 15 }, { key: 'centro', header: 'Centro', width: 24 },
      { key: 'area', header: 'Área', width: 22 }, { key: 'cargo', header: 'Cargo', width: 25 },
      { key: 'campos_obligatorios', header: 'Obligatorios aplicables', width: 20 },
      { key: 'obligatorios_faltantes', header: 'Obligatorios faltantes', width: 20 },
      { key: 'diligenciamiento_obligatorio', header: 'Diligenciamiento obligatorio (%)', width: 25 },
      { key: 'diligenciamiento_complementario', header: 'Diligenciamiento complementario (%)', width: 27 },
      { key: 'documentos_vigentes', header: 'Documentos vigentes', width: 19 },
      { key: 'documentos_vencidos', header: 'Documentos vencidos', width: 19 },
      { key: 'sin_documentos', header: 'Sin documentos', width: 17 },
      { key: 'contrato_vigente', header: 'Contrato vigente', width: 17 },
      { key: 'contrato_aprobado', header: 'Contrato aprobado', width: 18 },
      { key: 'soporte_contrato', header: 'Soporte contrato', width: 17 },
      { key: 'prioridad', header: 'Prioridad', width: 15 },
    ],
    analysis.employees,
    { integerKeys: ['campos_obligatorios', 'obligatorios_faltantes', 'documentos_vigentes', 'documentos_vencidos'], textKeys: ['documento'], statusKey: 'prioridad' },
  ));

  appendReport(workbook, report(
    'Información faltante por empleado', 'Faltantes', companyName, generatedAt,
    [
      { key: 'documento', header: 'Documento', width: 18 }, { key: 'empleado', header: 'Empleado', width: 30 },
      { key: 'estado', header: 'Estado', width: 15 }, { key: 'centro', header: 'Centro', width: 24 },
      { key: 'nivel', header: 'Nivel', width: 18 }, { key: 'seccion', header: 'Sección', width: 22 },
      { key: 'campo_faltante', header: 'Campo faltante', width: 30 },
      { key: 'accion_sugerida', header: 'Acción sugerida', width: 48 }, { key: 'prioridad', header: 'Prioridad', width: 15 },
    ],
    analysis.missing,
    { textKeys: ['documento'], statusKey: 'prioridad' },
  ));

  appendReport(workbook, report(
    'Estado de documentos adjuntos', 'Documentos', companyName, generatedAt,
    [
      { key: 'documento', header: 'Documento', width: 18 }, { key: 'empleado', header: 'Empleado', width: 30 },
      { key: 'estado', header: 'Estado', width: 15 }, { key: 'centro', header: 'Centro', width: 24 },
      { key: 'documentos_vigentes', header: 'Documentos vigentes', width: 20 },
      { key: 'documentos_vencidos', header: 'Documentos vencidos', width: 20 },
      { key: 'sin_documentos', header: 'Sin documentos', width: 17 },
      { key: 'detalle_documentos', header: 'Detalle de documentos vigentes', width: 55 },
      { key: 'certificaciones', header: 'Certificaciones', width: 17 }, { key: 'vacunas', header: 'Vacunas', width: 14 },
    ],
    analysis.documents,
    { integerKeys: ['documentos_vigentes', 'documentos_vencidos', 'certificaciones', 'vacunas'], textKeys: ['documento'], statusKey: 'sin_documentos' },
  ));

  appendReport(workbook, report(
    'Diligenciamiento por campo', 'Campos', companyName, generatedAt,
    [
      { key: 'nivel', header: 'Nivel', width: 18 }, { key: 'seccion', header: 'Sección', width: 24 },
      { key: 'campo', header: 'Campo', width: 34 }, { key: 'aplicables', header: 'Aplicables', width: 15 },
      { key: 'diligenciados', header: 'Diligenciados', width: 17 }, { key: 'faltantes', header: 'Faltantes', width: 15 },
      { key: 'porcentaje_diligenciado', header: 'Diligenciado (%)', width: 19 },
    ],
    analysis.fields,
    { integerKeys: ['aplicables', 'diligenciados', 'faltantes'] },
  ));

  appendReport(workbook, report(
    'Cobertura de uso por módulo', 'Uso plataforma', companyName, generatedAt,
    [
      { key: 'modulo', header: 'Módulo o sección', width: 30 }, { key: 'empleados_aplicables', header: 'Empleados aplicables', width: 21 },
      { key: 'empleados_con_informacion', header: 'Con información', width: 20 },
      { key: 'empleados_sin_informacion', header: 'Sin información', width: 20 },
      { key: 'porcentaje_cobertura', header: 'Cobertura (%)', width: 18 },
    ],
    analysis.modules,
    { integerKeys: ['empleados_aplicables', 'empleados_con_informacion', 'empleados_sin_informacion'] },
  ));

  appendReport(workbook, report(
    'Metodología y alcance', 'Metodología', companyName, generatedAt,
    [{ key: 'concepto', header: 'Concepto', width: 34 }, { key: 'definicion', header: 'Definición aplicada', width: 105 }],
    [
      { concepto: 'Empresa analizada', definicion: `La empresa seleccionada en Empatiq al generar el reporte: ${companyName}.` },
      { concepto: 'Documento vigente', definicion: 'Registro válido, con archivo adjunto y sin fecha de vencimiento cumplida.' },
      { concepto: 'Empleado sin documentos', definicion: 'Empleado con cero documentos vigentes según la regla anterior.' },
      { concepto: 'Contrato vigente', definicion: 'Contrato no terminado, ya iniciado y sin vencimiento cumplido; se considera la última prórroga registrada.' },
      { concepto: 'Soporte de contrato', definicion: 'Existe archivo en el contrato o un documento vigente clasificado como Contratos y Otro sí.' },
      { concepto: 'Diligenciamiento obligatorio', definicion: 'Campos operativos mínimos definidos para identificación, contacto, relación laboral, seguridad social, banco, jornada, documentos y, para activos, contrato.' },
      { concepto: 'Información complementaria', definicion: 'Datos que enriquecen el perfil, pero no elevan por sí solos la prioridad de gestión.' },
      { concepto: 'Datos sensibles voluntarios', definicion: 'Identidad de género, discapacidad, etnia, condición de víctima y otros datos de inclusión no se penalizan en el porcentaje.' },
      { concepto: 'Fecha de corte', definicion: format(generatedAt, 'dd/MM/yyyy HH:mm') },
    ],
  ));

  workbook.Props = {
    Title: 'Informe de gestión de información de empleados',
    Subject: `Empresa seleccionada: ${companyName}`,
    Author: 'Empatiq',
    Company: companyName,
    Comments: 'Generado desde el Centro de Reportes de Empatiq.',
  };
  return workbook;
}

export function exportEmployeeManagementReportToExcel(
  rows: GeneralEmployeeReportRow[],
  companyName: string,
): void {
  const workbook = createEmployeeManagementWorkbook(rows, companyName);
  const companySlug = companyName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
  XLSX.writeFile(workbook, `gestion_informacion_empleados_${companySlug}_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`, {
    bookType: 'xlsx',
    cellDates: true,
    cellStyles: true,
    compression: true,
  });
}
