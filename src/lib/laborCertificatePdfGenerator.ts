import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import QRCode from 'qrcode';
import { getEmployeeFullName } from '@/types/employee';

interface GeneratorParams {
  employee: any;
  company: any;
  data: {
    salaryAmount: number;
    positionName: string;
    contractType: string;
    startDate: string;
    endDate: string | null;
  };
  folio: string;
  verificationUrl: string;
  signatureConfig?: {
    signature_url: string;
    signer_name: string;
    signer_position: string;
  };
  watermarkConfig?: {
    url: string;
    opacity: number;
    position: string;
  };
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  TI: 'Tarjeta de Identidad',
  PA: 'Pasaporte',
  PEP: 'Permiso Especial de Permanencia',
  PPT: 'Permiso por Protección Temporal',
};

// Helper function to load an image from URL and return a base64 string
const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export async function generateLaborCertificatePdf({
  employee,
  company,
  data,
  folio,
  verificationUrl,
  signatureConfig,
  watermarkConfig
}: GeneratorParams) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // smaller margin for border
  const contentMargin = 25;
  const contentWidth = pageWidth - contentMargin * 2;
  let y = 15;

  // Set Serif font to match Image 2
  doc.setFont('times', 'normal');

  // 1. Header (Company Logo + Letterhead Info)
  const logoToUse = company?.horizontal_logo_url || company?.logo_url;
  if (logoToUse) {
    try {
      const logoBase64 = await fetchImageAsBase64(logoToUse);
      // Horizontal logo sizing (reduced width by 10% from 60 to 54)
      doc.addImage(logoBase64, 'PNG', contentMargin, y, 54, 20, undefined, 'FAST');
    } catch (err) {
      console.warn("Could not load company logo", err);
    }
  }

  const companyName = company?.name || 'LA EMPRESA';
  const companyNit = company?.nit || 'N/A';
  const companyAddress = company?.address || company?.address_line1 || 'No registrada';
  const companyPhone = company?.phone || company?.phone_number || 'No registrado';
  const companyEmail = company?.email || company?.contact_email || 'No registrado';
  const companyCity = company?.city || 'No registrada';

  // Letterhead text on the right side of the header
  const headerTextX = contentMargin + 65;
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60); // #3c3c3c for company name matching border
  doc.text(companyName.toUpperCase(), headerTextX, y + 5);
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`NIT: ${companyNit}`, headerTextX, y + 10);
  doc.text(`Dirección: ${companyAddress} | Ciudad: ${companyCity}`, headerTextX, y + 14);
  doc.text(`Teléfono: ${companyPhone} | Correo electrónico: ${companyEmail}`, headerTextX, y + 18);

  y += 25;

  // 2. Borders matching Image 2 (Outer #3c3c3c, Orange/Yellow inner)
  const borderYStart = y;
  const borderBottom = pageHeight - margin; // Ends at pageHeight - 20
  const footerHeight = 18;
  const borderHeight = borderBottom - borderYStart;
  
  doc.setDrawColor(60, 60, 60); // #3c3c3c 
  doc.setLineWidth(1);
  doc.rect(margin, borderYStart, pageWidth - margin * 2, borderHeight);
  
  const orangeBorderHeight = borderHeight - footerHeight;
  doc.setDrawColor(255, 165, 0); // Orange/Yellow
  doc.setLineWidth(0.3);
  doc.rect(margin + 1.5, borderYStart + 1.5, pageWidth - margin * 2 - 3, orangeBorderHeight - 1.5);

  y += 10;
  doc.setTextColor(0); // Reset text color

  // Folio
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`No. ${folio}`, pageWidth - contentMargin, y, { align: 'right' });
  doc.setTextColor(0);
  y += 15;

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.text('CERTIFICACIÓN LABORAL', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // 3. Render Watermark if available
  if (watermarkConfig?.url) {
    try {
      const base64Img = await fetchImageAsBase64(watermarkConfig.url);
      doc.setGState(new doc.GState({ opacity: (watermarkConfig.opacity || 20) / 100 }));
      
      const watermarkSize = 120;
      let xPos = (pageWidth - watermarkSize) / 2;
      let yPos = (pageHeight - watermarkSize) / 2;
      
      doc.addImage(base64Img, 'PNG', xPos, yPos, watermarkSize, watermarkSize);
      doc.setGState(new doc.GState({ opacity: 1 })); // Reset opacity
    } catch (err) {
      console.warn("Could not load watermark image", err);
    }
  }

  // Body Content Setup
  doc.setFont('times', 'normal');
  doc.setFontSize(12);

  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  const docType = employee.document_type || '';
  const docTypeLabel = DOCUMENT_TYPE_LABELS[docType] || docType;
  const employeeName = getEmployeeFullName(employee);
  const isCurrentlyActive = !data.endDate;

  const hireDateFormatted = data.startDate
    ? format(new Date(data.startDate + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
    : 'N/A';
  
  const termDateFormatted = data.endDate
      ? format(new Date(data.endDate + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
      : 'la fecha';

  const salaryFormatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(data.salaryAmount);

  // Body Text Generation
  doc.text(`Fecha de expedición: ${today}`, contentMargin, y);
  y += 10;
  
  doc.text('A quien interese:', contentMargin, y);
  y += 10;

  const p1 = `Por medio de la presente, ${companyName.toUpperCase()}, identificada con NIT ${companyNit}, certifica que el(la) señor(a) ${employeeName.toUpperCase()}, identificado(a) con ${docTypeLabel} No. ${employee.document_number}, labora${isCurrentlyActive ? '' : 'ó'} en esta compañía desde el ${hireDateFormatted} hasta ${termDateFormatted}.`;
  
  // Justified text requires string and maxWidth
  const linesP1 = doc.splitTextToSize(p1, contentWidth);
  doc.text(p1, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
  y += linesP1.length * 6 + 4;

  const p2 = `Durante dicho período se desempeñó en el cargo de ${data.positionName.toUpperCase()}, adscrito al área de ${employee.department_id || 'Operaciones'}, desarrollando funciones de naturaleza operativa / administrativa.`;
  const linesP2 = doc.splitTextToSize(p2, contentWidth);
  doc.text(p2, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
  y += linesP2.length * 6 + 6;

  // Bullet points
  const lineHeight = 7;
  doc.setFont('times', 'bold');
  doc.text('Tipo de vinculación: ', contentMargin, y);
  doc.setFont('times', 'normal');
  doc.text(`${data.contractType || 'N/A'}`, contentMargin + 40, y);
  y += lineHeight;

  doc.setFont('times', 'bold');
  doc.text('Jornada laboral: ', contentMargin, y);
  doc.setFont('times', 'normal');
  doc.text(`Tiempo completo`, contentMargin + 35, y);
  y += lineHeight;

  doc.setFont('times', 'bold');
  doc.text('Asignación salarial: ', contentMargin, y);
  doc.setFont('times', 'normal');
  doc.text(`Salario básico mensual de ${salaryFormatted}`, contentMargin + 42, y);
  y += lineHeight;

  doc.setFont('times', 'bold');
  doc.text('Auxilio(s) o concepto(s): ', contentMargin, y);
  doc.setFont('times', 'normal');
  doc.text(`N/A`, contentMargin + 50, y);
  y += lineHeight + 6;

  const p3 = `A la fecha, su relación laboral se encuentra ${isCurrentlyActive ? 'vigente' : 'finalizada'}, y esta certificación se expide a solicitud del(la) interesado(a) para los fines que estime convenientes.`;
  const linesP3 = doc.splitTextToSize(p3, contentWidth);
  doc.text(p3, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
  y += linesP3.length * 6 + 10;

  doc.text('Cordialmente,', contentMargin, y);
  y += 15;

  // We need to calculate footerYStart first to anchor the signature
  const footerYStart = borderBottom - footerHeight;

  // Signature Block - Anchored above the footer
  let sigTextY = footerYStart - 5; // Bottom-most text line
  
  doc.setFont('times', 'normal');
  doc.text(`Teléfono: ${companyPhone}`, contentMargin, sigTextY);
  sigTextY -= 5;
  doc.text(`Correo corporativo: ${companyEmail}`, contentMargin, sigTextY);
  sigTextY -= 5;
  doc.text(signatureConfig?.signer_position || companyName, contentMargin, sigTextY);
  sigTextY -= 5;
  doc.setFont('times', 'bold');
  doc.text(signatureConfig?.signer_name || 'Departamento de Recursos Humanos', contentMargin, sigTextY);
  doc.setFont('times', 'normal');
  
  sigTextY -= 4; // Space before the line
  doc.setLineWidth(0.3);
  doc.line(contentMargin, sigTextY, contentMargin + 70, sigTextY);
  
  if (signatureConfig?.signature_url) {
    try {
      const signatureBase64 = await fetchImageAsBase64(signatureConfig.signature_url);
      // Image is drawn from top-left, so we subtract its height (20) from the line Y
      doc.addImage(signatureBase64, 'PNG', contentMargin, sigTextY - 20, 40, 20, undefined, 'FAST');
    } catch (err) {
      console.warn("Could not load signature image", err);
    }
  }

  // Footer & QR Code
  
  // Generate QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 100,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    // Add QR code image just above the footer
    const qrSize = 25;
    const qrY = footerYStart - qrSize - 4; // 4 units above footer
    doc.addImage(qrDataUrl, 'PNG', pageWidth - contentMargin - qrSize, qrY, qrSize, qrSize);
    
    // Add QR code text below it
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text('Escanee para verificar', pageWidth - contentMargin - (qrSize / 2), footerYStart - 1.5, { align: 'center' });
    
  } catch (err) {
    console.error("Error generating QR code", err);
  }

  // Footer Text Block matching Image 2
  doc.setFillColor(60, 60, 60); // #3c3c3c (matching outer border perfectly)
  doc.rect(margin, footerYStart, pageWidth - margin * 2, footerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`${companyName} - ${companyCity}, Colombia`, margin + 5, footerYStart + 7);
  doc.text(`Verificación: ${folio}`, margin + 5, footerYStart + 13);
  
  doc.text(`FOLIO-${folio} | Página 1 de 1`, pageWidth - margin - 5, footerYStart + 7, { align: 'right' });
  doc.setTextColor(150, 150, 150);
  doc.text(`Documento oficial con validez legal`, pageWidth - margin - 5, footerYStart + 13, { align: 'right' });

  return doc;
}

