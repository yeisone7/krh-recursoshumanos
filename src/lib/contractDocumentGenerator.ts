import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import { calculateInclusiveMonthSpan } from '@/lib/dateOnly';

// Contract document data interface
export interface ContractDocumentData {
  // Company info
  companyName: string;
  companyNit: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string | null;
  representativeName?: string;
  representativePosition?: string;
  representativeSignatureUrl?: string | null;
  
  // Employee info
  employeeFullName: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeDocumentType: string;
  employeeDocumentNumber: string;
  employeeAddress?: string;
  employeeCity?: string;
  employeePhone?: string;
  employeeEmail?: string;
  employeeBirthDate?: string;
  employeePosition: string;
  employeeOperationCenter?: string;
  employeePayrollType?: string; // Tipo de nómina (quincenal/mensual)
  employeeRestDay?: string; // Día de descanso del empleado
  
  // Contract info
  contractNumber?: string; // Número consecutivo del contrato (ej: PC-2024-0001)
  contractType: string;
  workLaborDescription?: string; // Descripción del objeto/labor para contratos obra_labor
  contractTypeDisplay: string;
  startDate: Date;
  endDate?: Date | null;
  salary: number;
  salaryType: string;
  transportAllowance: boolean;
  transportAllowanceAmount?: number;
  trialPeriodDays?: number;
  workCity?: string;
  workAddress?: string;
  contractDurationMonths?: number; // Término inicial en meses
  
  // Clauses
  hasNonCompeteClause: boolean;
  hasConfidentialityClause: boolean;
  specialClauses?: string;
  
  // Generation info
  generationDate: Date;
  generationCity?: string;
}

// Helper to calculate months between two dates
export function calculateMonthsDifference(startDate: Date, endDate: Date): number {
  return calculateInclusiveMonthSpan(startDate, endDate);
}

// Helper to format currency
function formatCurrency(amount: number): string {
  const safeAmount = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

// Helper to load image for PDF
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

// Helper to format date in Spanish words
function formatDateInWords(date: Date): string {
  const day = format(date, 'd', { locale: es });
  const month = format(date, 'MMMM', { locale: es });
  const year = format(date, 'yyyy', { locale: es });
  return `${day} de ${month} de ${year}`;
}

// Capitalize first letter
function capitalize(value?: string | null): string {
  const str = String(value || '').trim();
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const dayOfWeekLabels: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  miércoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  sábado: 'Sábado',
  domingo: 'Domingo',
};

function formatRestDay(restDay?: string | null): string {
  if (!restDay) return '';

  const normalized = String(restDay).trim().toLowerCase();
  if (!normalized) return '';
  return dayOfWeekLabels[normalized] || capitalize(normalized);
}

// Convert number to words (Spanish)
function numberToWords(num: number): string {
  if (!Number.isFinite(num)) return 'cero';

  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const hundreds = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (num === 0) return 'cero';
  if (num < 0) return 'menos ' + numberToWords(-num);
  
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const u = num % 10;
    if (u === 0) return tens[t];
    if (t === 2) return 'veinti' + units[u];
    return tens[t] + ' y ' + units[u];
  }
  if (num < 1000) {
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    if (remainder === 0) return h === 1 ? 'cien' : hundreds[h];
    return (h === 1 ? 'ciento' : hundreds[h]) + ' ' + numberToWords(remainder);
  }
  if (num < 1000000) {
    const thousands = Math.floor(num / 1000);
    const remainder = num % 1000;
    const thousandWord = thousands === 1 ? 'mil' : numberToWords(thousands) + ' mil';
    if (remainder === 0) return thousandWord;
    return thousandWord + ' ' + numberToWords(remainder);
  }
  if (num < 1000000000) {
    const millions = Math.floor(num / 1000000);
    const remainder = num % 1000000;
    const millionWord = millions === 1 ? 'un millón' : numberToWords(millions) + ' millones';
    if (remainder === 0) return millionWord;
    return millionWord + ' ' + numberToWords(remainder);
  }
  
  return num.toString();
}

// Prepare template data with all placeholders
function prepareTemplateData(data: ContractDocumentData): Record<string, string> {
  const today = data.generationDate;
  const salary = Number.isFinite(Number(data.salary)) ? Number(data.salary) : 0;
  const salaryWords = capitalize(numberToWords(salary));
  const salaryFormatted = formatCurrency(salary);
  const salaryTypeText = data.salaryType === 'mensual' ? 'Salario Mensual' : 'Salario Convencional';
  const payrollTypeText = data.employeePayrollType === 'mensual' ? 'Mensual' : 'Quincenal';
  const restDayText = formatRestDay(data.employeeRestDay);
  const durationText = data.contractDurationMonths
    ? `${data.contractDurationMonths} meses`
    : 'Indefinido';
  const transportAllowanceText = data.transportAllowance && data.transportAllowanceAmount
    ? formatCurrency(data.transportAllowanceAmount)
    : 'No aplica';
  
  return {
    // Company
    EMPRESA_NOMBRE: data.companyName,
    EMPRESA_NIT: data.companyNit,
    EMPRESA_DIRECCION: data.companyAddress || '',
    EMPRESA_TELEFONO: data.companyPhone || '',
    EMPRESA_EMAIL: data.companyEmail || '',
    EMPRESA_LOGO: data.logoUrl || '',
    
    // Representative / Legal Signature
    REPRESENTANTE_LEGAL_NOMBRE: data.representativeName || '',
    REPRESENTANTE_NOMBRE: data.representativeName || '',
    REPRESENTANTE_LEGAL_CARGO: data.representativePosition || '',
    REPRESENTANTE_CARGO: data.representativePosition || '',
    FIRMA_REPRESENTANTE: data.representativeSignatureUrl || '',
    REPRESENTANTE_FIRMA: data.representativeSignatureUrl || '',
    
    // Employee
    EMPLEADO_NOMBRE_COMPLETO: data.employeeFullName,
    EMPLEADO_NOMBRE: data.employeeFullName,
    EMPLEADO_NOMBRES: data.employeeFirstName,
    EMPLEADO_APELLIDOS: data.employeeLastName,
    EMPLEADO_TIPO_DOCUMENTO: data.employeeDocumentType,
    EMPLEADO_DOCUMENTO_TIPO: data.employeeDocumentType,
    EMPLEADO_DOCUMENTO: data.employeeDocumentNumber,
    EMPLEADO_DIRECCION: data.employeeAddress || '',
    EMPLEADO_CIUDAD: data.employeeCity || '',
    EMPLEADO_TELEFONO: data.employeePhone || '',
    EMPLEADO_EMAIL: data.employeeEmail || '',
    EMPLEADO_FECHA_NACIMIENTO: data.employeeBirthDate || '',
    EMPLEADO_CARGO: data.employeePosition,
    EMPLEADO_CENTRO_OPERACION: data.employeeOperationCenter || '',
    EMPLEADO_CENTRO: data.employeeOperationCenter || '',
    EMPLEADO_AREA: data.employeeOperationCenter || '',
    EMPLEADO_TIPO_NOMINA: payrollTypeText, // Default to Quincenal
    DIA_DESCANSO: restDayText,
    EMPLEADO_DIA_DESCANSO: restDayText,
    
    // Contract
    CONTRATO_NUMERO: data.contractNumber || '', // Consecutivo (ej: PC-2024-0001)
    CONTRATO_TIPO: data.contractType,
    CONTRATO_TIPO_TEXTO: data.contractTypeDisplay,
    CONTRATO_OBJETO_LABOR: data.workLaborDescription || '', // Objeto/labor para contratos obra_labor
    CONTRATO_FECHA_INICIO: format(data.startDate, 'dd/MM/yyyy'),
    CONTRATO_FECHA_INICIO_LETRAS: formatDateInWords(data.startDate),
    CONTRATO_FECHA_FIN: data.endDate ? format(data.endDate, 'dd/MM/yyyy') : 'No aplica',
    CONTRATO_FECHA_FIN_LETRAS: data.endDate ? formatDateInWords(data.endDate) : 'No aplica',
    CONTRATO_SALARIO: salaryFormatted,
    CONTRATO_SALARIO_NUMERO: salary.toString(),
    CONTRATO_SALARIO_LETRAS: salaryWords + ' pesos M/CTE',
    CONTRATO_TIPO_SALARIO: salaryTypeText,
    CONTRATO_AUXILIO_TRANSPORTE: data.transportAllowance ? 'Sí' : 'No',
    CONTRATO_AUXILIO_TRANSPORTE_VALOR: transportAllowanceText,
    CONTRATO_PERIODO_PRUEBA: data.trialPeriodDays ? `${data.trialPeriodDays} días` : 'No aplica',
    CONTRATO_CIUDAD_TRABAJO: data.workCity || '',
    CONTRATO_DIRECCION_TRABAJO: data.workAddress || '',
    CONTRATO_DURACION_MESES: durationText,
    
    // Friendly aliases shown in the catalog helper.
    SALARIO: salaryFormatted,
    SALARIO_NUMERO: salary.toString(),
    SALARIO_LETRAS: salaryWords,
    SALARIO_TIPO: salaryTypeText,
    AUXILIO_TRANSPORTE: transportAllowanceText,
    LUGAR_CIUDAD: data.workCity || '',
    LUGAR_DIRECCION: data.workAddress || '',
    
    // Clauses
    CLAUSULA_NO_COMPETENCIA: data.hasNonCompeteClause ? 'Sí aplica' : 'No aplica',
    CLAUSULA_CONFIDENCIALIDAD: data.hasConfidentialityClause ? 'Sí aplica' : 'No aplica',
    CLAUSULAS_ESPECIALES: data.specialClauses || 'Ninguna',
    
    // Generation
    FECHA_GENERACION: format(today, 'dd/MM/yyyy'),
    FECHA_GENERACION_LETRAS: formatDateInWords(today),
    FECHA_HOY: format(today, 'dd/MM/yyyy'),
    FECHA_HOY_LETRAS: formatDateInWords(today),
    CIUDAD_GENERACION: data.generationCity || 'Bogotá D.C.',
    
    // Extra date formats
    DIA_ACTUAL: format(today, 'd'),
    MES_ACTUAL: capitalize(format(today, 'MMMM', { locale: es })),
    ANIO_ACTUAL: format(today, 'yyyy'),
  };
}

// Download template from Supabase storage
export async function downloadTemplate(templateUrl: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(templateUrl);
  
  if (error) {
    throw new Error(`Error downloading template: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('La plantilla del contrato no devolvio contenido.');
  }

  const buffer = await data.arrayBuffer();
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('La plantilla del contrato esta vacia o no se pudo leer.');
  }

  return buffer;
}

// Generate contract document from DOCX template
export async function generateContractFromTemplate(
  templateUrl: string,
  data: ContractDocumentData
): Promise<Blob> {
  // Download the template
  const templateBuffer = await downloadTemplate(templateUrl);
  
  // Load the template with PizZip
  let zip: PizZip;
  try {
    zip = new PizZip(templateBuffer);
  } catch (error) {
    throw new Error('No se pudo abrir la plantilla DOCX del contrato. Verifique que el archivo sea un .docx valido.');
  }
  
  // Create docxtemplater instance
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => '',
  });
  
  // Get template data
  const templateData = prepareTemplateData(data);
  
  // Render the document
  try {
    doc.render(templateData);
  } catch (error) {
    console.error('Error rendering contract template:', error);
    throw new Error('No se pudo completar la plantilla del contrato. Revise que las variables del archivo DOCX esten bien escritas.');
  }
  
  // Generate the output
  const out = doc.getZip().generate({
    type: 'arraybuffer',
  });
  
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// Generate a basic PDF contract (fallback when no template)
export async function generateBasicContractPDF(data: ContractDocumentData): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 20;
  
  doc.setFont('helvetica');
  
  // Logo
  if (data.logoUrl) {
    try {
      const logoImg = await loadImage(data.logoUrl);
      doc.addImage(logoImg, 'PNG', margin, y, 40, 20);
      y += 25;
    } catch (e) {
      console.warn('Could not load company logo for contract PDF', e);
    }
  }
  
  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName.toUpperCase(), 105, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${data.companyNit}`, 105, y, { align: 'center' });
  
  if (data.companyAddress) {
    y += 5;
    doc.text(data.companyAddress, 105, y, { align: 'center' });
  }
  
  // Title
  y += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONTRATO DE TRABAJO ${data.contractTypeDisplay.toUpperCase()}`, 105, y, { align: 'center' });
  
  y += 15;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Parties
  const partiesText = `Entre ${data.companyName}, identificada con NIT ${data.companyNit}, en adelante EL EMPLEADOR, y ${data.employeeFullName}, identificado(a) con ${data.employeeDocumentType} No. ${data.employeeDocumentNumber}, en adelante EL TRABAJADOR, se celebra el presente contrato de trabajo, regido por las siguientes cláusulas:`;
  
  const partiesLines = doc.splitTextToSize(partiesText, textWidth);
  doc.text(partiesLines, margin, y);
  y += partiesLines.length * 5 + 10;
  
  // Clause 1 - Object
  doc.setFont('helvetica', 'bold');
  doc.text('PRIMERA - OBJETO:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const clause1 = `EL TRABAJADOR se compromete a prestar sus servicios personales en el cargo de ${data.employeePosition}${data.employeeOperationCenter ? `, en el centro de operación ${data.employeeOperationCenter}` : ''}, cumpliendo con las funciones propias del cargo y aquellas que le sean asignadas.`;
  const clause1Lines = doc.splitTextToSize(clause1, textWidth);
  doc.text(clause1Lines, margin, y);
  y += clause1Lines.length * 5 + 8;
  
  // Clause 2 - Duration
  doc.setFont('helvetica', 'bold');
  doc.text('SEGUNDA - DURACIÓN:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  let clause2 = `El presente contrato tiene una duración ${data.contractTypeDisplay.toLowerCase()}, iniciando el ${formatDateInWords(data.startDate)}`;
  if (data.endDate) {
    clause2 += ` y finalizando el ${formatDateInWords(data.endDate)}.`;
  } else {
    clause2 += '.';
  }
  const clause2Lines = doc.splitTextToSize(clause2, textWidth);
  doc.text(clause2Lines, margin, y);
  y += clause2Lines.length * 5 + 8;
  
  // Clause 3 - Trial Period
  if (data.trialPeriodDays && data.trialPeriodDays > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('TERCERA - PERÍODO DE PRUEBA:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const clause3 = `Las partes acuerdan un período de prueba de ${data.trialPeriodDays} días, contados a partir de la fecha de inicio del contrato.`;
    const clause3Lines = doc.splitTextToSize(clause3, textWidth);
    doc.text(clause3Lines, margin, y);
    y += clause3Lines.length * 5 + 8;
  }
  
  // Clause 4 - Salary
  doc.setFont('helvetica', 'bold');
  doc.text('CUARTA - REMUNERACIÓN:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const salary = Number.isFinite(Number(data.salary)) ? Number(data.salary) : 0;
  let clause4 = `EL EMPLEADOR pagará a EL TRABAJADOR un ${data.salaryType === 'mensual' ? 'salario mensual' : 'salario convencional'} de ${formatCurrency(salary)} (${capitalize(numberToWords(salary))} pesos M/CTE).`;
  if (data.transportAllowance && data.transportAllowanceAmount) {
    clause4 += ` Adicionalmente, se pagará auxilio de transporte por valor de ${formatCurrency(data.transportAllowanceAmount)}.`;
  }
  const clause4Lines = doc.splitTextToSize(clause4, textWidth);
  doc.text(clause4Lines, margin, y);
  y += clause4Lines.length * 5 + 8;
  
  // Clause 5 - Workplace
  if (data.workCity || data.workAddress) {
    doc.setFont('helvetica', 'bold');
    doc.text('QUINTA - LUGAR DE TRABAJO:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    let clause5 = 'EL TRABAJADOR prestará sus servicios en';
    if (data.workAddress) clause5 += ` ${data.workAddress}`;
    if (data.workCity) clause5 += `, ${data.workCity}`;
    clause5 += '.';
    const clause5Lines = doc.splitTextToSize(clause5, textWidth);
    doc.text(clause5Lines, margin, y);
    y += clause5Lines.length * 5 + 8;
  }
  
  // Check if we need a new page
  if (y > 240) {
    doc.addPage();
    y = 25;
  }
  
  // Additional clauses
  if (data.hasConfidentialityClause) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA DE CONFIDENCIALIDAD:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const confClause = `EL TRABAJADOR se compromete a mantener en estricta confidencialidad toda la información relacionada con las actividades, procesos, clientes y demás asuntos de EL EMPLEADOR.`;
    const confLines = doc.splitTextToSize(confClause, textWidth);
    doc.text(confLines, margin, y);
    y += confLines.length * 5 + 8;
  }
  
  if (data.hasNonCompeteClause) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULA DE NO COMPETENCIA:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const nonCompClause = `EL TRABAJADOR se compromete a no prestar servicios a empresas que realicen actividades similares a las de EL EMPLEADOR durante la vigencia del presente contrato.`;
    const nonCompLines = doc.splitTextToSize(nonCompClause, textWidth);
    doc.text(nonCompLines, margin, y);
    y += nonCompLines.length * 5 + 8;
  }
  
  if (data.specialClauses) {
    doc.setFont('helvetica', 'bold');
    doc.text('CLÁUSULAS ESPECIALES:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    const specialLines = doc.splitTextToSize(data.specialClauses, textWidth);
    doc.text(specialLines, margin, y);
    y += specialLines.length * 5 + 8;
  }
  
  // Check if we need a new page for signatures
  if (y > 200) {
    doc.addPage();
    y = 25;
  }
  
  // Final paragraph
  y += 10;
  const finalText = `Para constancia se firma en ${data.generationCity || 'Bogotá D.C.'}, a los ${formatDateInWords(data.generationDate)}.`;
  doc.text(finalText, margin, y);
  
  // Signatures
  y += 30;
  const leftX = 30;
  const rightX = 130;
  const lineWidth = 50;
  
  // Employer signature
  doc.line(leftX, y, leftX + lineWidth, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('EL EMPLEADOR', leftX + lineWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName, leftX + lineWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`NIT: ${data.companyNit}`, leftX + lineWidth / 2, y, { align: 'center' });
  
  // Employee signature
  const employeeY = y - 13;
  doc.line(rightX, employeeY, rightX + lineWidth, employeeY);
  doc.setFont('helvetica', 'bold');
  doc.text('EL TRABAJADOR', rightX + lineWidth / 2, employeeY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(data.employeeFullName, rightX + lineWidth / 2, employeeY + 9, { align: 'center' });
  doc.text(`${data.employeeDocumentType} ${data.employeeDocumentNumber}`, rightX + lineWidth / 2, employeeY + 13, { align: 'center' });
  
  return doc;
}

// Download generated document
export function downloadDocument(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download PDF
export function downloadPDF(pdf: jsPDF, filename: string): void {
  const pdfBlob = pdf.output('blob');
  downloadDocument(pdfBlob, filename);
}

export async function generateHighFidelityPDFFromDocx(
  docxBlob: Blob,
  filename: string,
  data?: ContractDocumentData
): Promise<void> {
  // 1. Create the off-screen layout container inside the PARENT window.
  // We place it off-screen and keep it active in layout tree so margins and text render perfectly.
  const hiddenContainer = window.document.createElement('div');
  hiddenContainer.id = 'docx-pdf-canvas-export-helper';
  hiddenContainer.style.position = 'fixed';
  hiddenContainer.style.left = '-9999px';
  hiddenContainer.style.top = '-9999px';
  hiddenContainer.style.width = '816px'; // standard US Letter width in pixels (8.5 inches * 96 px/inch)
  hiddenContainer.style.height = 'auto';
  hiddenContainer.style.opacity = '1';
  hiddenContainer.style.pointerEvents = 'none';
  hiddenContainer.style.zIndex = '-9999';
  window.document.body.appendChild(hiddenContainer);

  // 2. Create and inject custom print and table styles directly inside window.document.head BEFORE calling renderAsync
  // Set ignoreHeight: false and breakPages: true below to let docx-preview paginate natively.
  const styleElement = window.document.createElement('style');
  styleElement.id = 'docx-pdf-canvas-export-styles';
  styleElement.innerHTML = `
    .docx-wrapper {
      background: transparent !important;
      padding: 0 !important;
      box-shadow: none !important;
      margin: 0 !important;
    }
    section.docx {
      background: white !important;
      box-shadow: none !important;
      margin: 0 !important;
      border: none !important;
      width: 816px !important;   /* US Letter width */
      min-height: 1056px !important; /* US Letter min-height to grow naturally */
      box-sizing: border-box !important;
      position: relative !important;
      display: block !important;
    }
    table {
      border-collapse: collapse !important;
      border: 1.5px solid #2d308f !important;
      width: 100% !important;
      margin-bottom: 20px !important;
      table-layout: fixed !important;
    }
    td, th {
      border: 1px solid #2d308f !important;
      padding: 8px 12px !important;
      color: #1e293b !important;
      font-size: 0.95rem !important;
      line-height: 1.4 !important;
      word-wrap: break-word !important;
    }
    .contract-header-table td,
    .contract-header-table td * {
      text-align: center !important;
    }
  `;
  window.document.head.appendChild(styleElement);

  try {
    // 3. Render the DOCX blob inside the off-screen layout container in the parent window.
    // Set ignoreHeight: false and breakPages: true for high-fidelity physical page splitting!
    await renderAsync(docxBlob, hiddenContainer, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false, // Keep physical dimensions
      breakPages: true,     // Let docx-preview paginate natively
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
      debug: false,
    });

    // 4. Scan and convert any text URLs in the document to actual images.
    // This allows text placeholders representing images to render as beautiful, styled image tags.
    const textWalker = document.createTreeWalker(hiddenContainer, NodeFilter.SHOW_TEXT);
    const nodesToReplace: { node: Text; url: string }[] = [];
    let textNode;
    while (textNode = textWalker.nextNode() as Text) {
      const val = (textNode.nodeValue || '').trim();
      if (val.startsWith('http') && (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.includes('/company_logos/') || val.includes('/signatures/') || val.includes('/training-media/'))) {
        nodesToReplace.push({ node: textNode, url: val });
      }
    }
    for (const { node, url } of nodesToReplace) {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous'; // Avoid tainted canvas
      img.src = url;
      img.style.maxWidth = '200px';
      img.style.maxHeight = '90px';
      img.style.display = 'block';
      img.style.marginTop = '8px';
      img.style.marginBottom = '8px';
      img.style.objectFit = 'contain';
      if (url.includes('/signatures/')) {
        img.style.maxWidth = '180px';
        img.style.maxHeight = '75px';
      }
      node.parentNode?.replaceChild(img, node);
    }

    // 5. Transform all SVG image wrappers to standard HTML <img> elements.
    // docx-preview wraps images inside SVG elements to support advanced positioning/rotation,
    // but html2canvas has severe limitations rendering SVG <image> tags pointing to blob: URLs.
    // Converting them to standard <img> elements makes them 100% compatible and perfectly rendered.
    const svgs = Array.from(hiddenContainer.getElementsByTagName('svg'));
    for (const svg of svgs) {
      const imageNode = svg.querySelector('image');
      if (imageNode) {
        const rawSrc = imageNode.getAttribute('href') || 
                       imageNode.getAttribute('xlink:href') || 
                       (imageNode as any).src || 
                       '';
                       
        if (rawSrc) {
          const w = svg.getAttribute('width') || imageNode.getAttribute('width') || '';
          const h = svg.getAttribute('height') || imageNode.getAttribute('height') || '';
          
          const img = document.createElement('img');
          img.crossOrigin = 'anonymous'; // Avoid tainted canvas
          img.src = rawSrc;
          
          const formatDimension = (val: string): string => {
            if (!val) return '';
            if (/^[0-9.]+$/.test(val.trim())) return `${val.trim()}px`;
            return val.trim();
          };
          
          if (w) img.style.width = formatDimension(w);
          if (h) img.style.height = formatDimension(h);
          
          img.style.display = 'inline-block';
          img.style.verticalAlign = 'middle';
          img.style.objectFit = 'contain';
          
          img.className = svg.className.baseVal || '';
          
          svg.parentNode?.replaceChild(img, svg);
        }
      }
    }

    // 6. If dynamic URLs are provided, replace any existing placeholder image sources
    if (data?.logoUrl) {
      const possibleLogos = Array.from(hiddenContainer.querySelectorAll('table img, header img, section.docx > img'));
      if (possibleLogos.length > 0) {
        const logoImg = possibleLogos[0] as HTMLImageElement;
        logoImg.crossOrigin = 'anonymous'; // Avoid tainted canvas
        logoImg.src = data.logoUrl;
      }
    }
    
    if (data?.representativeSignatureUrl) {
      const allImgs = Array.from(hiddenContainer.querySelectorAll('img'));
      if (allImgs.length > 0) {
        const sigImg = allImgs[allImgs.length - 1] as HTMLImageElement;
        if (allImgs.length > 1 || sigImg.src !== data?.logoUrl) {
          sigImg.crossOrigin = 'anonymous'; // Avoid tainted canvas
          sigImg.src = data.representativeSignatureUrl;
        }
      }
    }

    // 7. Wait for images inside the parent's helper container to complete loading and get populated
    await new Promise<void>((resolve) => {
      let attempts = 0;
      const checkSrc = () => {
        const imgs = Array.from(hiddenContainer.getElementsByTagName('img'));
        const allHaveSrc = imgs.length === 0 || imgs.every(img => img.getAttribute('src') || img.src);
        if (allHaveSrc || attempts > 30) {
          resolve();
        } else {
          attempts++;
          setTimeout(checkSrc, 50);
        }
      };
      checkSrc();
    });

    const allImages = Array.from(hiddenContainer.getElementsByTagName('img')) as HTMLImageElement[];

    const imageLoadPromises = allImages.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 200);
      });
    });
    await Promise.all(imageLoadPromises);

    // 8. Convert all image assets inside the container to Base64 in-place in parent context
    const imageBase64Promises = allImages.map(async (img) => {
      const rawSrc = img.getAttribute('src') || img.src || '';
      if (!rawSrc) return;

      // Draw loaded image to canvas first (safest and instant for local same-origin blobs)
      try {
        const w = img.naturalWidth || img.width || 300;
        const h = img.naturalHeight || img.height || 150;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const canvasData = canvas.toDataURL('image/png');
          if (canvasData && canvasData.startsWith('data:image')) {
            img.setAttribute('src', canvasData);
            img.src = canvasData;
            return;
          }
        }
      } catch (e) {
        console.warn('Canvas conversion failed, falling back to fetch method:', e);
      }

      // Fallback: Fetch directly from parent window context
      if (rawSrc.startsWith('blob:') || rawSrc.startsWith('http') || rawSrc.startsWith('/')) {
        try {
          const fetchUrl = rawSrc.startsWith('/') ? `${window.location.origin}${rawSrc}` : rawSrc;
          const response = await fetch(fetchUrl);
          const blob = await response.blob();
          await new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = reader.result as string;
              img.setAttribute('src', base64Data);
              img.src = base64Data;
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Failed to convert image to base64 via fetch:', rawSrc, e);
        }
      }
    });
    await Promise.all(imageBase64Promises);

    // Wait for parent window fonts to be ready
    if (window.document.fonts && window.document.fonts.ready) {
      await window.document.fonts.ready;
    }

    // Give a brief moment for complete layout and dimensions to settle
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 9. Identify pages natively split by docx-preview
    const pages = Array.from(hiddenContainer.querySelectorAll('section.docx, .docx-page, section'));
    const totalPages = pages.length || 1;

    // Pre-calculate the total sliced PDF page count to show correct total pages in headers/footers!
    let totalPdfPages = 0;
    const pageMeasures: { pageEl: HTMLElement; slices: number }[] = [];
    
    for (let i = 0; i < totalPages; i++) {
      const pageEl = (pages[i] || hiddenContainer) as HTMLElement;
      const rect = pageEl.getBoundingClientRect();
      const height = rect.height;
      const width = rect.width || 816;
      
      const letterRatioHeight = width * (1056 / 816);
      const slices = height > letterRatioHeight * 1.05 
        ? Math.ceil(height / letterRatioHeight) 
        : 1;
        
      pageMeasures.push({ pageEl, slices });
      totalPdfPages += slices;
    }

    // 10. Initialize standard Letter size PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    let pdfPageCount = 0;

    // 11. Render each page section individually, slicing if it is overflowed/continuous
    for (let i = 0; i < pageMeasures.length; i++) {
      const { pageEl, slices } = pageMeasures[i];

      // Update page numbers inside headers/footers dynamically
      updatePageNumbersInElement(pageEl, pdfPageCount + 1, totalPdfPages);

      // Render the individual page element
      const pageCanvas = await html2canvas(pageEl, {
        scale: 2.0, // High-DPI rendering
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const w = pageCanvas.width;
      const h = pageCanvas.height;
      
      // Standard US Letter aspect ratio height in canvas pixels (height = width * 1056/816)
      const hPage = w * (1056 / 816);

      // If the section canvas height is significantly larger than a standard letter page (more than 5% taller),
      // we slice it vertically into multiple physical pages of standard Letter height.
      if (h > hPage * 1.05) {
        for (let s = 0; s < slices; s++) {
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = w;
          sliceCanvas.height = hPage;
          const sliceCtx = sliceCanvas.getContext('2d');
          if (sliceCtx) {
            // Determine source coordinates (clamp to actual image height)
            const sy = s * hPage;
            const sheight = Math.min(hPage, h - sy);
            
            // Fill canvas with white background in case of short final slice
            sliceCtx.fillStyle = '#ffffff';
            sliceCtx.fillRect(0, 0, w, hPage);
            
            sliceCtx.drawImage(
              pageCanvas,
              0, sy, w, sheight, // source rect
              0, 0, w, sheight // destination rect
            );
          }

          const imgData = sliceCanvas.toDataURL('image/jpeg', 0.95);
          if (pdfPageCount > 0) {
            pdf.addPage('letter', 'portrait');
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 215.9, 279.4);
          pdfPageCount++;
        }
      } else {
        // Standard single page
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        if (pdfPageCount > 0) {
          pdf.addPage('letter', 'portrait');
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 215.9, 279.4);
        pdfPageCount++;
      }
    }

    // 12. Save and trigger download
    const pdfBlob = pdf.output('blob');
    downloadDocument(pdfBlob, filename);

  } catch (error) {
    console.error('PDF generation via high fidelity rendering failed:', error);
    throw error;
  } finally {
    // Always clean up our off-screen container and global stylesheet in the parent body
    hiddenContainer.remove();
    styleElement.remove();
  }
}

// Helper function to recursively traverse DOM nodes and update page number strings
function updatePageNumbersInElement(element: HTMLElement, currentPage: number, totalPages: number) {
  // First attempt: overwrite the entire content of the cell containing the pagination placeholder.
  // This avoids docx-preview's run-splitting issue where "PÁG. # DE #" is broken into multiple separate TextNodes.
  const cells = Array.from(element.getElementsByTagName('td'));
  let paginationUpdated = false;

  for (const cell of cells) {
    const text = (cell.textContent || '').trim();
    if (/(pág|pag\.|#\s*de\s*#)/i.test(text)) {
      cell.innerHTML = `PÁG. ${currentPage} DE ${totalPages}`;
      paginationUpdated = true;
    }
  }

  // Second attempt: Fallback to recursive TreeWalker scoped to the child document context
  if (!paginationUpdated) {
    const doc = element.ownerDocument || document;
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const text = node.nodeValue || '';
      if (/pág/i.test(text) || /pag\./i.test(text) || /#\s*de\s*#/i.test(text)) {
        node.nodeValue = `PÁG. ${currentPage} DE ${totalPages}`;
      }
    }
  }
}

// Open a new tab/window with a high-fidelity print preview of the Word template and print dialog
export async function showContractPrintPreview(docxBlob: Blob, data: ContractDocumentData): Promise<void> {
  // 1. Open a clean, empty new window
  const printWindow = window.open('', '_blank', 'width=1024,height=768,scrollbars=yes,resizable=yes');
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de vista previa. Por favor, permita las ventanas emergentes (popups) en su navegador.');
  }

  // 2. Set up the document head and title
  printWindow.document.title = `Vista Previa - Contrato ${data.employeeFullName}`;

  // 3. Inject stylesheets inside the new window
  const docxStyles = printWindow.document.createElement('style');
  docxStyles.innerHTML = `
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* Toolbar container */
    .print-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 64px;
      background: #0f172a;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      z-index: 9999;
    }
    
    .toolbar-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.025em;
    }
    
    .toolbar-actions {
      display: flex;
      gap: 12px;
    }
    
    .btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease-in-out;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }
    
    .btn-primary:hover {
      background-color: #2563eb;
    }
    
    .btn-secondary {
      background-color: #475569;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #334155;
    }

    /* Container for docx */
    #preview-container {
      margin-top: 96px;
      margin-bottom: 48px;
      display: flex;
      justify-content: center;
    }
    
    /* Docx-preview overrides */
    .docx-wrapper {
      background: transparent !important;
      padding: 0 !important;
      box-shadow: none !important;
      margin: 0 !important;
    }
    
    section.docx {
      background: white !important;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
      margin: 0 auto 24px auto !important;
      border: 1px solid #e2e8f0 !important;
      width: 816px !important;   /* US Letter width */
      box-sizing: border-box !important;
      position: relative !important;
      display: block !important;
    }

    header, .docx-header, footer, .docx-footer {
      left: 96px !important;
      right: 96px !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    table {
      border-collapse: collapse !important;
      border: 1.5px solid #2d308f !important;
      width: 100% !important;
      margin-bottom: 20px !important;
      table-layout: fixed !important;
    }
    td, th, td *, th * {
      text-align: left !important;
    }
    td, th {
      border: 1px solid #2d308f !important;
      padding: 8px 12px !important;
      color: #1e293b !important;
      font-size: 0.95rem !important;
      line-height: 1.4 !important;
      word-wrap: break-word !important;
    }
    header td, .docx-header td,
    header td *, .docx-header td * {
      text-align: center !important;
      font-size: 0.8rem !important;
    }
    header td, .docx-header td {
      padding: 4px 8px !important;
    }
    header colgroup col:nth-child(1),
    .docx-header colgroup col:nth-child(1) {
      width: 24% !important;
    }
    header colgroup col:nth-child(2),
    .docx-header colgroup col:nth-child(2) {
      width: 56% !important;
    }
    header colgroup col:nth-child(3),
    .docx-header colgroup col:nth-child(3) {
      width: 20% !important;
    }

    /* Print styles */
    @media print {
      body {
        background-color: white !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-toolbar {
        display: none !important;
      }
      #preview-container {
        margin: 0 !important;
        padding: 0 !important;
        display: block !important;
      }
      section.docx {
        box-shadow: none !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 0 !important;
        page-break-after: always !important;
      }
    }
  `;
  printWindow.document.head.appendChild(docxStyles);

  // 4. Create the preview HTML structure
  const bodyHtml = `
    <div class="print-toolbar">
      <div class="toolbar-title">Vista Previa de Contrato: ${data.employeeFullName}</div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" id="btnPrint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
          Imprimir / Guardar PDF
        </button>
        <button class="btn btn-secondary" id="btnClose">Cerrar</button>
      </div>
    </div>
    <div id="preview-container">
      <div id="docx-preview-root"></div>
    </div>
  `;
  printWindow.document.body.innerHTML = bodyHtml;

  const targetRoot = printWindow.document.getElementById('docx-preview-root')!;

  // 5. Render the DOCX blob inside the new window's preview element
  await renderAsync(docxBlob, targetRoot, undefined, {
    className: 'docx',
    inWrapper: true,
    ignoreWidth: false,
    ignoreHeight: false, // Keep physical dimensions
    breakPages: true,     // Let docx-preview paginate natively
    ignoreLastRenderedPageBreak: false, // Don't ignore Word's page breaks
    experimental: true,                  // Enable exact page spacing and breaks
    renderHeaders: true,
    renderFooters: true,
    useBase64URL: true,
    debug: false,
  });

  // 5.5. Proportionalize <col> widths to prevent horizontal table overflow/misalignment
  const allTables = targetRoot.querySelectorAll('table');
  allTables.forEach((table: any) => {
    const colgroup = table.querySelector('colgroup');
    if (colgroup) {
      const cols = colgroup.querySelectorAll('col');
      let totalWidthPt = 0;
      const widthsPt: number[] = [];
      
      cols.forEach((col: any) => {
        const styleWidth = col.style.width || '';
        const match = styleWidth.match(/^([\d.]+)(pt|px)$/);
        if (match) {
          const val = parseFloat(match[1]);
          const ptVal = match[2] === 'px' ? val / 1.333 : val;
          widthsPt.push(ptVal);
          totalWidthPt += ptVal;
        } else {
          widthsPt.push(0);
        }
      });
      
      if (totalWidthPt > 0) {
        cols.forEach((col: any, idx: number) => {
          if (widthsPt[idx] > 0) {
            const percentage = (widthsPt[idx] / totalWidthPt) * 100;
            col.style.width = `${percentage}%`;
          }
        });
      }
    }
  });

  // 6. Handle image CORS and dynamic URLs inside the preview window
  const textWalker = printWindow.document.createTreeWalker(targetRoot, NodeFilter.SHOW_TEXT);
  const nodesToReplace: { node: Text; url: string }[] = [];
  let textNode;
  while (textNode = textWalker.nextNode() as Text) {
    const val = (textNode.nodeValue || '').trim();
    if (val.startsWith('http') && (val.endsWith('.png') || val.endsWith('.jpg') || val.endsWith('.jpeg') || val.includes('/company_logos/') || val.includes('/signatures/') || val.includes('/training-media/'))) {
      nodesToReplace.push({ node: textNode, url: val });
    }
  }
  for (const { node, url } of nodesToReplace) {
    const img = printWindow.document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.maxHeight = '55px';
    img.style.display = 'block';
    img.style.marginTop = '4px';
    img.style.marginBottom = '4px';
    img.style.marginLeft = 'auto';
    img.style.marginRight = 'auto';
    img.style.objectFit = 'contain';
    if (url.includes('/signatures/')) {
      img.style.maxWidth = '100%';
      img.style.maxHeight = '65px';
    }
    node.parentNode?.replaceChild(img, node);
  }

  const svgs = Array.from(targetRoot.getElementsByTagName('svg'));
  for (const svg of svgs) {
    const imageNode = svg.querySelector('image');
    if (imageNode) {
      const rawSrc = imageNode.getAttribute('href') || 
                     imageNode.getAttribute('xlink:href') || 
                     (imageNode as any).src || 
                     '';
                     
      if (rawSrc) {
        const w = svg.getAttribute('width') || imageNode.getAttribute('width') || '';
        const h = svg.getAttribute('height') || imageNode.getAttribute('height') || '';
        
        const img = printWindow.document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.src = rawSrc;
        
        const formatDimension = (val: string): string => {
          if (!val) return '';
          if (/^[0-9.]+$/.test(val.trim())) return `${val.trim()}px`;
          return val.trim();
        };
        
        if (w) img.style.width = formatDimension(w);
        if (h) img.style.height = formatDimension(h);
        
        img.style.display = 'inline-block';
        img.style.verticalAlign = 'middle';
        img.style.objectFit = 'contain';
        img.className = svg.className.baseVal || '';
        
        svg.parentNode?.replaceChild(img, svg);
      }
    }
  }

  if (data?.logoUrl) {
    const possibleLogos = Array.from(targetRoot.querySelectorAll('table img, header img, section.docx > img'));
    if (possibleLogos.length > 0) {
      const logoImg = possibleLogos[0] as HTMLImageElement;
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = data.logoUrl;
    }
  }
  
  if (data?.representativeSignatureUrl) {
    const allImgs = Array.from(targetRoot.querySelectorAll('img'));
    if (allImgs.length > 0) {
      const sigImg = allImgs[allImgs.length - 1] as HTMLImageElement;
      if (allImgs.length > 1 || sigImg.src !== data?.logoUrl) {
        sigImg.crossOrigin = 'anonymous';
        sigImg.src = data.representativeSignatureUrl;
      }
    }
  }

  // Set initial dynamic page numbers in headers/footers
  const pages = Array.from(targetRoot.querySelectorAll('section.docx, .docx-page, section'));
  const totalPages = pages.length || 1;
  for (let i = 0; i < totalPages; i++) {
    const pageEl = pages[i] as HTMLElement;
    if (pageEl) {
      updatePageNumbersInElement(pageEl, i + 1, totalPages);
    }
  }

  // 7. Add button action listeners
  printWindow.document.getElementById('btnPrint')!.onclick = () => {
    printWindow.print();
  };

  printWindow.document.getElementById('btnClose')!.onclick = () => {
    printWindow.close();
  };
}
