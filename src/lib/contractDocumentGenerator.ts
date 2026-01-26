import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

// Contract document data interface
export interface ContractDocumentData {
  // Company info
  companyName: string;
  companyNit: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  
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
  
  // Contract info
  contractType: string;
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
  
  // Clauses
  hasNonCompeteClause: boolean;
  hasConfidentialityClause: boolean;
  specialClauses?: string;
  
  // Generation info
  generationDate: Date;
  generationCity?: string;
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format date in Spanish words
function formatDateInWords(date: Date): string {
  const day = format(date, 'd', { locale: es });
  const month = format(date, 'MMMM', { locale: es });
  const year = format(date, 'yyyy', { locale: es });
  return `${day} de ${month} de ${year}`;
}

// Capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Convert number to words (Spanish)
function numberToWords(num: number): string {
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
  const salaryWords = capitalize(numberToWords(data.salary));
  
  return {
    // Company
    EMPRESA_NOMBRE: data.companyName,
    EMPRESA_NIT: data.companyNit,
    EMPRESA_DIRECCION: data.companyAddress || '',
    EMPRESA_TELEFONO: data.companyPhone || '',
    EMPRESA_EMAIL: data.companyEmail || '',
    
    // Employee
    EMPLEADO_NOMBRE_COMPLETO: data.employeeFullName,
    EMPLEADO_NOMBRES: data.employeeFirstName,
    EMPLEADO_APELLIDOS: data.employeeLastName,
    EMPLEADO_TIPO_DOCUMENTO: data.employeeDocumentType,
    EMPLEADO_DOCUMENTO: data.employeeDocumentNumber,
    EMPLEADO_DIRECCION: data.employeeAddress || '',
    EMPLEADO_CIUDAD: data.employeeCity || '',
    EMPLEADO_TELEFONO: data.employeePhone || '',
    EMPLEADO_EMAIL: data.employeeEmail || '',
    EMPLEADO_FECHA_NACIMIENTO: data.employeeBirthDate || '',
    EMPLEADO_CARGO: data.employeePosition,
    EMPLEADO_CENTRO_OPERACION: data.employeeOperationCenter || '',
    
    // Contract
    CONTRATO_TIPO: data.contractType,
    CONTRATO_TIPO_TEXTO: data.contractTypeDisplay,
    CONTRATO_FECHA_INICIO: format(data.startDate, 'dd/MM/yyyy'),
    CONTRATO_FECHA_INICIO_LETRAS: formatDateInWords(data.startDate),
    CONTRATO_FECHA_FIN: data.endDate ? format(data.endDate, 'dd/MM/yyyy') : 'No aplica',
    CONTRATO_FECHA_FIN_LETRAS: data.endDate ? formatDateInWords(data.endDate) : 'No aplica',
    CONTRATO_SALARIO: formatCurrency(data.salary),
    CONTRATO_SALARIO_NUMERO: data.salary.toString(),
    CONTRATO_SALARIO_LETRAS: salaryWords + ' pesos M/CTE',
    CONTRATO_TIPO_SALARIO: data.salaryType === 'mensual' ? 'Salario Ordinario Mensual' : 'Salario Integral',
    CONTRATO_AUXILIO_TRANSPORTE: data.transportAllowance ? 'Sí' : 'No',
    CONTRATO_AUXILIO_TRANSPORTE_VALOR: data.transportAllowance && data.transportAllowanceAmount 
      ? formatCurrency(data.transportAllowanceAmount) 
      : 'No aplica',
    CONTRATO_PERIODO_PRUEBA: data.trialPeriodDays ? `${data.trialPeriodDays} días` : 'No aplica',
    CONTRATO_CIUDAD_TRABAJO: data.workCity || '',
    CONTRATO_DIRECCION_TRABAJO: data.workAddress || '',
    
    // Clauses
    CLAUSULA_NO_COMPETENCIA: data.hasNonCompeteClause ? 'Sí aplica' : 'No aplica',
    CLAUSULA_CONFIDENCIALIDAD: data.hasConfidentialityClause ? 'Sí aplica' : 'No aplica',
    CLAUSULAS_ESPECIALES: data.specialClauses || 'Ninguna',
    
    // Generation
    FECHA_GENERACION: format(today, 'dd/MM/yyyy'),
    FECHA_GENERACION_LETRAS: formatDateInWords(today),
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
  
  return await data.arrayBuffer();
}

// Generate contract document from DOCX template
export async function generateContractFromTemplate(
  templateUrl: string,
  data: ContractDocumentData
): Promise<Blob> {
  // Download the template
  const templateBuffer = await downloadTemplate(templateUrl);
  
  // Load the template with PizZip
  const zip = new PizZip(templateBuffer);
  
  // Create docxtemplater instance
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });
  
  // Get template data
  const templateData = prepareTemplateData(data);
  
  // Render the document
  doc.render(templateData);
  
  // Generate the output
  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  
  return out;
}

// Generate a basic PDF contract (fallback when no template)
export function generateBasicContractPDF(data: ContractDocumentData): jsPDF {
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
  let clause4 = `EL EMPLEADOR pagará a EL TRABAJADOR un ${data.salaryType === 'mensual' ? 'salario mensual' : 'salario integral'} de ${formatCurrency(data.salary)} (${capitalize(numberToWords(data.salary))} pesos M/CTE).`;
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
  pdf.save(filename);
}
