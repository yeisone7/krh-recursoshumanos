import { addDays, addYears, format } from 'date-fns';
import type { ContractExtension } from '@/types/contract';

export const AUTOMATIC_EXTENSION_REGULARIZATION_REASON =
  'Regularizacion historica por renovacion automatica anual sin preaviso.';

export interface RegularizationContractInput {
  id: string;
  contractType: string;
  isTerminated?: boolean | null;
  startDate: Date;
  originalEndDate: Date | null;
  currentEndDate: Date | null;
  extensions: Pick<ContractExtension, 'extensionNumber' | 'startDate' | 'endDate'>[];
}

export interface AutomaticExtensionPreview {
  contractId: string;
  extensionNumber: number;
  startDate: Date;
  endDate: Date;
  reason: string;
}

export interface RegularizationPlan {
  eligible: boolean;
  reason: string | null;
  latestEndDate: Date | null;
  latestExtensionNumber: number;
  extensions: AutomaticExtensionPreview[];
}

function startOfDateOnly(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizeContractType(type: string): string {
  return type.toLowerCase();
}

export function sortContractExtensions<T extends { extensionNumber?: number; endDate: Date }>(extensions: T[]): T[] {
  return [...extensions].sort((a, b) => {
    const numberA = Number(a.extensionNumber || 0);
    const numberB = Number(b.extensionNumber || 0);

    if (numberA !== numberB) return numberA - numberB;

    return a.endDate.getTime() - b.endDate.getTime();
  });
}

export function calculateAutomaticExtensionRegularizationPlan(
  contract: RegularizationContractInput,
  today: Date = new Date()
): RegularizationPlan {
  const normalizedType = normalizeContractType(contract.contractType);
  const isFixedTerm = normalizedType === 'fixed' || normalizedType === 'fijo' || normalizedType.includes('fijo');
  const sortedExtensions = sortContractExtensions(contract.extensions);
  const latestExtension = sortedExtensions[sortedExtensions.length - 1];
  const latestEndDate = latestExtension?.endDate || contract.currentEndDate || contract.originalEndDate;
  const latestExtensionNumber = Number(latestExtension?.extensionNumber || sortedExtensions.length || 0);

  if (contract.isTerminated) {
    return { eligible: false, reason: 'El contrato esta terminado.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  if (!isFixedTerm) {
    return { eligible: false, reason: 'Solo aplica para contratos a termino fijo.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  if (latestExtensionNumber < 3) {
    return { eligible: false, reason: 'El contrato aun no tiene tres prorrogas registradas.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  if (!latestEndDate) {
    return { eligible: false, reason: 'El contrato no tiene una fecha de vencimiento base.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  const todayOnly = startOfDateOnly(today);
  let cursorEndDate = startOfDateOnly(latestEndDate);

  if (cursorEndDate >= todayOnly) {
    return { eligible: false, reason: 'La vigencia actual ya cubre la fecha de hoy.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  const previews: AutomaticExtensionPreview[] = [];
  let nextExtensionNumber = latestExtensionNumber + 1;

  while (cursorEndDate < todayOnly) {
    const startDate = addDays(cursorEndDate, 1);
    const endDate = addYears(cursorEndDate, 1);

    previews.push({
      contractId: contract.id,
      extensionNumber: nextExtensionNumber,
      startDate,
      endDate,
      reason: AUTOMATIC_EXTENSION_REGULARIZATION_REASON,
    });

    cursorEndDate = startOfDateOnly(endDate);
    nextExtensionNumber += 1;
  }

  return {
    eligible: previews.length > 0,
    reason: previews.length > 0 ? null : 'No hay prorrogas pendientes por regularizar.',
    latestEndDate,
    latestExtensionNumber,
    extensions: previews,
  };
}

export function formatDateForSupabase(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
