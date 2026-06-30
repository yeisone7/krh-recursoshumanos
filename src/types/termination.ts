import { z } from 'zod';

// Termination types enum
export type TerminationType = 
  | 'mutuo_acuerdo'      // 01 - Terminación por mutuo acuerdo
  | 'preaviso'           // 02 - Aviso previo a terminación (para fijo)
  | 'periodo_prueba'     // 03 - Terminación por periodo de prueba
  | 'obra_labor'         // 04 - Terminación por obra labor
  | 'sin_justa_causa'    // 05 - Terminación sin justa causa
  | 'renuncia'           // 07 - Aceptación de renuncia
  | 'traslado';          // 08 - Retiro por traslado a otra empresa

// Termination document types enum
export type TerminationDocumentType = 
  | 'acta_terminacion'   // Documento principal de terminación
  | 'preaviso'           // 02 - Aviso previo
  | 'notificacion_aportes' // 06 - Notificación estado de aportes
  | 'aceptacion_renuncia'  // 07 - Aceptación de renuncia
  | 'certificado_laboral'  // 08 - Certificado laboral
  | 'paz_y_salvo'          // 09 - Paz y salvo
  | 'examen_egreso'        // 10 - Examen de egreso
  | 'retiro_cesantias';    // 11 - Retiro de cesantías

// Labels for termination types
export const terminationTypeLabels: Record<TerminationType, string> = {
  mutuo_acuerdo: 'Mutuo Acuerdo',
  preaviso: 'Preaviso / No renovación',
  periodo_prueba: 'Periodo de Prueba',
  obra_labor: 'Finalización Obra o Labor',
  sin_justa_causa: 'Sin Justa Causa',
  renuncia: 'Renuncia Voluntaria',
  traslado: 'Traslado a Otra Empresa',
};

// Labels for document types
export const terminationDocumentLabels: Record<TerminationDocumentType, string> = {
  acta_terminacion: 'Acta de Terminación',
  preaviso: 'Aviso Previo',
  notificacion_aportes: 'Notificación de Aportes S.S.',
  aceptacion_renuncia: 'Aceptación de Renuncia',
  certificado_laboral: 'Certificado Laboral',
  paz_y_salvo: 'Paz y Salvo',
  examen_egreso: 'Examen de Egreso',
  retiro_cesantias: 'Autorización Retiro Cesantías',
};

// Document descriptions
export const terminationDocumentDescriptions: Record<TerminationDocumentType, string> = {
  acta_terminacion: 'Documento formal que oficializa la terminación del contrato según el tipo aplicable',
  preaviso: 'Comunicación anticipada de no renovación del contrato (Art. 46 C.S.T.)',
  notificacion_aportes: 'Constancia del estado de pagos a seguridad social y parafiscales',
  aceptacion_renuncia: 'Aceptación formal de la carta de renuncia del trabajador',
  certificado_laboral: 'Certificación del tiempo laborado, cargo y funciones',
  paz_y_salvo: 'Declaración de cumplimiento de obligaciones recíprocas',
  examen_egreso: 'Autorización para realizar el examen médico ocupacional de retiro',
  retiro_cesantias: 'Autorización para retiro de cesantías del fondo respectivo',
};

// Define which documents are required for each termination type
export const requiredDocumentsByType: Record<TerminationType, TerminationDocumentType[]> = {
  mutuo_acuerdo: [
    'acta_terminacion',
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
  preaviso: [
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
  periodo_prueba: [
    'acta_terminacion',
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
  obra_labor: [
    'acta_terminacion',
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
  sin_justa_causa: [
    'acta_terminacion',
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
  renuncia: [
    'aceptacion_renuncia',
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
  traslado: [
    'acta_terminacion',
    'notificacion_aportes',
    'certificado_laboral',
    'paz_y_salvo',
    'examen_egreso',
    'retiro_cesantias',
  ],
};

// Termination document interface
export interface TerminationDocument {
  id: string;
  terminationId: string;
  documentType: TerminationDocumentType;
  isRequired: boolean;
  isGenerated: boolean;
  isSigned: boolean;
  documentData?: Record<string, any>;
  documentUrl?: string;
  signedAt?: Date;
  signedBy?: string;
  generatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Employee termination process interface
export interface EmployeeTermination {
  id: string;
  contractId: string | null;
  employeeId: string;
  companyId: string;
  terminationType: TerminationType;
  terminationDate: Date;
  effectiveDate: Date;
  reason?: string;
  resignationDate?: Date;
  isCompleted: boolean;
  completedAt?: Date;
  documents: TerminationDocument[];
  createdAt: Date;
  updatedAt: Date;
}

// Form schema for initiating termination
export const initiateTerminationSchema = z.object({
  terminationType: z.enum([
    'mutuo_acuerdo',
    'preaviso',
    'periodo_prueba',
    'obra_labor',
    'sin_justa_causa',
    'renuncia',
    'traslado',
  ] as const, {
    required_error: 'Seleccione el tipo de terminación',
  }),
  terminationDate: z.date({
    required_error: 'La fecha de terminación es requerida',
  }),
  effectiveDate: z.date({
    required_error: 'La fecha efectiva es requerida',
  }),
  reason: z.string().optional(),
  resignationDate: z.date().optional(),
});

export type InitiateTerminationFormData = z.infer<typeof initiateTerminationSchema>;

// Data structure for PDF generation
export interface TerminationDocumentData {
  // Company info
  companyName: string;
  companyNit: string;
  companyAddress?: string;
  companyCity?: string;
  companyPhone?: string;
  
  // Employee info
  employeeFullName: string;
  employeeDocumentType: string;
  employeeDocumentNumber: string;
  employeePosition: string;
  employeeArea?: string;
  employeeOperationCenter?: string;
  
  // Contract info
  contractType: string;
  contractStartDate: Date;
  contractEndDate?: Date;
  salary: number;
  
  // Termination info
  terminationType: TerminationType;
  terminationDate: Date;
  effectiveDate: Date;
  reason?: string;
  
  // Resignation specific
  resignationDate?: Date;
  
  // HR Manager info
  hrManagerName: string;
  hrManagerPosition: string;
  representativeSignatureUrl?: string;
  representativeSignatureDataUrl?: string;
  folio?: string;
  archiveNumber?: string;
  
  // Document date
  documentDate: Date;
  documentCity: string;
}

// Checklist completion status
export interface TerminationChecklist {
  totalDocuments: number;
  completedDocuments: number;
  requiredDocuments: number;
  completedRequired: number;
  isComplete: boolean;
  canFinalize: boolean;
  documents: {
    type: TerminationDocumentType;
    label: string;
    description: string;
    isRequired: boolean;
    isGenerated: boolean;
    isSigned: boolean;
  }[];
}

// Helper function to calculate checklist status
export function calculateChecklistStatus(
  terminationType: TerminationType,
  documents: TerminationDocument[]
): TerminationChecklist {
  const requiredTypes = requiredDocumentsByType[terminationType];
  
  const checklistItems = requiredTypes.map((type) => {
    const doc = documents.find((d) => d.documentType === type);
    return {
      type,
      label: terminationDocumentLabels[type],
      description: terminationDocumentDescriptions[type],
      isRequired: true,
      isGenerated: doc?.isGenerated ?? false,
      isSigned: doc?.isSigned ?? false,
    };
  });

  const totalDocuments = checklistItems.length;
  const completedDocuments = checklistItems.filter((d) => d.isGenerated).length;
  const requiredDocuments = checklistItems.filter((d) => d.isRequired).length;
  const completedRequired = checklistItems.filter((d) => d.isRequired && d.isGenerated).length;
  
  return {
    totalDocuments,
    completedDocuments,
    requiredDocuments,
    completedRequired,
    isComplete: completedDocuments === totalDocuments,
    canFinalize: completedRequired === requiredDocuments,
    documents: checklistItems,
  };
}
