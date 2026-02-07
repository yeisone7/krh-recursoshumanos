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

// Import white logo for dark header background
import petrocasinosLogoWhite from '@/assets/petrocasinos-logo-white.png';

// Helper to format currency
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format date
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: es });
}

// Colors - Petrocasinos Brand Palette
const NAVY_DARK = [42, 54, 80] as [number, number, number]; // Dark navy blue
const NAVY_PRIMARY = [55, 71, 105] as [number, number, number]; // Navy blue
const ORANGE_PRIMARY = [255, 102, 0] as [number, number, number]; // Brand orange
const ORANGE_LIGHT = [255, 140, 66] as [number, number, number]; // Light orange
const GRAY_DARK = [51, 65, 85] as [number, number, number]; // Slate-700
const GRAY_MEDIUM = [100, 116, 139] as [number, number, number]; // Slate-500
const GRAY_LIGHT = [148, 163, 184] as [number, number, number]; // Slate-400
const WHITE = [255, 255, 255] as [number, number, number];
const LIGHT_BG = [248, 250, 252] as [number, number, number]; // Slate-50

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

// Helper to draw a fillable field (underline with space)
function drawFillableField(
  doc: jsPDF,
  label: string,
  value: string | null | undefined,
  x: number,
  y: number,
  fieldWidth: number = 60
): number {
  doc.setTextColor(...GRAY_MEDIUM);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(label, x, y);
  
  const labelWidth = doc.getTextWidth(label) + 2;
  
  if (value && value.trim()) {
    doc.setTextColor(...NAVY_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + labelWidth, y);
    return y;
  } else {
    // Draw underline for manual filling
    doc.setDrawColor(...GRAY_LIGHT);
    doc.setLineWidth(0.3);
    const lineStartX = x + labelWidth;
    const lineEndX = lineStartX + fieldWidth - labelWidth;
    doc.line(lineStartX, y + 1, lineEndX, y + 1);
    return y;
  }
}

// Helper to draw a two-column fillable row
function drawTwoColumnRow(
  doc: jsPDF,
  label1: string,
  value1: string | null | undefined,
  label2: string,
  value2: string | null | undefined,
  margin: number,
  y: number,
  contentWidth: number
): void {
  const colWidth = contentWidth / 2 - 5;
  drawFillableField(doc, label1, value1, margin, y, colWidth);
  drawFillableField(doc, label2, value2, margin + contentWidth / 2, y, colWidth);
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
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = 12;

  // Header with navy background
  doc.setFillColor(...NAVY_DARK);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Orange accent line
  doc.setFillColor(...ORANGE_PRIMARY);
  doc.rect(0, 35, pageWidth, 2, 'F');

  // Document code and version in top-left corner
  doc.setTextColor(...ORANGE_LIGHT);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Código: GT FO 218', margin, y);
  doc.text('Versión: 04', margin, y + 4);

  // Load and add white logo for dark header
  try {
    const logoBase64 = await loadImageAsBase64(petrocasinosLogoWhite);
    // Logo on the left side of header, positioned below the code
    doc.addImage(logoBase64, 'PNG', margin, y + 7, 55, 14);
  } catch (error) {
    console.error('Error loading logo:', error);
    // Fallback text if logo fails
    doc.setTextColor(...WHITE);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PETROCASINOS', margin, y + 16);
  }

  // Title on right side of header
  doc.setTextColor(...WHITE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUISICIÓN DE PERSONAL', pageWidth - margin, y + 8, { align: 'right' });
  
  // Document number/date subtitle
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...ORANGE_LIGHT);
  const dateText = requisition.fecha_requisicion ? 
    `Fecha: ${format(new Date(requisition.fecha_requisicion), 'dd/MM/yyyy')}` : 
    'Fecha: ___/___/______';
  doc.text(dateText, pageWidth - margin, y + 16, { align: 'right' });

  y = 45;

  // Status badge
  const status = requisition.estado_requisicion as RequisitionStatus;
  const statusLabel = requisitionStatusLabels[status] || status;
  
  let badgeColor: [number, number, number];
  switch (status) {
    case 'aprobada':
      badgeColor = [16, 185, 129] as [number, number, number]; // Green
      break;
    case 'rechazada':
      badgeColor = [239, 68, 68] as [number, number, number]; // Red
      break;
    case 'borrador':
      badgeColor = [148, 163, 184] as [number, number, number]; // Gray
      break;
    default:
      badgeColor = ORANGE_PRIMARY;
  }

  doc.setFillColor(...badgeColor);
  const badgeWidth = doc.getTextWidth(statusLabel.toUpperCase()) + 12;
  doc.roundedRect(margin, y, badgeWidth, 7, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel.toUpperCase(), margin + 6, y + 5);

  y += 15;

  // Main position info box
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...NAVY_PRIMARY);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 30, 3, 3, 'FD');

  // Position title
  doc.setTextColor(...NAVY_DARK);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const cargoText = requisition.cargo_solicitado || '________________________________';
  doc.text(cargoText, margin + 5, y + 10);

  // Number of vacancies badge
  const vacantesText = requisition.cantidad_vacantes_requeridas ? 
    `${requisition.cantidad_vacantes_requeridas} vacante${requisition.cantidad_vacantes_requeridas > 1 ? 's' : ''}` :
    '__ vacantes';
  doc.setFillColor(...ORANGE_PRIMARY);
  doc.roundedRect(pageWidth - margin - 35, y + 3, 30, 8, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(vacantesText, pageWidth - margin - 20, y + 8.5, { align: 'center' });

  // Area and center info
  y += 16;
  doc.setFontSize(10);
  drawTwoColumnRow(doc, 'Área: ', requisition.areas?.name, 'Centro: ', requisition.operation_centers?.name, margin + 5, y, contentWidth - 10);

  y += 22;

  // Section: Solicitante
  y = addSection(doc, 'DATOS DEL SOLICITANTE', y, margin, contentWidth);
  
  drawTwoColumnRow(doc, 'Nombre: ', requisition.solicitante_nombre, 'Cargo: ', requisition.cargo_solicitante, margin, y, contentWidth);
  y += 10;
  
  drawFillableField(doc, 'Fecha de Ingreso Estimada: ', formatDate(requisition.fecha_ingreso_estimada), margin, y, 80);
  y += 12;

  // Section: Motivo de la Solicitud
  y = addSection(doc, 'MOTIVO DE LA SOLICITUD', y, margin, contentWidth);

  const motivoLabel = requisition.motivo_solicitud ? 
    (requisitionReasonLabels[requisition.motivo_solicitud as RequisitionReason] || requisition.motivo_solicitud) : 
    null;
  
  drawFillableField(doc, 'Motivo: ', motivoLabel, margin, y, 70);
  y += 8;

  if (requisition.motivo_solicitud === 'reemplazo' || !requisition.motivo_solicitud) {
    drawTwoColumnRow(doc, 'Persona a Reemplazar: ', requisition.persona_a_reemplazar, 'Cargo a Reemplazar: ', requisition.cargo_a_reemplazar, margin, y, contentWidth);
    y += 8;
  }

  // Observations box
  doc.setTextColor(...GRAY_MEDIUM);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Observaciones:', margin, y);
  y += 4;
  
  doc.setDrawColor(...GRAY_LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 15, 2, 2, 'S');
  
  if (requisition.observaciones_motivo_solicitud) {
    doc.setTextColor(...NAVY_DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const obsLines = doc.splitTextToSize(requisition.observaciones_motivo_solicitud, contentWidth - 6);
    doc.text(obsLines, margin + 3, y + 5);
  }
  y += 20;

  // Section: Condiciones Laborales
  y = addSection(doc, 'CONDICIONES LABORALES', y, margin, contentWidth);

  drawTwoColumnRow(doc, 'Salario Propuesto: ', formatCurrency(requisition.salario_propuesto), 'Tipo de Contrato: ', requisition.tipo_contrato_solicitado, margin, y, contentWidth);
  y += 8;
  
  drawTwoColumnRow(doc, 'Horario de Trabajo: ', requisition.horario_trabajo, 'Día de Descanso: ', requisition.dia_descanso_obligatorio ? dayOfWeekLabels[requisition.dia_descanso_obligatorio as DayOfWeek] : null, margin, y, contentWidth);
  y += 8;
  
  drawFillableField(doc, 'Requiere Herramientas de Trabajo: ', requisition.requiere_herramienta_trabajo ? 'Sí' : (requisition.requiere_herramienta_trabajo === false ? 'No' : null), margin, y, 60);
  y += 12;

  // Check if we need a new page for approvals
  if (y > 175) {
    doc.addPage();
    y = 20;
  }

  // Section: Flujo de Aprobaciones
  y = addSection(doc, 'FLUJO DE APROBACIONES', y, margin, contentWidth);

  const approvalSteps = [
    { key: 'rrhh', title: 'RRHH', approved: requisition.rrhh_aprobado, approver: requisition.rrhh_quien_aprobo, date: requisition.rrhh_fecha_aprobacion },
    { key: 'juridico', title: 'Jurídico', approved: requisition.juridico_aprobado, approver: requisition.juridico_quien_aprobo, date: requisition.juridico_fecha_aprobacion },
    { key: 'operaciones', title: 'Operaciones', approved: requisition.operaciones_aprobado, approver: requisition.operaciones_quien_aprobo, date: requisition.operaciones_fecha_aprobacion },
    { key: 'gerencia', title: 'Gerencia', approved: requisition.gerencia_aprobado, approver: requisition.gerencia_quien_aprobo, date: requisition.gerencia_fecha_aprobacion },
    { key: 'seleccion', title: 'Selección', approved: requisition.seleccion_aprobado, approver: requisition.seleccion_quien_aprobo, date: requisition.seleccion_fecha_aprobacion },
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
      circleColor = [16, 185, 129] as [number, number, number]; // Green
    } else if (step.approved === false) {
      circleColor = [239, 68, 68] as [number, number, number]; // Red
    } else {
      circleColor = [203, 213, 225] as [number, number, number]; // Slate-300 (pending)
    }
    
    doc.setFillColor(...circleColor);
    doc.circle(xCenter, y + 10, 5, 'F');
    
    // Check/X icon - draw manually since Unicode doesn't render well in PDF
    doc.setDrawColor(...WHITE);
    doc.setLineWidth(0.8);
    if (step.approved === true) {
      // Draw checkmark manually
      const cx = xCenter;
      const cy = y + 10;
      doc.line(cx - 2.5, cy, cx - 0.5, cy + 2);
      doc.line(cx - 0.5, cy + 2, cx + 2.5, cy - 2);
    } else if (step.approved === false) {
      // Draw X manually
      const cx = xCenter;
      const cy = y + 10;
      doc.line(cx - 2, cy - 2, cx + 2, cy + 2);
      doc.line(cx + 2, cy - 2, cx - 2, cy + 2);
    }

    // Title
    doc.setTextColor(...NAVY_DARK);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(step.title, xCenter, y + 20, { align: 'center' });

    // Approver name or blank line
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    if (step.approver) {
      doc.setTextColor(...GRAY_MEDIUM);
      const approverText = step.approver.length > 12 ? step.approver.substring(0, 12) + '...' : step.approver;
      doc.text(approverText, xCenter, y + 25, { align: 'center' });
    } else {
      doc.setDrawColor(...GRAY_LIGHT);
      doc.setLineWidth(0.2);
      doc.line(xCenter - 12, y + 24, xCenter + 12, y + 24);
    }

    // Date or blank line
    if (step.date) {
      doc.setTextColor(...GRAY_LIGHT);
      doc.text(format(new Date(step.date), 'dd/MM/yy'), xCenter, y + 29, { align: 'center' });
    } else {
      doc.setDrawColor(...GRAY_LIGHT);
      doc.setLineWidth(0.2);
      doc.line(xCenter - 10, y + 28, xCenter + 10, y + 28);
    }
  });

  y += 40;

  // Approval details sections (only if there's data)
  // RRHH Details
  y = addApprovalDetailSection(doc, 'DEFINICIONES DE RRHH', [
    ['Asignación Salarial', formatCurrency(requisition.rrhh_asignacion_salarial)],
    ['Tipo de Convocatoria', requisition.rrhh_tipo_convocatoria ? (recruitmentTypeLabels[requisition.rrhh_tipo_convocatoria as RecruitmentType] || requisition.rrhh_tipo_convocatoria) : null],
    ['Nivel Política Salarial', requisition.rrhh_nivel_politica_salarial],
  ], y, margin, contentWidth, pageHeight);

  // Juridico Details
  y = addApprovalDetailSection(doc, 'DEFINICIONES JURÍDICAS', [
    ['Tipo de Contrato', requisition.juridico_tipo_contrato],
    ['Duración', requisition.juridico_duracion],
    ['Observaciones', requisition.juridico_observaciones],
  ], y, margin, contentWidth, pageHeight);

  // Operaciones Details
  y = addApprovalDetailSection(doc, 'DEFINICIONES DE OPERACIONES', [
    ['Salario Asignado', formatCurrency(requisition.rrhh_asignacion_salarial)],
    ['Observaciones', requisition.operaciones_observaciones],
  ], y, margin, contentWidth, pageHeight);

  // Gerencia Details
  y = addApprovalDetailSection(doc, 'DEFINICIONES DE GERENCIA', [
    ['Observaciones', requisition.gerencia_observaciones],
  ], y, margin, contentWidth, pageHeight);

  // Selección Details
  y = addApprovalDetailSection(doc, 'DEFINICIONES DE SELECCIÓN', [
    ['Fecha Inicio Proceso', formatDate(requisition.seleccion_fecha_inicio_proceso)],
    ['Observaciones', requisition.seleccion_observaciones],
  ], y, margin, contentWidth, pageHeight);

  // Footer
  addFooter(doc, companyName, pageWidth, pageHeight, margin);

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
  // Orange accent bar
  doc.setFillColor(...ORANGE_PRIMARY);
  doc.rect(margin, y, 3, 6, 'F');
  
  doc.setTextColor(...NAVY_DARK);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 6, y + 4.5);
  
  // Divider line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.line(margin + 6 + doc.getTextWidth(title) + 3, y + 3, margin + contentWidth, y + 3);
  
  return y + 12;
}

// Helper to add approval detail section
function addApprovalDetailSection(
  doc: jsPDF,
  title: string,
  data: [string, string | null | undefined][],
  y: number,
  margin: number,
  contentWidth: number,
  pageHeight: number
): number {
  // Check if we need a new page
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  y = addSection(doc, title, y, margin, contentWidth);
  
  data.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = margin + col * (contentWidth / 2);
    const yPos = y + row * 8;
    
    drawFillableField(doc, item[0] + ': ', item[1], xPos, yPos, contentWidth / 2 - 10);
  });

  return y + Math.ceil(data.length / 2) * 8 + 5;
}

// Helper to add footer
function addFooter(
  doc: jsPDF,
  companyName: string,
  pageWidth: number,
  pageHeight: number,
  margin: number
): void {
  const footerY = pageHeight - 12;
  
  // Orange accent line
  doc.setDrawColor(...ORANGE_PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setTextColor(...GRAY_MEDIUM);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, margin, footerY);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`, pageWidth - margin, footerY, { align: 'right' });
}

// Export function
export async function exportRequisitionToPDF(
  requisition: PersonnelRequisition,
  companyName: string
): Promise<void> {
  const doc = await generateRequisitionPDF(requisition, companyName);
  const fileName = `Requisicion_${(requisition.cargo_solicitado || 'Nueva').replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(fileName);
}
