import { z } from 'zod';

// Day of Week
export type DayOfWeek = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

// Requisition Reason
export type RequisitionReason = 
  | 'renuncia' 
  | 'vacaciones' 
  | 'incapacidad' 
  | 'rotacion'
  | 'movimiento_interno' 
  | 'nuevo_cargo' 
  | 'nuevo_puesto'
  | 'terminacion_contrato' 
  | 'calamidad' 
  | 'licencia';

// Recruitment Type
export type RecruitmentType = 'externa' | 'interna' | 'mixta';

// Requisition Status
// Autoriza Type
export type AutorizaType = 'gerencia_administrativa' | 'gerencia_operaciones';

export const autorizaLabels: Record<AutorizaType, string> = {
  gerencia_administrativa: 'Gerencia Administrativa',
  gerencia_operaciones: 'Gerencia de Operaciones',
};

export type RequisitionStatus = 
  | 'borrador' 
  | 'enviada' 
  | 'en_operaciones' 
  | 'en_rrhh'
  | 'en_juridico' 
  | 'en_seleccion' 
  | 'en_gerencia'
  | 'aprobada' 
  | 'rechazada' 
  | 'cerrada';

// Labels
export const dayOfWeekLabels: Record<DayOfWeek, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

export const requisitionReasonLabels: Record<RequisitionReason, string> = {
  renuncia: 'Renuncia',
  vacaciones: 'Vacaciones',
  incapacidad: 'Incapacidad',
  rotacion: 'Rotación',
  movimiento_interno: 'Movimiento Interno',
  nuevo_cargo: 'Nuevo Cargo',
  nuevo_puesto: 'Nuevo Puesto',
  terminacion_contrato: 'Terminación de Contrato',
  calamidad: 'Calamidad',
  licencia: 'Licencia',
};

export const recruitmentTypeLabels: Record<RecruitmentType, string> = {
  externa: 'Externa',
  interna: 'Interna',
  mixta: 'Mixta',
};

export const requisitionStatusLabels: Record<RequisitionStatus, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  en_operaciones: 'En Operaciones',
  en_rrhh: 'En RRHH',
  en_juridico: 'En Jurídico',
  en_seleccion: 'En Selección',
  en_gerencia: 'En Gerencia',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
  cerrada: 'Cerrada',
};

// Status styling - Multi-tone palette
export const requisitionStatusConfig: Record<RequisitionStatus, { bg: string; text: string; border: string }> = {
  borrador: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  enviada: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/20' },
  en_rrhh: { bg: 'bg-rose/10', text: 'text-rose', border: 'border-rose/20' },
  en_juridico: { bg: 'bg-violet/10', text: 'text-violet', border: 'border-violet/20' },
  en_operaciones: { bg: 'bg-tertiary/10', text: 'text-tertiary', border: 'border-tertiary/20' },
  en_gerencia: { bg: 'bg-secondary/10', text: 'text-secondary', border: 'border-secondary/20' },
  en_seleccion: { bg: 'bg-indigo/10', text: 'text-indigo', border: 'border-indigo/20' },
  aprobada: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  rechazada: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
  cerrada: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

// Timeline step configuration
export interface TimelineStep {
  key: string;
  title: string;
  description: string;
  icon: string;
  statusField: string;
  approvedField?: string;
  dateField?: string;
  approverField?: string;
  observationsField?: string;
}

export const requisitionTimelineSteps: TimelineStep[] = [
  {
    key: 'solicitud',
    title: 'Solicitud',
    description: 'Requisición inicial del personal',
    icon: 'FileText',
    statusField: 'estado_requisicion',
  },
  {
    key: 'rrhh',
    title: 'RRHH',
    description: 'Revisión de recursos humanos',
    icon: 'Users',
    statusField: 'rrhh_aprobado',
    approvedField: 'rrhh_aprobado',
    dateField: 'rrhh_fecha_aprobacion',
    approverField: 'rrhh_quien_aprobo',
    observationsField: 'rrhh_observaciones',
  },
  {
    key: 'juridico',
    title: 'Jurídico',
    description: 'Revisión legal',
    icon: 'Scale',
    statusField: 'juridico_aprobado',
    approvedField: 'juridico_aprobado',
    dateField: 'juridico_fecha_aprobacion',
    approverField: 'juridico_quien_aprobo',
    observationsField: 'juridico_observaciones',
  },
  {
    key: 'operaciones',
    title: 'Operaciones',
    description: 'Aprobación de operaciones',
    icon: 'Settings',
    statusField: 'operaciones_aprobado',
    approvedField: 'operaciones_aprobado',
    dateField: 'operaciones_fecha_aprobacion',
    approverField: 'operaciones_quien_aprobo',
    observationsField: 'operaciones_observaciones',
  },
  {
    key: 'gerencia',
    title: 'Gerencia',
    description: 'Aprobación final',
    icon: 'Crown',
    statusField: 'gerencia_aprobado',
    approvedField: 'gerencia_aprobado',
    dateField: 'gerencia_fecha_aprobacion',
    approverField: 'gerencia_quien_aprobo',
    observationsField: 'gerencia_observaciones',
  },
  {
    key: 'seleccion',
    title: 'Selección',
    description: 'Inicio del proceso de selección',
    icon: 'UserSearch',
    statusField: 'seleccion_aprobado',
    approvedField: 'seleccion_aprobado',
    dateField: 'seleccion_fecha_aprobacion',
    approverField: 'seleccion_quien_aprobo',
    observationsField: 'seleccion_observaciones',
  },
];

// Form schema
export const requisitionFormSchema = z.object({
  fecha_requisicion: z.date().default(() => new Date()),
  fecha_ingreso_estimada: z.date().optional(),
  cantidad_vacantes_requeridas: z.number().min(1).default(1),
  cargo_solicitado: z.string().min(2, 'El cargo es requerido'),
  area_id: z.string().min(1, 'El área es requerida'),
  operation_center_id: z.string().min(1, 'El centro de operación es requerido'),
  cargo_a_reemplazar: z.string().optional(),
  persona_a_reemplazar: z.string().optional(),
  requiere_herramienta_trabajo: z.boolean().default(false),
  horario_trabajo: z.string().optional(),
  dia_descanso_obligatorio: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']).optional(),
  // New fields: salary and contract type
  salario_propuesto: z.number().optional(),
  tipo_contrato_solicitado: z.string().optional(),
  // Turno y condiciones
  turno_trabajo_id: z.string().optional(),
  incluye_alimentacion: z.boolean().default(false),
  incluye_desplazamiento: z.boolean().default(false),
  trayecto_desplazamiento: z.string().optional(),
  motivo_solicitud: z.enum([
    'renuncia', 'vacaciones', 'incapacidad', 'rotacion',
    'movimiento_interno', 'nuevo_cargo', 'nuevo_puesto',
    'terminacion_contrato', 'calamidad', 'licencia'
  ]),
  observaciones_motivo_solicitud: z.string().optional(),
  solicitante_nombre: z.string().min(2, 'El solicitante es requerido'),
  cargo_solicitante: z.string().optional(),
});

export type RequisitionFormData = z.infer<typeof requisitionFormSchema>;

// Approval form schemas
export const operacionesApprovalSchema = z.object({
  operaciones_aprobado: z.boolean(),
  operaciones_aprobado_salario: z.boolean().optional(),
  operaciones_observaciones: z.string().optional(),
});

export const rrhhApprovalSchema = z.object({
  rrhh_asignacion_salarial: z.number().optional(),
  rrhh_condiciones_adicionales: z.string().optional(),
  rrhh_fuente_asignacion_salarial: z.string().optional(),
  rrhh_nivel_politica_salarial: z.string().optional(),
  rrhh_tipo_convocatoria: z.enum(['externa', 'interna', 'mixta']).optional(),
  rrhh_observaciones: z.string().optional(),
  rrhh_aprobado: z.boolean(),
});

export const juridicoApprovalSchema = z.object({
  juridico_tipo_contrato: z.string().optional(),
  juridico_duracion: z.string().optional(),
  juridico_observaciones: z.string().optional(),
  juridico_aprobado: z.boolean(),
});

export const seleccionApprovalSchema = z.object({
  seleccion_fecha_inicio_proceso: z.date().optional(),
  seleccion_observaciones: z.string().optional(),
  seleccion_aprobado: z.boolean(),
});

export const gerenciaApprovalSchema = z.object({
  gerencia_aprobado_salario: z.boolean().optional(),
  gerencia_observaciones: z.string().optional(),
  gerencia_aprobado: z.boolean(),
});

export type OperacionesApprovalData = z.infer<typeof operacionesApprovalSchema>;
export type RRHHApprovalData = z.infer<typeof rrhhApprovalSchema>;
export type JuridicoApprovalData = z.infer<typeof juridicoApprovalSchema>;
export type SeleccionApprovalData = z.infer<typeof seleccionApprovalSchema>;
export type GerenciaApprovalData = z.infer<typeof gerenciaApprovalSchema>;
