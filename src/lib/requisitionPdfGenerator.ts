import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PersonnelRequisition } from '@/hooks/useRequisitions';
import {
  requisitionStatusLabels,
  requisitionReasonLabels,
  dayOfWeekLabels,
  recruitmentTypeLabels,
  RequisitionStatus,
  RequisitionReason,
  DayOfWeek,
  RecruitmentType,
} from '@/types/requisition';

// Import logo as base64
import petrocasinosLogo from '@/assets/petrocasinos-krh-logo.png';

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format date
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No especificada';
  return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: es });
}

// Colors
const EMERALD_PRIMARY = [16, 185, 129] as [number, number, number]; // Emerald-500
const EMERALD_DARK = [4, 120, 87] as [number, number, number]; // Emerald-700
const GRAY_DARK = [51, 65, 85] as [number, number, number]; // Slate-700
const GRAY_LIGHT = [148, 163, 184] as [number, number, number]; // Slate-400
const WHITE = [255, 255, 255] as [number, number, number];

// Load image and convert to base64
async function loadImageAsBase64(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateRequisitionPDF(
  requisition: PersonnelRequisition,
  companyName: string
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });

  const pageWidth = 216;
  const pageHeight = 279;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 15;

  // Load logo
  try {
    const logoBase64 = await loadImageAsBase64(petrocasinosLogo);
    // Add logo
    doc.addImage(logoBase64, 'PNG', margin, y, 50, 15);
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  // Header background stripe
  doc.setFillColor(...EMERALD_DARK);
  doc.rect(pageWidth - 80, y - 2, 65, 22, 'F');
  
  // Title in header stripe
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUISICIÓN DE', pageWidth - 47.5, y + 6, { align: 'center' });
  doc.text('PERSONAL', pageWidth - 47.5, y + 13, { align: 'center' });

  y += 30;

  // Status badge
  const status = requisition.estado_requisicion as RequisitionStatus;
  const statusLabel = requisitionStatusLabels[status] || status;
  
  // Status badge background
  const badgeWidth = doc.getTextWidth(statusLabel.toUpperCase()) + 10;
  let badgeColor: [number, number, number];
  
  switch (status) {
    case 'aprobada':
      badgeColor = EMERALD_PRIMARY;
      break;
    case 'rechazada':
      badgeColor = [239, 68, 68] as [number, number, number]; // Red
      break;
    case 'borrador':
      badgeColor = [148, 163, 184] as [number, number, number]; // Gray
      break;
    default:
      badgeColor = [59, 130, 246] as [number, number, number]; // Blue
  }

  doc.setFillColor(...badgeColor);
  doc.roundedRect(margin, y, badgeWidth, 7, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel.toUpperCase(), margin + 5, y + 5);

  // Date on the right
  doc.setTextColor(...GRAY_LIGHT);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(requisition.fecha_requisicion), pageWidth - margin, y + 5, { align: 'right' });

  y += 15;

  // Main info section
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F');
  
  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(requisition.cargo_solicitado, margin + 5, y + 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_LIGHT);
  
  const infoY = y + 20;
  
  // Row 1
  doc.text('Área:', margin + 5, infoY);
  doc.setTextColor(...GRAY_DARK);
  doc.text(requisition.areas?.name || 'No especificada', margin + 5 + 12, infoY);
  
  doc.setTextColor(...GRAY_LIGHT);
  doc.text('Centro:', margin + 90, infoY);
  doc.setTextColor(...GRAY_DARK);
  doc.text(requisition.operation_centers?.name || 'No especificado', margin + 90 + 15, infoY);

  // Row 2
  doc.setTextColor(...GRAY_LIGHT);
  doc.text('Vacantes:', margin + 5, infoY + 8);
  doc.setTextColor(...EMERALD_DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(String(requisition.cantidad_vacantes_requeridas), margin + 5 + 20, infoY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_LIGHT);
  doc.text('Ingreso estimado:', margin + 90, infoY + 8);
  doc.setTextColor(...GRAY_DARK);
  doc.text(formatDate(requisition.fecha_ingreso_estimada), margin + 90 + 35, infoY + 8);

  // Row 3
  doc.setTextColor(...GRAY_LIGHT);
  doc.text('Solicitante:', margin + 5, infoY + 16);
  doc.setTextColor(...GRAY_DARK);
  doc.text(requisition.solicitante_nombre, margin + 5 + 24, infoY + 16);

  if (requisition.cargo_solicitante) {
    doc.setTextColor(...GRAY_LIGHT);
    doc.text('Cargo:', margin + 90, infoY + 16);
    doc.setTextColor(...GRAY_DARK);
    doc.text(requisition.cargo_solicitante, margin + 90 + 15, infoY + 16);
  }

  y += 55;

  // Section: Motivo de la Solicitud
  y = addSection(doc, 'MOTIVO DE LA SOLICITUD', y, margin, contentWidth);
  
  const motivoLabel = requisitionReasonLabels[requisition.motivo_solicitud as RequisitionReason] || requisition.motivo_solicitud;
  
  doc.setFillColor(...EMERALD_PRIMARY);
  const motivoBadgeWidth = doc.getTextWidth(motivoLabel) + 8;
  doc.roundedRect(margin, y, motivoBadgeWidth, 6, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(motivoLabel, margin + 4, y + 4.2);
  
  y += 12;

  if (requisition.observaciones_motivo_solicitud) {
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const obsLines = doc.splitTextToSize(requisition.observaciones_motivo_solicitud, contentWidth);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 4 + 5;
  }

  if (requisition.persona_a_reemplazar) {
    addInfoRow(doc, 'Persona a reemplazar:', requisition.persona_a_reemplazar, margin, y);
    y += 6;
  }

  if (requisition.cargo_a_reemplazar) {
    addInfoRow(doc, 'Cargo a reemplazar:', requisition.cargo_a_reemplazar, margin, y);
    y += 6;
  }

  y += 5;

  // Section: Condiciones Laborales
  y = addSection(doc, 'CONDICIONES LABORALES', y, margin, contentWidth);

  const conditionsData = [
    ['Salario Propuesto', requisition.salario_propuesto ? formatCurrency(requisition.salario_propuesto) : 'No especificado'],
    ['Tipo de Contrato', requisition.tipo_contrato_solicitado || 'No especificado'],
    ['Horario de Trabajo', requisition.horario_trabajo || 'No especificado'],
    ['Día de Descanso', requisition.dia_descanso_obligatorio ? dayOfWeekLabels[requisition.dia_descanso_obligatorio as DayOfWeek] : 'No especificado'],
    ['Requiere Herramientas', requisition.requiere_herramienta_trabajo ? 'Sí' : 'No'],
  ];

  // Draw conditions in 2-column grid
  doc.setFontSize(9);
  let row = 0;
  conditionsData.forEach((item, index) => {
    const col = index % 2;
    const xPos = margin + col * (contentWidth / 2);
    if (col === 0 && index > 0) row++;
    const yPos = y + row * 10;

    doc.setTextColor(...GRAY_LIGHT);
    doc.setFont('helvetica', 'normal');
    doc.text(item[0] + ':', xPos, yPos);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(item[1], xPos, yPos + 4.5);
  });

  y += (Math.ceil(conditionsData.length / 2)) * 10 + 10;

  // Check if we need a new page for approvals
  if (y > 180) {
    doc.addPage();
    y = 20;
  }

  // Section: Flujo de Aprobaciones
  y = addSection(doc, 'FLUJO DE APROBACIONES', y, margin, contentWidth);

  const approvalSteps = [
    {
      title: 'RRHH',
      approved: requisition.rrhh_aprobado,
      approver: requisition.rrhh_quien_aprobo,
      date: requisition.rrhh_fecha_aprobacion,
      extra: requisition.rrhh_asignacion_salarial ? `Salario asignado: ${formatCurrency(requisition.rrhh_asignacion_salarial)}` : null,
    },
    {
      title: 'Jurídico',
      approved: requisition.juridico_aprobado,
      approver: requisition.juridico_quien_aprobo,
      date: requisition.juridico_fecha_aprobacion,
      extra: requisition.juridico_tipo_contrato ? `Tipo contrato: ${requisition.juridico_tipo_contrato}` : null,
    },
    {
      title: 'Operaciones',
      approved: requisition.operaciones_aprobado,
      approver: requisition.operaciones_quien_aprobo,
      date: requisition.operaciones_fecha_aprobacion,
      extra: null,
    },
    {
      title: 'Gerencia',
      approved: requisition.gerencia_aprobado,
      approver: requisition.gerencia_quien_aprobo,
      date: requisition.gerencia_fecha_aprobacion,
      extra: null,
    },
    {
      title: 'Selección',
      approved: requisition.seleccion_aprobado,
      approver: requisition.seleccion_quien_aprobo,
      date: requisition.seleccion_fecha_aprobacion,
      extra: requisition.seleccion_fecha_inicio_proceso ? `Inicio proceso: ${formatDate(requisition.seleccion_fecha_inicio_proceso)}` : null,
    },
  ];

  const stepWidth = contentWidth / 5;
  
  // Draw timeline line
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.5);
  doc.line(margin + stepWidth / 2, y + 10, margin + contentWidth - stepWidth / 2, y + 10);

  // Draw each step
  approvalSteps.forEach((step, index) => {
    const xCenter = margin + stepWidth / 2 + index * stepWidth;
    
    // Circle
    let circleColor: [number, number, number];
    if (step.approved === true) {
      circleColor = EMERALD_PRIMARY;
    } else if (step.approved === false) {
      circleColor = [239, 68, 68] as [number, number, number]; // Red
    } else {
      circleColor = [203, 213, 225] as [number, number, number]; // Slate-300
    }
    
    doc.setFillColor(...circleColor);
    doc.circle(xCenter, y + 10, 5, 'F');
    
    // Check/X icon
    doc.setTextColor(...WHITE);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    if (step.approved === true) {
      doc.text('✓', xCenter, y + 12, { align: 'center' });
    } else if (step.approved === false) {
      doc.text('✗', xCenter, y + 12, { align: 'center' });
    }

    // Title
    doc.setTextColor(...GRAY_DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(step.title, xCenter, y + 20, { align: 'center' });

    // Approver name
    if (step.approver) {
      doc.setTextColor(...GRAY_LIGHT);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      const approverText = step.approver.length > 15 ? step.approver.substring(0, 15) + '...' : step.approver;
      doc.text(approverText, xCenter, y + 25, { align: 'center' });
    }

    // Date
    if (step.date) {
      doc.setFontSize(6);
      doc.text(format(new Date(step.date), 'dd/MM/yy'), xCenter, y + 29, { align: 'center' });
    }
  });

  y += 40;

  // RRHH Details (if approved)
  if (requisition.rrhh_aprobado && requisition.rrhh_asignacion_salarial) {
    y = addSection(doc, 'DEFINICIONES DE RRHH', y, margin, contentWidth);
    
    const rrhhData = [
      ['Asignación Salarial', formatCurrency(requisition.rrhh_asignacion_salarial)],
      ['Tipo de Convocatoria', requisition.rrhh_tipo_convocatoria ? recruitmentTypeLabels[requisition.rrhh_tipo_convocatoria as RecruitmentType] || requisition.rrhh_tipo_convocatoria : 'No especificado'],
      ['Nivel Política Salarial', requisition.rrhh_nivel_politica_salarial || 'No especificado'],
    ];

    doc.setFontSize(9);
    rrhhData.forEach((item, index) => {
      const xPos = margin + (index % 3) * (contentWidth / 3);
      const yPos = y + Math.floor(index / 3) * 10;
      
      doc.setTextColor(...GRAY_LIGHT);
      doc.setFont('helvetica', 'normal');
      doc.text(item[0] + ':', xPos, yPos);
      doc.setTextColor(...EMERALD_DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(item[1], xPos, yPos + 4.5);
    });

    y += 15;
  }

  // Juridico Details (if approved)
  if (requisition.juridico_aprobado && requisition.juridico_tipo_contrato) {
    y = addSection(doc, 'DEFINICIONES JURÍDICAS', y, margin, contentWidth);
    
    doc.setFontSize(9);
    
    doc.setTextColor(...GRAY_LIGHT);
    doc.setFont('helvetica', 'normal');
    doc.text('Tipo de Contrato:', margin, y);
    doc.setTextColor(...GRAY_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(requisition.juridico_tipo_contrato, margin + 35, y);

    if (requisition.juridico_duracion) {
      doc.setTextColor(...GRAY_LIGHT);
      doc.setFont('helvetica', 'normal');
      doc.text('Duración:', margin + 90, y);
      doc.setTextColor(...GRAY_DARK);
      doc.setFont('helvetica', 'bold');
      doc.text(requisition.juridico_duracion, margin + 110, y);
    }

    y += 10;
  }

  // Footer
  const footerY = pageHeight - 15;
  doc.setDrawColor(...EMERALD_PRIMARY);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(...GRAY_LIGHT);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, margin, footerY);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, pageWidth - margin, footerY, { align: 'right' });

  return doc;
}

// Helper to add section header
function addSection(
  doc: jsPDF,
  title: string,
  y: number,
  margin: number,
  contentWidth: number
): number {
  doc.setFillColor(...EMERALD_DARK);
  doc.rect(margin, y, 3, 6, 'F');
  
  doc.setTextColor(...EMERALD_DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 6, y + 4.5);
  
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.line(margin + 6 + doc.getTextWidth(title) + 3, y + 3, margin + contentWidth, y + 3);
  
  return y + 12;
}

// Helper to add info row
function addInfoRow(
  doc: jsPDF,
  label: string,
  value: string,
  margin: number,
  y: number
): void {
  doc.setTextColor(...GRAY_LIGHT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(label, margin, y);
  
  doc.setTextColor(...GRAY_DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(value, margin + doc.getTextWidth(label) + 2, y);
}

// Export function
export async function exportRequisitionToPDF(
  requisition: PersonnelRequisition,
  companyName: string
): Promise<void> {
  const doc = await generateRequisitionPDF(requisition, companyName);
  const fileName = `Requisicion_${requisition.cargo_solicitado.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
