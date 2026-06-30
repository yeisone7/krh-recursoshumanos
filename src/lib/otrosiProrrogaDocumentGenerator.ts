import PizZip from 'pizzip';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface OtrosiProrrogaDocumentData {
  companyName: string;
  employeeFullName: string;
  employeeDocumentType: string;
  employeeDocumentNumber: string;
  employeePosition: string;
  contractStartDate: Date;
  originalEndDate: Date;
  extensionEndDate: Date;
  extensionNumber: number;
  initialDurationLabel: string;
  documentDate: Date;
  documentCity: string;
  employerSignerName: string;
  employerSignerPosition: string;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function dayToWords(day: number): string {
  const words = [
    '',
    'primero',
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
  return words[day] || day.toString();
}

function datePhrase(date: Date, includeDayWord = true): string {
  const day = parseInt(format(date, 'd'), 10);
  const month = capitalize(format(date, 'MMMM', { locale: es }));
  const year = format(date, 'yyyy');
  const dayText = includeDayWord ? `${capitalize(dayToWords(day))} (${format(date, 'dd')})` : format(date, 'd');
  return `${dayText} del mes de ${month} del año ${year}`;
}

function extensionEndPhrase(date: Date): string {
  const day = parseInt(format(date, 'd'), 10);
  const month = capitalize(format(date, 'MMMM', { locale: es }));
  const year = format(date, 'yyyy');
  return `${capitalize(dayToWords(day))} (${format(date, 'dd')}) de ${month} del año ${year}`;
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

function replaceParagraphText(paragraphXml: string, lines: string[]): string {
  let textNodeIndex = 0;

  return paragraphXml.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, (textNode) => {
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

function applyOtrosiData(documentXml: string, data: OtrosiProrrogaDocumentData): string {
  let xml = documentXml;
  const companyName = data.companyName.toUpperCase();
  const employeeName = data.employeeFullName.toUpperCase();

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('OTROSÍ No.'),
    [`OTROSÍ No. ${data.extensionNumber} DE PRÓRROGA PACTADA AL CONTRATO DE TRABAJO SUSCRITO ENTRE ${companyName} Y ${employeeName}`]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('PRIMERA. Las partes celebraron'),
    [`PRIMERA. Las partes celebraron contrato de trabajo a término fijo en fecha el ${datePhrase(data.contractStartDate).toLowerCase()}, con una duración inicial de ${data.initialDurationLabel}.`]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('SEGUNDA. El plazo pactado vencía'),
    [`SEGUNDA. El plazo pactado vencía el día ${datePhrase(data.originalEndDate)}, razón por la cual se notificó el aviso previo a la terminación del contrato, con el tiempo de anterioridad estipulado por la ley (30 días de antelación).`]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('PRIMERA. – PRÓRROGA') || text.startsWith('PRIMERA. - PRÓRROGA'),
    [
      `PRIMERA. – PRÓRROGA. El contrato de trabajo a término fijo suscrito entre las partes se prorroga hasta el día ${extensionEndPhrase(data.extensionEndDate)}, fecha en la cual se entenderá terminado por vencimiento del plazo pactado, conforme al artículo 61 literal c) del C.S.T.`,
      'Se deja expresa constancia de que el término pactado en el presente otrosí se encuentra dentro de las prórrogas permitidas por el artículo 46 del Código Sustantivo del Trabajo, modificado por el artículo 6 de la Ley 2466 de 2025, y no supera aún la cuarta (4ª) prórroga. En consecuencia, esta prórroga es válida. Se advierte igualmente que, al cumplirse la cuarta prórroga, cualquier prórroga posterior (quinta en adelante) solo podrá pactarse por un término igual o superior a un (1) año, en los términos de la norma citada, sin que se supere un término entre prorrogas de 4 años consecutivos.',
    ]
  );

  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('En constancia de lo anterior'),
    [`En constancia de lo anterior, se firma el presente otrosí en la ciudad de ${data.documentCity}, a los ${format(data.documentDate, 'd')} días del mes de ${capitalize(format(data.documentDate, 'MMMM', { locale: es }))} del año ${format(data.documentDate, 'yyyy')}.`]
  );

  xml = replaceMatchingParagraph(xml, (text) => text.includes('EDNA MARGARITA CEPEDA ARDILA'), [data.employerSignerName.toUpperCase()]);
  xml = replaceMatchingParagraph(xml, (text) => text.includes('Dir. Jurídica') || text.includes('Dir. JurÃ­dica'), [data.employerSignerPosition]);
  xml = replaceMatchingParagraph(xml, (text) => text.trim() === 'PETROCASINOS S.A.', [companyName]);
  xml = replaceMatchingParagraph(xml, (text) => text.includes('MORENO ARIZA DANIA VALEXKA'), [employeeName]);
  xml = replaceMatchingParagraph(
    xml,
    (text) => text.startsWith('C.C.') || text.startsWith('Cargo:'),
    [`${data.employeeDocumentType} ${data.employeeDocumentNumber}`, `Cargo: ${data.employeePosition}`]
  );

  return xml;
}

async function loadOtrosiTemplate(): Promise<ArrayBuffer> {
  const response = await fetch('/templates/otrosi-prorroga-pactada.docx');
  if (!response.ok) {
    throw new Error('No se pudo cargar la plantilla de otrosí de prórroga');
  }
  return await response.arrayBuffer();
}

export async function generateOtrosiProrrogaFromTemplate(data: OtrosiProrrogaDocumentData): Promise<Blob> {
  const templateBuffer = await loadOtrosiTemplate();
  const zip = new PizZip(templateBuffer);
  const documentFile = zip.file('word/document.xml');

  if (!documentFile) {
    throw new Error('La plantilla de otrosí no contiene word/document.xml');
  }

  zip.file('word/document.xml', applyOtrosiData(documentFile.asText(), data));

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function downloadOtrosiProrrogaDocument(blob: Blob, employeeName: string, extensionNumber: number): void {
  const cleanName = employeeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const filename = `Otrosi_Prorroga_${extensionNumber}_${cleanName}_${format(new Date(), 'yyyyMMdd')}.docx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function generateAndDownloadOtrosiProrroga(data: OtrosiProrrogaDocumentData): Promise<void> {
  const blob = await generateOtrosiProrrogaFromTemplate(data);
  downloadOtrosiProrrogaDocument(blob, data.employeeFullName, data.extensionNumber);
}
