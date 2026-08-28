import type { ReportColumn } from '@/lib/reportExporter';

export type GeneralEmployeeReportValue = string | number | boolean | null;
export type GeneralEmployeeReportRow = Record<string, GeneralEmployeeReportValue> & {
  employee_id: string;
  documento: string;
  nombre_completo: string;
  estado: string;
  centro: string;
  area: string;
  sexo_biologico: string;
  tipo_discapacidad: string;
  tipo_contrato: string;
};

export type GeneralEmployeeColumnCategory =
  | 'identificacion'
  | 'demografia'
  | 'diversidad'
  | 'contacto'
  | 'laboral'
  | 'contrato'
  | 'seguridad_social'
  | 'bancaria'
  | 'jornada'
  | 'familia'
  | 'soportes';

export interface GeneralEmployeeColumn extends ReportColumn {
  category: GeneralEmployeeColumnCategory;
}

export const GENERAL_EMPLOYEE_CATEGORY_LABELS: Record<GeneralEmployeeColumnCategory, string> = {
  identificacion: 'Identificación',
  demografia: 'Demografía',
  diversidad: 'Diversidad e inclusión',
  contacto: 'Contacto',
  laboral: 'Información laboral',
  contrato: 'Contrato vigente',
  seguridad_social: 'Seguridad social',
  bancaria: 'Información bancaria',
  jornada: 'Jornada y horario',
  familia: 'Familia y parientes',
  soportes: 'Documentos y soportes',
};

const column = (
  category: GeneralEmployeeColumnCategory,
  key: string,
  header: string,
  width = 18,
): GeneralEmployeeColumn => ({ category, key, header, width });

export const GENERAL_EMPLOYEE_COLUMNS: GeneralEmployeeColumn[] = [
  column('identificacion', 'tipo_identificacion', 'Tipo de identificación', 22),
  column('identificacion', 'documento', 'Número de documento', 20),
  column('identificacion', 'ciudad_expedicion', 'Ciudad de expedición', 20),
  column('identificacion', 'fecha_expedicion', 'Fecha de expedición', 18),
  column('identificacion', 'primer_nombre', 'Primer nombre'),
  column('identificacion', 'segundo_nombre', 'Segundo nombre'),
  column('identificacion', 'primer_apellido', 'Primer apellido'),
  column('identificacion', 'segundo_apellido', 'Segundo apellido'),
  column('identificacion', 'nombre_completo', 'Nombre completo', 28),

  column('demografia', 'pais_nacimiento', 'País de nacimiento', 20),
  column('demografia', 'departamento_nacimiento', 'Departamento de nacimiento', 24),
  column('demografia', 'ciudad_nacimiento', 'Ciudad de nacimiento', 20),
  column('demografia', 'fecha_nacimiento', 'Fecha de nacimiento', 18),
  column('demografia', 'edad', 'Edad', 10),
  column('demografia', 'sexo_biologico', 'Sexo biológico', 16),
  column('demografia', 'identidad_genero', 'Identidad de género', 20),
  column('demografia', 'grupo_sanguineo', 'Grupo sanguíneo', 16),
  column('demografia', 'estado_civil', 'Estado civil', 16),
  column('demografia', 'nivel_educativo', 'Nivel educativo', 22),
  column('demografia', 'profesion', 'Profesión', 24),

  column('diversidad', 'primer_empleo', 'Primer empleo', 14),
  column('diversidad', 'cabeza_hogar', 'Cabeza de hogar', 16),
  column('diversidad', 'tipo_discapacidad', 'Tipo de discapacidad', 24),
  column('diversidad', 'proceso_exclusivo_pcd', 'Proceso exclusivo PcD', 20),
  column('diversidad', 'grupo_etnico', 'Grupo étnico', 18),
  column('diversidad', 'victima_conflicto', 'Víctima del conflicto', 19),
  column('diversidad', 'desmovilizado', 'Persona desmovilizada', 20),

  column('contacto', 'departamento_residencia', 'Departamento de residencia', 24),
  column('contacto', 'ciudad_residencia', 'Ciudad de residencia', 20),
  column('contacto', 'direccion_residencia', 'Dirección de residencia', 30),
  column('contacto', 'barrio_residencia', 'Barrio de residencia', 20),
  column('contacto', 'correo_corporativo', 'Correo corporativo', 28),
  column('contacto', 'correo_personal', 'Correo personal', 28),
  column('contacto', 'telefono', 'Teléfono', 16),
  column('contacto', 'celular', 'Celular', 16),
  column('contacto', 'contacto_emergencia', 'Contacto de emergencia', 24),
  column('contacto', 'telefono_emergencia', 'Teléfono de emergencia', 20),
  column('contacto', 'parentesco_emergencia', 'Parentesco de emergencia', 22),
  column('contacto', 'vencimiento_carta_residencia', 'Vencimiento carta residencia', 25),

  column('laboral', 'estado', 'Estado del empleado', 18),
  column('laboral', 'activo', 'Empleado activo', 15),
  column('laboral', 'ciclo_laboral', 'Ciclo laboral', 14),
  column('laboral', 'inicio_ciclo', 'Inicio del ciclo', 16),
  column('laboral', 'fin_ciclo', 'Fin del ciclo', 16),
  column('laboral', 'centro', 'Centro principal', 24),
  column('laboral', 'centros_adicionales', 'Centros adicionales', 30),
  column('laboral', 'centro_costos', 'Centro de costos', 18),
  column('laboral', 'area', 'Área', 22),
  column('laboral', 'cargo', 'Cargo', 26),
  column('laboral', 'ciudad_trabajo', 'Ciudad de trabajo', 20),
  column('laboral', 'fecha_ingreso', 'Fecha de ingreso', 17),
  column('laboral', 'fecha_retiro', 'Fecha de retiro', 17),
  column('laboral', 'tipo_vinculacion', 'Tipo de vinculación', 20),
  column('laboral', 'observaciones_laborales', 'Observaciones laborales', 35),

  column('contrato', 'numero_contrato', 'Número de contrato', 20),
  column('contrato', 'tipo_contrato', 'Tipo de contrato', 20),
  column('contrato', 'inicio_contrato', 'Inicio del contrato', 18),
  column('contrato', 'fin_contrato', 'Fin del contrato', 18),
  column('contrato', 'salario', 'Salario', 16),
  column('contrato', 'tipo_salario', 'Tipo de salario', 18),
  column('contrato', 'auxilio_transporte', 'Auxilio de transporte', 20),
  column('contrato', 'otros_auxilios', 'Otros auxilios', 18),
  column('contrato', 'periodo_prueba_dias', 'Días período de prueba', 22),
  column('contrato', 'fin_periodo_prueba', 'Fin período de prueba', 20),
  column('contrato', 'direccion_trabajo_contrato', 'Dirección de trabajo', 28),
  column('contrato', 'ciudad_trabajo_contrato', 'Ciudad del contrato', 20),
  column('contrato', 'labor_contratada', 'Labor contratada', 32),
  column('contrato', 'clausula_confidencialidad', 'Cláusula de confidencialidad', 25),
  column('contrato', 'clausula_no_competencia', 'Cláusula de no competencia', 24),
  column('contrato', 'clausulas_especiales', 'Cláusulas especiales', 32),
  column('contrato', 'contrato_aprobado', 'Contrato aprobado', 18),

  column('seguridad_social', 'nivel_riesgo', 'Nivel de riesgo', 16),
  column('seguridad_social', 'eps', 'EPS', 22),
  column('seguridad_social', 'afp', 'AFP', 22),
  column('seguridad_social', 'arl', 'ARL', 22),
  column('seguridad_social', 'ccf', 'Caja de compensación', 24),
  column('seguridad_social', 'afc', 'AFC', 22),
  column('seguridad_social', 'ips', 'IPS', 22),

  column('bancaria', 'banco', 'Banco', 22),
  column('bancaria', 'tipo_cuenta', 'Tipo de cuenta', 18),
  column('bancaria', 'numero_cuenta', 'Número de cuenta', 22),
  column('bancaria', 'cuenta_registrada', 'Cuenta registrada', 18),

  column('jornada', 'tipo_nomina', 'Tipo de nómina', 17),
  column('jornada', 'horario_oficina', 'Horario de oficina', 18),
  column('jornada', 'dia_descanso', 'Día de descanso', 18),
  column('jornada', 'modalidad_tiempo', 'Modalidad de tiempo', 20),
  column('jornada', 'horario_o_ciclo', 'Horario o ciclo', 24),
  column('jornada', 'inicio_modalidad', 'Inicio de modalidad', 20),
  column('jornada', 'notas_modalidad', 'Notas de modalidad', 30),

  column('familia', 'conyuge', 'Cónyuge o pareja', 24),
  column('familia', 'sexo_conyuge', 'Sexo del cónyuge', 18),
  column('familia', 'nacimiento_conyuge', 'Nacimiento del cónyuge', 22),
  column('familia', 'conyuge_trabaja', 'Cónyuge trabaja', 18),
  column('familia', 'numero_hijos', 'Número de hijos', 16),
  column('familia', 'numero_parientes', 'Parientes registrados', 20),
  column('familia', 'detalle_parientes', 'Detalle de parientes', 45),

  column('soportes', 'numero_documentos', 'Documentos vigentes', 20),
  column('soportes', 'detalle_documentos', 'Detalle de documentos', 45),
  column('soportes', 'numero_certificaciones', 'Certificaciones vigentes', 22),
  column('soportes', 'detalle_certificaciones', 'Detalle de certificaciones', 45),
  column('soportes', 'numero_vacunas', 'Vacunas registradas', 18),
  column('soportes', 'detalle_vacunas', 'Detalle de vacunas', 45),
];

export const GENERAL_EMPLOYEE_DEFAULT_COLUMN_KEYS = GENERAL_EMPLOYEE_COLUMNS.map((item) => item.key);

export interface GeneralEmployeeFilters {
  search: string;
  status: string;
  center: string;
  area: string;
  gender: string;
  disability: string;
  contractType: string;
}

export const EMPTY_GENERAL_EMPLOYEE_FILTERS: GeneralEmployeeFilters = {
  search: '',
  status: 'all',
  center: 'all',
  area: 'all',
  gender: 'all',
  disability: 'all',
  contractType: 'all',
};

const normalize = (value: GeneralEmployeeReportValue) => String(value ?? '').trim().toLocaleLowerCase('es');

export function filterGeneralEmployeeRows(
  rows: GeneralEmployeeReportRow[],
  filters: GeneralEmployeeFilters,
): GeneralEmployeeReportRow[] {
  const search = filters.search.trim().toLocaleLowerCase('es');

  return rows.filter((row) => {
    const matchesSearch = !search || [
      row.documento,
      row.nombre_completo,
      row.centro,
      row.area,
      row.cargo,
      row.correo_corporativo,
      row.correo_personal,
    ].some((value) => normalize(value).includes(search));
    const matchesStatus = filters.status === 'all' || normalize(row.estado) === normalize(filters.status);
    const matchesCenter = filters.center === 'all'
      || normalize(row.centro) === normalize(filters.center)
      || normalize(row.centros_adicionales).split('; ').includes(normalize(filters.center));
    const matchesArea = filters.area === 'all' || normalize(row.area) === normalize(filters.area);
    const matchesGender = filters.gender === 'all' || normalize(row.sexo_biologico) === normalize(filters.gender);
    const hasDisability = !['', '-', 'ninguna', 'no'].includes(normalize(row.tipo_discapacidad));
    const matchesDisability = filters.disability === 'all'
      || (filters.disability === 'yes' ? hasDisability : !hasDisability);
    const matchesContract = filters.contractType === 'all'
      || normalize(row.tipo_contrato) === normalize(filters.contractType);

    return matchesSearch && matchesStatus && matchesCenter && matchesArea
      && matchesGender && matchesDisability && matchesContract;
  });
}

export function getGeneralEmployeeFilterOptions(rows: GeneralEmployeeReportRow[], key: string): string[] {
  return Array.from(new Set(rows
    .flatMap((row) => key === 'centro'
      ? [row.centro, ...String(row.centros_adicionales || '').split('; ')]
      : [row[key]])
    .map((value) => String(value || '').trim())
    .filter((value) => value && value !== '-')))
    .sort((left, right) => left.localeCompare(right, 'es'));
}

export function selectedGeneralEmployeeColumns(selectedKeys: Set<string>): GeneralEmployeeColumn[] {
  return GENERAL_EMPLOYEE_COLUMNS.filter((item) => selectedKeys.has(item.key));
}
