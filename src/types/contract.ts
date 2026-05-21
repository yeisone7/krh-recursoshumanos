import { z } from 'zod';
import { ExtensionType } from '@/lib/colombianContractLaw';

// Contract Type
export type ContractType = 'indefinite' | 'fixed' | 'work_labor' | 'apprenticeship' | 'services';

// Contract Status
export type ContractStatus = 'active' | 'expiring' | 'expired' | 'terminated';

// Extension (Prórroga) interface - Updated for Colombian labor law
export interface ContractExtension {
  id: string;
  extensionNumber: number;
  startDate: Date;
  endDate: Date;
  extensionType: ExtensionType; // 'pactada' | 'automatica'
  documentUrl?: string;
  createdAt: Date;
  notes?: string;
}

// Contract Schema for validation
export const contractFormSchema = z.object({
  // Employee
  employeeId: z.string({
    required_error: 'Seleccione el empleado',
  }),
  
  // Contract type - dynamic from catalog
  contractType: z.string({
    required_error: 'Seleccione el tipo de contrato',
  }),
  
  // Dates
  startDate: z.date({
    required_error: 'Seleccione la fecha de inicio',
  }),
  endDate: z.date().optional(),
  
  // Salary and compensation
  salary: z.string().min(1, 'El salario es requerido'),
  salaryType: z.enum(['monthly', 'integral'], {
    required_error: 'Seleccione el tipo de salario',
  }).default('monthly'),
  transportAllowance: z.boolean().default(true),
  
  // Work details
  operationCenter: z.string().optional(),
  position: z.string().optional(),
  area: z.string().optional(),
  workSchedule: z.string().optional(),
  workCity: z.string().optional(),
  workAddress: z.string().optional(),
  
  // Trial period
  trialPeriodDays: z.number().min(0).max(60).optional(),
  
  // Additional clauses
  hasNonCompeteClause: z.boolean().default(false),
  hasConfidentialityClause: z.boolean().default(true),
  specialClauses: z.string().optional(),
  
  // Work/Labor contract specific
  workLaborDescription: z.string().optional(),
  
  // Document
  documentUrl: z.string().optional(),
  
  // Notes
  notes: z.string().max(1000).optional(),
});

export type ContractFormData = z.infer<typeof contractFormSchema>;

// Extension Schema - Updated for Colombian labor law (Art. 46 CST)
export const extensionFormSchema = z.object({
  startDate: z.date({
    required_error: 'Seleccione la fecha de inicio',
  }),
  endDate: z.date({
    required_error: 'Seleccione la fecha de fin',
  }),
  extensionType: z.enum(['pactada', 'automatica'], {
    required_error: 'Seleccione el tipo de prórroga',
  }).default('pactada'),
  notes: z.string().max(500).optional(),
}).refine((data) => data.endDate > data.startDate, {
  message: 'La fecha de fin debe ser posterior a la fecha de inicio',
  path: ['endDate'],
});

export type ExtensionFormData = z.infer<typeof extensionFormSchema>;

// Full Contract interface
export interface Contract {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocument?: string;
  employeeDocumentType?: string;
  contractNumber?: string;
  contractType: ContractType;
  startDate: Date;
  originalEndDate: Date | null;
  currentEndDate: Date | null;
  salary: number;
  salaryType: 'monthly' | 'integral';
  transportAllowance: boolean;
  operationCenter: string;
  position: string;
  area: string;
  workSchedule?: string;
  trialPeriodDays?: number;
  hasNonCompeteClause: boolean;
  hasConfidentialityClause: boolean;
  extensions: ContractExtension[];
  status: ContractStatus;
  documentUrl?: string;
  notes?: string;
  // Approval fields
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Labels
export const contractTypeLabels: Record<ContractType, string> = {
  indefinite: 'Indefinido',
  fixed: 'Término Fijo',
  work_labor: 'Obra o Labor',
  apprenticeship: 'Aprendizaje',
  services: 'Prestación de Servicios',
};

export const contractStatusLabels: Record<ContractStatus, string> = {
  active: 'Vigente',
  expiring: 'Por Vencer',
  expired: 'Vencido',
  terminated: 'Terminado',
};

// Utility functions
export function calculateDaysRemaining(endDate: Date | null): number | null {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getContractStatus(contract: { contractType: ContractType; currentEndDate: Date | null; status?: ContractStatus }): ContractStatus {
  if (contract.status === 'terminated') return 'terminated';

  // Indefinite contracts are always active unless terminated
  if (contract.contractType === 'indefinite') {
    return 'active';
  }
  
  if (!contract.currentEndDate) return 'active';
  
  const daysRemaining = calculateDaysRemaining(contract.currentEndDate);
  if (daysRemaining === null) return 'active';
  
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring';
  return 'active';
}

export function getCurrentEndDate(originalEndDate: Date | null, extensions: ContractExtension[]): Date | null {
  if (extensions.length === 0) return originalEndDate;
  
  // Get the latest extension by extension number
  const latestExtension = extensions.reduce((latest, current) => 
    current.extensionNumber > latest.extensionNumber ? current : latest
  );
  
  return latestExtension.endDate;
}
