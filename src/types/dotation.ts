import { z } from 'zod';

// Dotation Item Type (what is being delivered)
export type DotationItemType = 
  | 'shirt' 
  | 'pants' 
  | 'shoes' 
  | 'jacket' 
  | 'vest' 
  | 'helmet' 
  | 'gloves' 
  | 'glasses' 
  | 'boots' 
  | 'uniform_set'
  | 'safety_equipment'
  | 'other';

// Dotation Status
export type DotationStatus = 'pending' | 'delivered' | 'expiring' | 'expired';

// Dotation Delivery Record
export interface DotationDelivery {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  operationCenter: string;
  itemType: DotationItemType;
  itemName: string;
  quantity: number;
  size?: string;
  deliveryDate: Date;
  expirationDate: Date;
  status: DotationStatus;
  deliveredBy: string;
  receivedSignature?: string;
  documentUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Dotation Alert
export interface DotationAlert {
  id: string;
  deliveryId: string;
  employeeId: string;
  employeeName: string;
  itemName: string;
  expirationDate: Date;
  daysRemaining: number;
  level: 'info' | 'warning' | 'critical';
}

// Schema for new delivery
export const dotationDeliverySchema = z.object({
  employeeId: z.string({
    required_error: 'Seleccione el empleado',
  }),
  itemType: z.enum([
    'shirt', 'pants', 'shoes', 'jacket', 'vest', 
    'helmet', 'gloves', 'glasses', 'boots', 'uniform_set',
    'safety_equipment', 'other'
  ], {
    required_error: 'Seleccione el tipo de artículo',
  }),
  itemName: z.string().min(2, 'El nombre del artículo es requerido'),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1').default(1),
  size: z.string().optional(),
  deliveryDate: z.date({
    required_error: 'Seleccione la fecha de entrega',
  }),
  expirationDate: z.date({
    required_error: 'Seleccione la fecha de vencimiento',
  }),
  deliveredBy: z.string().min(2, 'Indique quién entrega'),
  notes: z.string().max(500).optional(),
}).refine((data) => data.expirationDate > data.deliveryDate, {
  message: 'La fecha de vencimiento debe ser posterior a la fecha de entrega',
  path: ['expirationDate'],
});

export type DotationDeliveryFormData = z.infer<typeof dotationDeliverySchema>;

// Labels for item types
export const dotationItemTypeLabels: Record<DotationItemType, string> = {
  shirt: 'Camisa',
  pants: 'Pantalón',
  shoes: 'Zapatos',
  jacket: 'Chaqueta',
  vest: 'Chaleco',
  helmet: 'Casco',
  gloves: 'Guantes',
  glasses: 'Gafas de Seguridad',
  boots: 'Botas',
  uniform_set: 'Uniforme Completo',
  safety_equipment: 'Equipo de Seguridad',
  other: 'Otro',
};

export const dotationStatusLabels: Record<DotationStatus, string> = {
  pending: 'Pendiente',
  delivered: 'Entregado',
  expiring: 'Por Vencer',
  expired: 'Vencido',
};

// Utility functions
export function calculateDaysRemaining(expirationDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDotationStatus(delivery: { deliveryDate: Date; expirationDate: Date }): DotationStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deliveryDate = new Date(delivery.deliveryDate);
  deliveryDate.setHours(0, 0, 0, 0);
  
  // If delivery date is in the future, it's pending
  if (deliveryDate > today) {
    return 'pending';
  }
  
  const daysRemaining = calculateDaysRemaining(delivery.expirationDate);
  
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= 30) return 'expiring';
  return 'delivered';
}

export function getAlertLevel(daysRemaining: number): 'info' | 'warning' | 'critical' {
  if (daysRemaining <= 7) return 'critical';
  if (daysRemaining <= 30) return 'warning';
  return 'info';
}

// Colombian dotation periods (legal requirement: every 4 months for workers)
export const DOTATION_PERIOD_MONTHS = 4;
export const DOTATION_PERIODS_PER_YEAR = 3;

export function getNextDotationDate(lastDeliveryDate: Date): Date {
  const nextDate = new Date(lastDeliveryDate);
  nextDate.setMonth(nextDate.getMonth() + DOTATION_PERIOD_MONTHS);
  return nextDate;
}
