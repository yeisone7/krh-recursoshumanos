import PizZip from 'pizzip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { TerminationDocumentData } from '@/types/termination';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function numberToWords(num: number): string {
  const digits = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciséis',
    'diecisiete',
    'dieciocho',
    'diecinueve',
    'veinte',
    'veintiuno',
    'veintidós',
    'veintitrés',
    'veinticuatro',
    'veinticinco',
    'veintiséis',
    'veintisiete',
    'veintiocho',
    'veintinueve',
    'treinta',
    'treinta y uno',
  ];
  return digits[num] || num.toString();
}

function preparePreavisoTemplateData(data: TerminationDocumentData): Record<string, string> {
  const today = data.documentDate;
  const effectiveDate = data.effectiveDate;

  const dayNumber = parseInt(format(today, 'd'), 10);
  const dayWord = numberToWords(dayNumber);
  const month = capitalize(format(today, 'MMMM', { locale: es }));
  const year = format(today, 'yyyy');

  const effectiveDayNumber = parseInt(format(effectiveDate, 'd'), 10);
  const effectiveDayWord = numberToWords(effectiveDayNumber);
  const effectiveMonth = capitalize(format(effectiveDate, 'MMMM', { locale: es }));
  const effectiveYear = format(effectiveDate, 'yyyy');

  return {
    FECHA_TEXTO: `${capitalize(dayWord)} (${dayNumber}) de ${month} de ${year}`,
    EMPLEADO_NOMBRE: data.employeeFullName.toUpperCase(),
    EMPLEADO_CENTRO_OPERACION: data.employeeOperationCenter || '',
    CONTRATO_FECHA_FIN_TEXTO: `${effectiveDayWord} (${effectiveDayNumber}) de ${effectiveMonth.toLowerCase()} de ${effectiveYear}`,
    LIDER_NOMBRE: data.hrManagerName || 'Director(a) de Talento Humano',
    LIDER_CARGO: data.hrManagerPosition || 'Líder de Talento Humano',
    EMPRESA_NOMBRE: data.companyName,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function decodeXml(value: string): string {
  return value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function getParagraphText(paragraphXml: string): string {
  return [...paragraphXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((match) => decodeXml(match[1]))
    .join('');
}

function stripHighlightFormatting(paragraphXml: string): string {
  return paragraphXml
    .replace(/<w:highlight\b[^>]*\/>/g, '')
    .replace(/<w:shd\b[^>]*w:fill="(?:FFFF00|ffff00|yellow)"[^>]*\/>/g, '');
}

function replaceParagraphText(paragraphXml: string, lines: string[]): string {
  let textNodeIndex = 0;
  const cleanParagraphXml = stripHighlightFormatting(paragraphXml);

  return cleanParagraphXml.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, (textNode) => {
    if (textNodeIndex === 0) {
      textNodeIndex += 1;
      return lines
        .map((line, index) => `${index > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${escapeXml(line)}</w:t>`)
        .join('');
    }

    textNodeIndex += 1;
    return textNode.replace(/(<w:t(?:\s[^>]*)?>)[\s\S]*?(<\/w:t>)/, '$1$2');
  });
}

function replaceMatchingParagraph(
  documentXml: string,
  predicate: (text: string) => boolean,
  lines: string[]
): string {
  return documentXml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = getParagraphText(paragraph);
    return predicate(text) ? replaceParagraphText(paragraph, lines) : paragraph;
  });
}

function applyPreavisoData(documentXml: string, templateData: Record<string, string>): string {
  let xml = documentXml;

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('Bucaramanga,'),
    [`Bucaramanga, ${templateData.FECHA_TEXTO}.`]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.includes('NOMBRE DEL TRABAJADOR') || text.includes('CAMPO:'),
    [templateData.EMPLEADO_NOMBRE, `CAMPO: ${templateData.EMPLEADO_CENTRO_OPERACION || 'N/A'}`]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.includes('su contrato a término fijo') || text.includes('su contrato a tÃ©rmino fijo'),
    [
      `Atentamente, a través de la presente, me permito comunicarle con la anticipación que estipula el Artículo 46 del C.S.T. hoy, DURT (1072 del 2015), que su contrato a término fijo inferior a un año termina el día ${templateData.CONTRATO_FECHA_FIN_TEXTO}, el cual no será renovado.`,
    ]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.includes('EDNA MARGARITA CEPEDA ARDILA') || text.includes('FERNANDO DIAZ'),
    [templateData.LIDER_NOMBRE.toUpperCase()]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.includes('DIRECTORA JURÍDICA') || text.includes('LÍDER DE TALENTO HUMANO') || text.includes('LIDER DE TALENTO HUMANO'),
    [templateData.LIDER_CARGO.toUpperCase()]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.includes('PETROCASINOS S.A.'),
    [templateData.EMPRESA_NOMBRE.toUpperCase()]
  );

  return xml;
}

async function loadPreavisoTemplate(): Promise<ArrayBuffer> {
  const response = await fetch('/templates/preaviso-no-renovacion.docx');
  if (!response.ok) {
    throw new Error('No se pudo cargar la plantilla de preaviso');
  }
  return await response.arrayBuffer();
}

export async function generatePreavisoFromTemplate(data: TerminationDocumentData): Promise<Blob> {
  const templateBuffer = await loadPreavisoTemplate();
  const zip = new PizZip(templateBuffer);
  const documentFile = zip.file('word/document.xml');

  if (!documentFile) {
    throw new Error('La plantilla de preaviso no contiene word/document.xml');
  }

  zip.file('word/document.xml', applyPreavisoData(documentFile.asText(), preparePreavisoTemplateData(data)));

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

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

export async function generateAndDownloadPreaviso(data: TerminationDocumentData): Promise<void> {
  const blob = await generatePreavisoFromTemplate(data);
  downloadPreavisoDocument(blob, data.employeeFullName);
}
