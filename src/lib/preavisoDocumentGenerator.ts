import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TerminationDocumentData } from '@/types/termination';

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Convert number to words (Spanish)
function numberToWords(num: number): string {
  const digits = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
    'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis',
    'veintisiete', 'veintiocho', 'veintinueve', 'treinta', 'treinta y uno'];
  return digits[num] || num.toString();
}

// Prepare template data for preaviso document
function preparePreavsoTemplateData(data: TerminationDocumentData): Record<string, string> {
  const today = data.documentDate;
  const effectiveDate = data.effectiveDate;

  const dayNumber = parseInt(format(today, 'd'));
  const dayWord = numberToWords(dayNumber);
  const month = capitalize(format(today, 'MMMM', { locale: es }));
  const year = format(today, 'yy'); // 2-digit year

  const effectiveDayNumber = format(effectiveDate, 'd');
  const effectiveMonth = capitalize(format(effectiveDate, 'MMMM', { locale: es }));
  const effectiveYear = format(effectiveDate, 'yyyy');

  return {
    // Document date parts
    FECHA_DIA_NUMERO: format(today, 'd'),
    FECHA_DIA_LETRAS: capitalize(dayWord),
    FECHA_MES: month,
    FECHA_ANIO: year,
    FECHA_ANIO_COMPLETO: format(today, 'yyyy'),

    // Employee
    EMPLEADO_NOMBRE: data.employeeFullName.toUpperCase(),
    EMPLEADO_CARGO: data.employeePosition || '',
    EMPLEADO_CENTRO_OPERACION: data.employeeOperationCenter || '',

    // Contract end date
    CONTRATO_FIN_DIA: effectiveDayNumber,
    CONTRATO_FIN_MES: effectiveMonth,
    CONTRATO_FIN_ANIO: effectiveYear,
    CONTRATO_FECHA_FIN_TEXTO: `${effectiveDayNumber} de ${effectiveMonth.toLowerCase()} de ${effectiveYear}`,

    // HR Manager
    LIDER_NOMBRE: data.hrManagerName || 'Director(a) de Talento Humano',
    LIDER_CARGO: data.hrManagerPosition || 'Líder de Talento Humano',

    // Company
    EMPRESA_NOMBRE: data.companyName,
  };
}

// Load the preaviso template from public folder
async function loadPreavisoTemplate(): Promise<ArrayBuffer> {
  const response = await fetch('/templates/preaviso-no-renovacion.docx');
  if (!response.ok) {
    throw new Error('No se pudo cargar la plantilla de preaviso');
  }
  return await response.arrayBuffer();
}

// Generate preaviso document from DOCX template
export async function generatePreavisoFromTemplate(
  data: TerminationDocumentData
): Promise<Blob> {
  // Load the template
  const templateBuffer = await loadPreavisoTemplate();

  // Load the template with PizZip
  const zip = new PizZip(templateBuffer);

  // Create docxtemplater instance with custom delimiters matching the template
  // The template uses blanks like _______ that we'll need to replace
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Get template data
  const templateData = preparePreavsoTemplateData(data);

  // Render the document
  doc.render(templateData);

  // Generate the output
  const out = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
}

// Download the generated document
export function downloadPreavisoDocument(blob: Blob, employeeName: string): void {
  const cleanName = employeeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Preaviso_No_Renovacion_${cleanName}_${format(new Date(), 'yyyyMMdd')}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Main export function to generate and download preaviso
export async function generateAndDownloadPreaviso(data: TerminationDocumentData): Promise<void> {
  try {
    const blob = await generatePreavisoFromTemplate(data);
    downloadPreavisoDocument(blob, data.employeeFullName);
  } catch (error) {
    console.error('Error generating preaviso document:', error);
    throw error;
  }
}
