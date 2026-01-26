/**
 * Utilidades para validar contratos según la legislación laboral colombiana.
 * Basado en el Código Sustantivo del Trabajo (CST), particularmente el Art. 46.
 */

import { differenceInDays, differenceInMonths, addDays, addYears } from 'date-fns';

export type ExtensionType = 'pactada' | 'automatica';

export interface ContractExtensionData {
  id: string;
  extensionNumber: number;
  startDate: Date;
  endDate: Date;
  extensionType: ExtensionType;
}

export interface ContractData {
  startDate: Date;
  originalEndDate: Date | null;
  extensions: ContractExtensionData[];
  contractType: string;
}

// Constantes de la ley colombiana
export const COLOMBIAN_LABOR_LAW = {
  // Días de preaviso requeridos para no renovar automáticamente
  PREAVISO_DAYS: 30,
  // Duración máxima total de contrato a término fijo en años
  MAX_FIXED_TERM_YEARS: 4, // Se elimina el límite para cumplir con normativa actualizada
  // Número de prórrogas después del cual la duración mínima debe ser 1 año
  MIN_YEAR_AFTER_EXTENSION: 4,
  // Meses en un año
  MONTHS_IN_YEAR: 12,
};

/**
 * Calcula la duración total acumulada del contrato (contrato original + prórrogas)
 */
export function calculateTotalContractDuration(contract: ContractData): {
  totalMonths: number;
  totalDays: number;
  yearsEquivalent: number;
} {
  const currentEndDate = contract.extensions.length > 0
    ? contract.extensions.reduce((latest, ext) => 
        ext.extensionNumber > latest.extensionNumber ? ext : latest
      ).endDate
    : contract.originalEndDate;

  if (!currentEndDate) {
    return { totalMonths: 0, totalDays: 0, yearsEquivalent: 0 };
  }

  const totalMonths = differenceInMonths(currentEndDate, contract.startDate);
  const totalDays = differenceInDays(currentEndDate, contract.startDate);
  const yearsEquivalent = totalMonths / 12;

  return { totalMonths, totalDays, yearsEquivalent };
}

/**
 * Calcula si el contrato original es inferior a un año
 */
export function isOriginalContractUnderOneYear(contract: ContractData): boolean {
  if (!contract.originalEndDate) return false;
  const months = differenceInMonths(contract.originalEndDate, contract.startDate);
  return months < 12;
}

/**
 * Valida si una prórroga propuesta cumple con la ley colombiana
 */
export function validateExtension(
  contract: ContractData,
  proposedEndDate: Date,
  extensionNumber: number,
  currentEndDate: Date
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  // Solo aplica para contratos a término fijo
  if (contract.contractType !== 'fijo') {
    return { isValid: true, errors, warnings, info };
  }

  const isUnderOneYear = isOriginalContractUnderOneYear(contract);
  const extensionDurationMonths = differenceInMonths(proposedEndDate, currentEndDate);

  // Validación: A partir de la 4ta prórroga, duración mínima de 1 año (para contratos < 1 año originalmente)
  if (isUnderOneYear && extensionNumber >= COLOMBIAN_LABOR_LAW.MIN_YEAR_AFTER_EXTENSION) {
    if (extensionDurationMonths < 12) {
      errors.push(
        `Según el Art. 46 del CST, a partir de la ${COLOMBIAN_LABOR_LAW.MIN_YEAR_AFTER_EXTENSION}ª prórroga de un contrato inferior a un año, la duración mínima debe ser de un (1) año.`
      );
    }
    info.push(
      `Esta es la prórroga #${extensionNumber}. Por tratarse de un contrato originalmente inferior a un año, la duración mínima debe ser de 1 año.`
    );
  }

  // Calcular duración total proyectada
  const projectedTotalMonths = differenceInMonths(proposedEndDate, contract.startDate);
  const projectedTotalYears = projectedTotalMonths / 12;

  // Advertencia informativa sobre duración total (sin bloquear)
  if (projectedTotalYears > COLOMBIAN_LABOR_LAW.MAX_FIXED_TERM_YEARS) {
    warnings.push(
      `Nota: La duración total del contrato (${projectedTotalYears.toFixed(1)} años) supera los ${COLOMBIAN_LABOR_LAW.MAX_FIXED_TERM_YEARS} años. Verifique que esto cumpla con su política interna.`
    );
  }

  // Info sobre próxima prórroga
  if (isUnderOneYear && extensionNumber === COLOMBIAN_LABOR_LAW.MIN_YEAR_AFTER_EXTENSION - 1) {
    info.push(
      `Atención: La próxima prórroga (#${extensionNumber + 1}) deberá tener una duración mínima de un año según la ley colombiana.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/**
 * Calcula la fecha límite para enviar preaviso de no renovación
 */
export function calculatePreavisoDeadline(currentEndDate: Date): Date {
  return addDays(currentEndDate, -COLOMBIAN_LABOR_LAW.PREAVISO_DAYS);
}

/**
 * Determina si ya pasó la fecha límite de preaviso (lo que implicaría prórroga automática)
 */
export function isPreavisoDeadlinePassed(currentEndDate: Date): boolean {
  const deadline = calculatePreavisoDeadline(currentEndDate);
  return new Date() > deadline;
}

/**
 * Calcula la fecha de fin para una prórroga automática (mismo término que la última vigencia)
 */
export function calculateAutomaticExtensionEndDate(
  contract: ContractData,
  currentEndDate: Date
): Date {
  // La prórroga automática renueva por el mismo término
  let previousTermMonths: number;

  if (contract.extensions.length === 0) {
    // Primer término: duración del contrato original
    previousTermMonths = contract.originalEndDate 
      ? differenceInMonths(contract.originalEndDate, contract.startDate)
      : 12;
  } else {
    // Buscar la última extensión y calcular su duración
    const sortedExtensions = [...contract.extensions].sort(
      (a, b) => b.extensionNumber - a.extensionNumber
    );
    const lastExtension = sortedExtensions[0];
    previousTermMonths = differenceInMonths(lastExtension.endDate, lastExtension.startDate);
  }

  // Para contratos < 1 año, después de la 3ra prórroga la automática debe ser de 1 año
  const isUnderOneYear = isOriginalContractUnderOneYear(contract);
  const nextExtensionNumber = contract.extensions.length + 1;

  if (isUnderOneYear && nextExtensionNumber >= COLOMBIAN_LABOR_LAW.MIN_YEAR_AFTER_EXTENSION) {
    previousTermMonths = Math.max(previousTermMonths, 12);
  }

  // Calcular nueva fecha de fin
  const newEndDate = new Date(currentEndDate);
  newEndDate.setMonth(newEndDate.getMonth() + previousTermMonths);
  
  return newEndDate;
}

/**
 * Obtiene información resumida sobre el estado legal del contrato
 */
export function getContractLegalStatus(contract: ContractData): {
  isFixedTerm: boolean;
  isUnderOneYear: boolean;
  extensionCount: number;
  requiresMinOneYear: boolean;
  preavisoDeadline: Date | null;
  isPreavisoPassed: boolean;
  totalDurationYears: number;
  canExtend: boolean;
  nextExtensionMinMonths: number;
} {
  const isFixedTerm = contract.contractType === 'fijo';
  const isUnderOneYear = isOriginalContractUnderOneYear(contract);
  const extensionCount = contract.extensions.length;
  const nextExtensionNumber = extensionCount + 1;
  const requiresMinOneYear = isFixedTerm && isUnderOneYear && 
    nextExtensionNumber >= COLOMBIAN_LABOR_LAW.MIN_YEAR_AFTER_EXTENSION;

  const currentEndDate = contract.extensions.length > 0
    ? contract.extensions.reduce((latest, ext) => 
        ext.extensionNumber > latest.extensionNumber ? ext : latest
      ).endDate
    : contract.originalEndDate;

  const preavisoDeadline = currentEndDate ? calculatePreavisoDeadline(currentEndDate) : null;
  const isPreavisoPassed = currentEndDate ? isPreavisoDeadlinePassed(currentEndDate) : false;
  
  const { yearsEquivalent } = calculateTotalContractDuration(contract);

  // Calcular meses mínimos para próxima prórroga
  let nextExtensionMinMonths = 1;
  if (requiresMinOneYear) {
    nextExtensionMinMonths = 12;
  }

  return {
    isFixedTerm,
    isUnderOneYear,
    extensionCount,
    requiresMinOneYear,
    preavisoDeadline,
    isPreavisoPassed,
    totalDurationYears: yearsEquivalent,
    canExtend: true, // Se quita el límite estricto de 4 años
    nextExtensionMinMonths,
  };
}

export const extensionTypeLabels: Record<ExtensionType, string> = {
  pactada: 'Prórroga Pactada',
  automatica: 'Prórroga Automática',
};

export const extensionTypeDescriptions: Record<ExtensionType, string> = {
  pactada: 'Las partes acuerdan por escrito extender el contrato.',
  automatica: 'El contrato se renueva por falta de preaviso de 30 días antes del vencimiento.',
};
