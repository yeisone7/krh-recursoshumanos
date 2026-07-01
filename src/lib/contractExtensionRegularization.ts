import { addDays, addMonths, format } from 'date-fns';
import type { ContractExtension } from '@/types/contract';
import { calculateInclusiveMonthSpan } from '@/lib/dateOnly';

export const AUTOMATIC_EXTENSION_REGULARIZATION_REASON =
  'Regularizacion por prorroga automatica generada por preaviso vencido.';

export interface RegularizationContractInput {
  id: string;
  contractType: string;
  isApproved?: boolean | null;
  isEmployeeActive?: boolean | null;
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

function isPreavisoDeadlinePassed(endDate: Date, today: Date): boolean {
  return startOfDateOnly(today) > startOfDateOnly(addDays(endDate, -30));
}

function isOriginalContractUnderOneYear(contract: RegularizationContractInput): boolean {
  if (!contract.originalEndDate) return false;
  return calculateInclusiveMonthSpan(contract.startDate, contract.originalEndDate) < 12;
}

function calculateNextAutomaticExtensionEndDate(
  contract: RegularizationContractInput,
  nextExtensionNumber: number,
  previousStartDate: Date,
  previousEndDate: Date
): Date {
  const minimumMonths = isOriginalContractUnderOneYear(contract) && nextExtensionNumber >= 4 ? 12 : 1;
  const previousMonths = calculateInclusiveMonthSpan(previousStartDate, previousEndDate);
  const months = Math.max(previousMonths, minimumMonths);
  const nextStartDate = addDays(previousEndDate, 1);

  return addDays(addMonths(nextStartDate, months), -1);
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

  if (contract.isApproved !== true) {
    return { eligible: false, reason: 'El contrato no esta aprobado.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  if (contract.isEmployeeActive === false) {
    return { eligible: false, reason: 'El empleado no esta activo.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  if (!isFixedTerm) {
    return { eligible: false, reason: 'Solo aplica para contratos a termino fijo.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  if (!latestEndDate) {
    return { eligible: false, reason: 'El contrato no tiene una fecha de vencimiento base.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  const latestStartDate = latestExtension?.startDate || contract.startDate;

  const todayOnly = startOfDateOnly(today);
  let cursorEndDate = startOfDateOnly(latestEndDate);
  let previousStartDate = startOfDateOnly(latestStartDate);

  if (!isPreavisoDeadlinePassed(cursorEndDate, todayOnly)) {
    return { eligible: false, reason: 'La fecha limite de preaviso aun no ha vencido.', latestEndDate, latestExtensionNumber, extensions: [] };
  }

  const previews: AutomaticExtensionPreview[] = [];
  let nextExtensionNumber = latestExtensionNumber + 1;

  while (isPreavisoDeadlinePassed(cursorEndDate, todayOnly)) {
    const startDate = addDays(cursorEndDate, 1);
    const endDate = calculateNextAutomaticExtensionEndDate(
      contract,
      nextExtensionNumber,
      previousStartDate,
      cursorEndDate
    );

    previews.push({
      contractId: contract.id,
      extensionNumber: nextExtensionNumber,
      startDate,
      endDate,
      reason: AUTOMATIC_EXTENSION_REGULARIZATION_REASON,
    });

    previousStartDate = startOfDateOnly(startDate);
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
