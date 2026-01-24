import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  TerminationDocumentData, 
  TerminationType,
  TerminationDocumentType,
  terminationTypeLabels,
} from '@/types/termination';

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper to format date in Spanish letters
function formatDateInWords(date: Date): string {
  const day = format(date, 'd', { locale: es });
  const month = format(date, 'MMMM', { locale: es });
  const year = format(date, 'yyyy', { locale: es });
  return `${day} de ${month} de ${year}`;
}

// Helper to capitalize first letter
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Base PDF configuration
function createBasePDF(): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  });
  
  doc.setFont('helvetica');
  return doc;
}

// Add header to PDF
function addHeader(doc: jsPDF, data: TerminationDocumentData, title: string): number {
  let y = 20;
  
  // Company name
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
  doc.text(title.toUpperCase(), 105, y, { align: 'center' });
  
  return y + 15;
}

// Add signature lines
function addSignatureLines(doc: jsPDF, y: number, data: TerminationDocumentData, includeEmployee = true): number {
  y += 25;
  
  const leftX = 30;
  const rightX = 130;
  const lineWidth = 50;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Left signature (HR Manager)
  doc.line(leftX, y, leftX + lineWidth, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, leftX + lineWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, leftX + lineWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(data.companyName, leftX + lineWidth / 2, y, { align: 'center' });
  
  if (includeEmployee) {
    // Right signature (Employee)
    const employeeY = y - 13;
    doc.line(rightX, employeeY, rightX + lineWidth, employeeY);
    doc.setFont('helvetica', 'bold');
    doc.text(data.employeeFullName, rightX + lineWidth / 2, employeeY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('TRABAJADOR', rightX + lineWidth / 2, employeeY + 9, { align: 'center' });
    doc.text(`C.C. ${data.employeeDocumentNumber}`, rightX + lineWidth / 2, employeeY + 13, { align: 'center' });
  }
  
  return y + 15;
}

// 01 - Terminación por Mutuo Acuerdo
export function generateMutuoAcuerdoPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  let y = addHeader(doc, data, 'TERMINACIÓN POR MUTUO ACUERDO DEL CONTRATO DE TRABAJO');
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Introduction
  const intro = `Entre el trabajador ${data.employeeFullName} identificado con ${data.employeeDocumentType} ${data.employeeDocumentNumber} y la empresa ${data.companyName}, se celebró CONTRATO DE TRABAJO ${data.contractType.toUpperCase()} el día ${formatDateInWords(data.contractStartDate)}. De acuerdo con lo anterior, por consenso entre las partes de forma voluntaria y con base en el artículo 61 literal b) del Código Sustantivo del Trabajo, se acuerda lo siguiente:`;
  
  const introLines = doc.splitTextToSize(intro, textWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 10;
  
  // PRIMERO
  doc.setFont('helvetica', 'bold');
  doc.text('PRIMERO:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const primero = `Que EL TRABAJADOR se compromete a prestar sus servicios para ${data.companyName} hasta el día ${formatDateInWords(data.effectiveDate)}.`;
  const primeroLines = doc.splitTextToSize(primero, textWidth);
  doc.text(primeroLines, margin, y);
  y += primeroLines.length * 5 + 8;
  
  // SEGUNDO
  doc.setFont('helvetica', 'bold');
  doc.text('SEGUNDO:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const segundo = `Con base en lo anterior, las partes acuerdan para todos los efectos legales el día ${formatDateInWords(data.effectiveDate)} como FECHA DE TERMINACIÓN del contrato en mención, terminación con base en el Artículo 61 literal b) del C.S.T. y la autonomía de la voluntad.`;
  const segundoLines = doc.splitTextToSize(segundo, textWidth);
  doc.text(segundoLines, margin, y);
  y += segundoLines.length * 5 + 8;
  
  // TERCERO
  doc.setFont('helvetica', 'bold');
  doc.text('TERCERO:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const tercero = `Principio del acto propio y buena fe de los contratantes. Las partes declaran de acuerdo al principio enunciado, que actúan en el presente contrato en virtud de la buena fe, autonomía de la voluntad privada e igualdad contractual.`;
  const terceroLines = doc.splitTextToSize(tercero, textWidth);
  doc.text(terceroLines, margin, y);
  y += terceroLines.length * 5 + 8;
  
  // CUARTO
  doc.setFont('helvetica', 'bold');
  doc.text('CUARTO:', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const cuarto = `Se deja constancia, mediante este documento, que todo lo aquí escrito fue pactado de forma libre, voluntaria, de buena fe y sin presión de ninguna naturaleza por parte de quienes suscriben este acuerdo.`;
  const cuartoLines = doc.splitTextToSize(cuarto, textWidth);
  doc.text(cuartoLines, margin, y);
  y += cuartoLines.length * 5 + 10;
  
  // Final paragraph
  const final = `${data.companyName} y ${data.employeeFullName} aceptan de forma voluntaria y sin que medie algún vicio del consentimiento, que es cierto lo declarado anteriormente y ambas partes aceptan la forma de terminar por mutuo consentimiento el contrato de trabajo en la fecha anteriormente estipulada, con base en las facultades conferidas a las partes en el Artículo 61 literal b) del Código Sustantivo del Trabajo.`;
  const finalLines = doc.splitTextToSize(final, textWidth);
  doc.text(finalLines, margin, y);
  y += finalLines.length * 5 + 10;
  
  // Signing location and date
  doc.text(`En señal de acuerdo se firma en ${data.documentCity} el día ${formatDateInWords(data.documentDate)}.`, margin, y);
  
  y = addSignatureLines(doc, y, data);
  
  return doc;
}

// 02 - Aviso Previo (Preaviso)
export function generatePreavisoPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date and location
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${capitalize(formatDateInWords(data.documentDate))}`, margin, y);
  
  y += 15;
  
  // Recipient
  doc.text('Señor(a):', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeFullName.toUpperCase(), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  if (data.employeeOperationCenter) {
    doc.text(`Campo: ${data.employeeOperationCenter}`, margin, y);
    y += 10;
  }
  
  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('ASUNTO: Aviso Previo a la terminación del contrato', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  
  const body = `Atentamente, a través de la presente, me permito comunicarle con la anticipación que estipula el Artículo 46 del C.S.T. hoy, DURT (1072 del 2015), que su contrato a término fijo termina el día ${formatDateInWords(data.effectiveDate)}, el cual no será renovado.

Si las partes deciden continuar con la relación laboral pese a lo indicado en el presente escrito, este documento no produciría ningún efecto y por lo tanto no implicaría una modificación en el término de duración del contrato inicialmente pactado.

Agradeciendo de antemano los servicios prestados, el buen desempeño y la labor realizada por usted.`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 15;
  
  doc.text('Cordialmente,', margin, y);
  y += 20;
  
  // Single signature
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  return doc;
}

// 03 - Terminación por Periodo de Prueba
export function generatePeriodoPruebaPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  let y = addHeader(doc, data, 'TERMINACIÓN POR PERIODO DE PRUEBA DEL CONTRATO DE TRABAJO');
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const intro = `Por medio de la presente, le notificamos que a partir de la firma del presente documento, damos por finalizado el contrato de trabajo del ${formatDateInWords(data.contractStartDate)} celebrado con usted, en concordancia de lo establecido en los siguientes términos:`;
  
  const introLines = doc.splitTextToSize(intro, textWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 10;
  
  // Article 76
  const art76 = `El artículo 76 del Código Sustantivo del Trabajo, expresa: "Art. 76. Definición. Período de prueba es la etapa inicial del contrato de trabajo que tiene por objeto, por parte del patrono, apreciar las aptitudes del trabajador, y por parte de éste, la conveniencia de las condiciones del trabajo."`;
  const art76Lines = doc.splitTextToSize(art76, textWidth);
  doc.text(art76Lines, margin, y);
  y += art76Lines.length * 5 + 8;
  
  // Article 80
  const art80 = `Igualmente, respecto al efecto jurídico, el artículo 80 del enunciado código, expresa:

ART. 80. Modificado. D. 617/54, art. 3° Efecto Jurídico. 1. El período de prueba puede darse por terminado unilateralmente en cualquier momento, sin previo aviso. 2. Los trabajadores en período de prueba gozan de todas las prestaciones.`;
  const art80Lines = doc.splitTextToSize(art80, textWidth);
  doc.text(art80Lines, margin, y);
  y += art80Lines.length * 5 + 15;
  
  doc.text(`En señal de acuerdo se firma en ${data.documentCity} el día ${formatDateInWords(data.documentDate)}.`, margin, y);
  
  y = addSignatureLines(doc, y, data);
  
  return doc;
}

// 04 - Terminación por Obra Labor
export function generateObraLaborPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date and location
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${capitalize(formatDateInWords(data.documentDate))}`, margin, y);
  y += 15;
  
  // Recipient
  doc.text('Señor(a)', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeFullName.toUpperCase(), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.employeeDocumentType} ${data.employeeDocumentNumber}`, margin, y);
  y += 5;
  if (data.employeeOperationCenter) {
    doc.text(`Campo: ${data.employeeOperationCenter}`, margin, y);
  }
  y += 10;
  
  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('Ref.: Terminación de su contrato de trabajo por finalización de la obra o labor.', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  
  const body1 = `Por medio de la presente comunicación, atentamente nos permitimos informarle que, a partir de la fecha de esta comunicación, terminará su contrato de trabajo con esta compañía por haberse culminado la duración de la obra o labor para la cual fue contratado(a) desde el día ${formatDateInWords(data.contractStartDate)}.`;
  const body1Lines = doc.splitTextToSize(body1, textWidth);
  doc.text(body1Lines, margin, y);
  y += body1Lines.length * 5 + 8;
  
  if (data.reason) {
    const reasonText = `Motivo: ${data.reason}`;
    const reasonLines = doc.splitTextToSize(reasonText, textWidth);
    doc.text(reasonLines, margin, y);
    y += reasonLines.length * 5 + 8;
  }
  
  const body2 = `Por lo anterior, le será entregado por parte del Departamento de Talento Humano los documentos pertinentes a la terminación del contrato, entre los cuales se entrega; paz y salvo, certificación laboral, autorización para examen de egreso. Su liquidación laboral le será pagada y consignada a su cuenta de nómina dentro de los 15 días siguientes a la terminación del contrato.

Finalmente, con esta carta le entregamos copia de las autoliquidaciones correspondientes a los tres últimos meses del sistema de seguridad social integral (Riesgos profesionales, salud y pensión) y los Aportes Parafiscales.`;
  
  const body2Lines = doc.splitTextToSize(body2, textWidth);
  doc.text(body2Lines, margin, y);
  y += body2Lines.length * 5 + 15;
  
  doc.text('Atentamente,', margin, y);
  y += 15;
  
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  y += 15;
  doc.text('Recibí: ______________________________', margin, y);
  
  return doc;
}

// 05 - Terminación Sin Justa Causa
export function generateSinJustaCausaPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date and location
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${capitalize(formatDateInWords(data.documentDate))}`, margin, y);
  y += 15;
  
  // Recipient
  doc.text('Señor', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeFullName.toUpperCase(), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.employeeDocumentType} ${data.employeeDocumentNumber}`, margin, y);
  y += 5;
  if (data.employeeOperationCenter) {
    doc.text(`Campo: ${data.employeeOperationCenter}`, margin, y);
  }
  y += 10;
  
  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('ASUNTO: TERMINACIÓN DEL CONTRATO DE TRABAJO SIN JUSTAS CAUSAS. ART. 64 C.S.T.', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  
  const body = `Respetuosamente le comunico y notifico que con fundamento y de conformidad con el artículo 64 del Código Sustantivo de Trabajo, modificado por el artículo 28 de la Ley 789 de 2002, la empresa, ha decidido terminar y cancelar unilateralmente y sin justas causas su contrato de trabajo firmado el día ${formatDateInWords(data.contractStartDate)}; terminación de contrato que se hará efectiva el día ${formatDateInWords(data.effectiveDate)} a la finalización de la jornada laboral.

Hará entrega de su puesto y demás elementos de trabajo, e igualmente le informo que en 15 días hábiles siguientes a la terminación del contrato, le será pagada la liquidación definitiva de salarios, prestaciones sociales, vacaciones e indemnización correspondiente de acuerdo a lo contemplado en el Art. 64 del CST, previas las deducciones autorizadas; advirtiéndole que en caso de no presentarse a reclamar o negarse a recibir su liquidación, nuestra entidad procederá inmediatamente a solicitar permiso ante el JUZGADO LABORAL COMPETENTE dentro de su jurisdicción, para realizar el pago a través de consignación en la cuenta de depósitos judiciales del BANCO AGRARIO S.A de conformidad con el artículo 65 del Código Sustantivo de Trabajo.

La empresa, le agradece los servicios prestados durante el tiempo que laboró para ella.`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 15;
  
  doc.text('Cordialmente,', margin, y);
  y += 15;
  
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  y += 15;
  doc.text('Recibí: ______________________________', margin, y);
  
  return doc;
}

// 06 - Notificación de Aportes
export function generateNotificacionAportesPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date and location
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${capitalize(formatDateInWords(data.documentDate))}`, margin, y);
  y += 15;
  
  // Recipient
  doc.text('Señor(a):', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeFullName.toUpperCase(), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.employeeDocumentType} ${data.employeeDocumentNumber}`, margin, y);
  y += 5;
  if (data.employeeOperationCenter) {
    doc.text(`Campo: ${data.employeeOperationCenter}`, margin, y);
  }
  y += 10;
  
  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('Asunto: Notificación del estado de pagos de aportes a seguridad social y parafiscales.', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  
  const body = `Estimado señor(a) ${data.employeeFullName.split(' ')[1] || data.employeeFullName},

En cumplimiento de lo establecido en el parágrafo 1° del artículo 65 del Código Sustantivo del Trabajo, nos permitimos informarle que, con ocasión de la terminación de su contrato de trabajo el día ${formatDateInWords(data.effectiveDate)}, se realizaron los pagos correspondientes a las cotizaciones de seguridad social y parafiscales de los últimos tres (3) meses de vinculación laboral.

Adjuntamos a la presente copia de los comprobantes de pago correspondientes para su conocimiento y constancia.

Agradecemos el tiempo que formó parte de nuestra organización y le deseamos éxito en sus proyectos futuros.`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 15;
  
  doc.text('Cordialmente,', margin, y);
  y += 15;
  
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  y += 15;
  doc.text('Recibí: ______________________________', margin, y);
  
  return doc;
}

// 07 - Aceptación de Renuncia
export function generateAceptacionRenunciaPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date and location
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${capitalize(formatDateInWords(data.documentDate))}`, margin, y);
  y += 15;
  
  // Recipient
  doc.text('Señor(a)', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeFullName.toUpperCase(), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.employeeDocumentType} ${data.employeeDocumentNumber}`, margin, y);
  y += 10;
  
  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('ASUNTO: Aceptación de renuncia.', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  
  const resignationDateStr = data.resignationDate 
    ? formatDateInWords(data.resignationDate)
    : 'la fecha indicada en su carta';
  
  const body = `Por medio de la presente, recibimos su carta de renuncia con fecha ${resignationDateStr}. Hemos revisado detenidamente su solicitud y la empresa acepta su renuncia efectiva a partir del ${formatDateInWords(data.effectiveDate)} de conformidad con las disposiciones legales aplicables.

Para su renuncia, la terminación del contrato, la empresa se basa en el literal h del artículo 5º de la Ley 50 de 1990, norma que subrogó al artículo 61 del Código Sustantivo del Trabajo, contenido en el Decreto único Reglamentario del Trabajo (DURT) 1072 de 2015 que hace referencia a la terminación unilateral del contrato.

Es importante destacar que, de acuerdo con los artículos 1502 y 1503 del Código Civil Colombiano, usted cuenta con la capacidad legal necesaria para realizar este acto de renuncia, ya que es legalmente capaz y su consentimiento no adolece de vicio alguno.

Le agradecemos por sus servicios y contribuciones durante su tiempo en nuestra empresa. Le deseamos éxito en sus futuros proyectos. Igualmente le manifestamos que lo correspondiente a su liquidación se cancelará en los próximos días de acuerdo con las disposiciones consagradas en el contrato laboral en concordancia con nuestro ordenamiento jurídico de índole laboral y en el contrato de trabajo.`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 15;
  
  doc.text('Atentamente,', margin, y);
  y += 15;
  
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  y += 15;
  doc.text('Recibí:', margin, y);
  y += 8;
  doc.text('Nombre de trabajador: ______________________________', margin, y);
  y += 6;
  doc.text('Firma: ______________________________', margin, y);
  y += 6;
  doc.text('Cédula: ______________________________', margin, y);
  
  return doc;
}

// 08 - Certificado Laboral
export function generateCertificadoLaboralPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  let y = addHeader(doc, data, 'CERTIFICACIÓN LABORAL');
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('EL DIRECTOR(A) DE TALENTO HUMANO', 105, y, { align: 'center' });
  y += 8;
  doc.text('CERTIFICA QUE', 105, y, { align: 'center' });
  y += 15;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const gender = data.employeeFullName.split(' ')[0].toLowerCase().endsWith('a') ? 'La señora' : 'El señor';
  
  const body = `${gender} ${data.employeeFullName.toUpperCase()} identificado(a) con ${data.employeeDocumentType} Nro. ${data.employeeDocumentNumber} laboró en nuestra empresa desde el ${formatDateInWords(data.contractStartDate)} hasta el día ${formatDateInWords(data.effectiveDate)}, con un contrato ${data.contractType} el cual fue liquidado y cancelado en su momento.

Desempeñando el cargo de ${data.employeePosition.toUpperCase()}.

La presente certificación se expide a solicitud del interesado el ${formatDateInWords(data.documentDate)}.`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 20;
  
  doc.text('Cordialmente,', margin, y);
  y += 15;
  
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  return doc;
}

// 09 - Paz y Salvo
export function generatePazYSalvoPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  let y = addHeader(doc, data, 'PAZ Y SALVO');
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const gender = data.employeeFullName.split(' ')[0].toLowerCase().endsWith('a') ? 'La señora' : 'El señor';
  
  const intro = `${gender} ${data.employeeFullName.toUpperCase()} identificado(a) con ${data.employeeDocumentType} Nro. ${data.employeeDocumentNumber} laboró en nuestra empresa desde el ${formatDateInWords(data.contractStartDate)} hasta el día ${formatDateInWords(data.effectiveDate)}, con un contrato ${data.contractType} el cual fue liquidado y cancelado en su momento, declaro que he recibido por parte de la empresa, el pago de todas mis prestaciones sociales al igual que los sueldos devengados por el trabajo desarrollado, incluido toda remuneración por trabajos suplementarios y recargos para esta empresa durante el desarrollo del contrato de trabajo y por tal motivo no existen obligaciones provenientes de la relación laboral que existe entre el patrono y el trabajador, además recíprocamente nos declaramos a paz y salvo por los siguientes conceptos:`;
  
  const introLines = doc.splitTextToSize(intro, textWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 8;
  
  // Bullet points
  const bullets = [
    `Que entre las partes se encuentran a paz y salvo por concepto de entrega de dotación y EPP en el periodo mencionado, por cuanto ${data.companyName} entregó todas las dotaciones y elementos de protección personal a que tenían derecho el trabajador durante el contrato suscrito.`,
    'Que entre las partes se encuentran a paz y salvo por concepto de salarios, horas extras, recargos por trabajo nocturno. De igual manera por cesantías, vacaciones, auxilios de transporte, primas, liquidaciones y en general todo concepto relacionado con salarios.',
    'Que entre las partes se encuentran a paz y salvo por concepto de pago de Incapacidades, los cuales fueron canceladas en debida forma y dentro de las disposiciones del Código Sustantivo del Trabajo.',
    `El trabajador autorizó anticipos, deducciones y cualquier tipo de responsabilidad durante el periodo anteriormente citado en el cual laboró con ${data.companyName}.`,
    `Manifiesto que dentro del periodo laborado con ${data.companyName} estuve afiliado a seguridad social, pensión, salud, ARL y caja de compensación familiar y que el empleador entregó las planillas de pago por concepto de aportes al (SGSS), de dicho periodo contractual.`,
    'Las partes manifiestan estar a paz en todo concepto por ley 50 de 1990.',
  ];
  
  bullets.forEach((bullet) => {
    doc.text('•', margin, y);
    const bulletLines = doc.splitTextToSize(bullet, textWidth - 5);
    doc.text(bulletLines, margin + 5, y);
    y += bulletLines.length * 5 + 4;
  });
  
  y += 5;
  doc.text(`En constancia de lo anterior, se firma por las partes el ${formatDateInWords(data.documentDate)}, en ${data.documentCity}.`, margin, y);
  
  y = addSignatureLines(doc, y, data);
  
  return doc;
}

// 10 - Autorización Examen de Egreso (simple memo)
export function generateExamenEgresoPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date and location
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${capitalize(formatDateInWords(data.documentDate))}`, margin, y);
  y += 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text('AUTORIZACIÓN PARA EXAMEN MÉDICO DE EGRESO', 105, y, { align: 'center' });
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  
  const body = `Por medio de la presente, se autoriza al trabajador ${data.employeeFullName.toUpperCase()}, identificado con ${data.employeeDocumentType} ${data.employeeDocumentNumber}, quien desempeñó el cargo de ${data.employeePosition} en ${data.employeeOperationCenter || data.companyName}, para que se le realice el examen médico ocupacional de egreso.

El examen debe realizarse de acuerdo con lo establecido en la Resolución 2346 de 2007 del Ministerio de la Protección Social.

Fecha de terminación del contrato: ${formatDateInWords(data.effectiveDate)}`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 20;
  
  doc.text('Cordialmente,', margin, y);
  y += 15;
  
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.hrManagerName, margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(data.hrManagerPosition, margin, y);
  y += 4;
  doc.text(data.companyName, margin, y);
  
  return doc;
}

// 11 - Retiro de Cesantías
export function generateRetiroCesantiasPDF(data: TerminationDocumentData): jsPDF {
  const doc = createBasePDF();
  
  const pageWidth = 216;
  const margin = 25;
  const textWidth = pageWidth - 2 * margin;
  let y = 30;
  
  // Date
  doc.setFontSize(10);
  doc.text(`${data.documentCity}, ${formatDateInWords(data.documentDate)}`, margin, y);
  y += 15;
  
  doc.text('Señores:', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.documentCity, margin, y);
  y += 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text('Referencia: Autorización de Retiro de Cesantías', margin, y);
  y += 10;
  
  doc.setFont('helvetica', 'normal');
  
  const body = `Por medio de la presente me permito solicitar el retiro de mis cesantías las cuales fueron consignadas en el Fondo de Cesantías correspondiente ya que mi contrato laboral finalizó el ${formatDateInWords(data.effectiveDate)}.

A su vez autorizo para que sean consignadas a mi cuenta registrada en la nómina de la compañía.

Agradezco la atención prestada.`;
  
  const bodyLines = doc.splitTextToSize(body, textWidth);
  doc.text(bodyLines, margin, y);
  y += bodyLines.length * 5 + 20;
  
  // Employee signature
  doc.line(margin, y, margin + 60, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(data.employeeFullName.toUpperCase(), margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.employeeDocumentType}: ${data.employeeDocumentNumber}`, margin, y);
  
  return doc;
}

// Main function to generate document by type
export function generateTerminationDocument(
  documentType: TerminationDocumentType,
  data: TerminationDocumentData
): jsPDF {
  switch (documentType) {
    case 'acta_terminacion':
      // Select the appropriate document based on termination type
      switch (data.terminationType) {
        case 'mutuo_acuerdo':
          return generateMutuoAcuerdoPDF(data);
        case 'periodo_prueba':
          return generatePeriodoPruebaPDF(data);
        case 'obra_labor':
          return generateObraLaborPDF(data);
        case 'sin_justa_causa':
          return generateSinJustaCausaPDF(data);
        default:
          return generateMutuoAcuerdoPDF(data);
      }
    case 'preaviso':
      return generatePreavisoPDF(data);
    case 'notificacion_aportes':
      return generateNotificacionAportesPDF(data);
    case 'aceptacion_renuncia':
      return generateAceptacionRenunciaPDF(data);
    case 'certificado_laboral':
      return generateCertificadoLaboralPDF(data);
    case 'paz_y_salvo':
      return generatePazYSalvoPDF(data);
    case 'examen_egreso':
      return generateExamenEgresoPDF(data);
    case 'retiro_cesantias':
      return generateRetiroCesantiasPDF(data);
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}

// Download helper
export function downloadTerminationDocument(
  documentType: TerminationDocumentType,
  data: TerminationDocumentData,
  filename?: string
): void {
  const doc = generateTerminationDocument(documentType, data);
  const defaultFilename = `${documentType}_${data.employeeDocumentNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
  doc.save(filename || defaultFilename);
}
