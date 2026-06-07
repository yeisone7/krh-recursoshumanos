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
    showSalary?: boolean;
    periods?: Array<{
      salaryAmount: number;
      positionName: string;
      contractType: string;
      startDate: string;
      endDate: string | null;
    }>;
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

const PDF_FONT = 'helvetica'; // jsPDF built-in sans serif, visually equivalent to Arial in generated PDFs.
const FOOTER_PRIMARY = '#1f2a44';
const FOOTER_ACCENT = '#e56b1f';
const FOOTER_MUTED = '#6b7280';

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
  const contentMargin = 25;
  const contentWidth = pageWidth - contentMargin * 2;
  const footerHeight = 30;
  const footerYStart = pageHeight - footerHeight - 8;
  let y = 14;

  doc.setFont(PDF_FONT, 'normal');

  // Header: only the company icon/logo at the upper-left.
  const logoToUse = company?.logo_url || company?.horizontal_logo_url;
  if (logoToUse) {
    try {
      const logoBase64 = await fetchImageAsBase64(logoToUse);
      doc.addImage(logoBase64, 'PNG', contentMargin, y, 34, 18, undefined, 'FAST');
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

  y += 32;
  doc.setTextColor(0); // Reset text color

  // Folio
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`No. ${folio}`, pageWidth - contentMargin, y, { align: 'right' });
  doc.setTextColor(0);
  y += 15;

  // Title
  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(16);
  doc.text('CERTIFICACIÓN LABORAL', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // 3. Render Watermark if available (fallback to custom Empatiq watermark by default)
  const watermarkUrl = watermarkConfig?.url || '/images/empatiq-watermark.png';
  if (watermarkUrl) {
    try {
      const base64Img = await fetchImageAsBase64(watermarkUrl);
      const watermarkOpacity = watermarkConfig ? (watermarkConfig.opacity || 20) : 10;
      doc.setGState(new doc.GState({ opacity: watermarkOpacity / 100 }));
      
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
  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(12);

  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  const docType = employee.document_type || '';
  const docTypeLabel = DOCUMENT_TYPE_LABELS[docType] || docType;
  const employeeName = getEmployeeFullName(employee);

  // Extract periods to render (supporting old certificates where data.periods is undefined)
  const periodsToRender = data.periods || [{
    salaryAmount: data.salaryAmount,
    positionName: data.positionName,
    contractType: data.contractType,
    startDate: data.startDate,
    endDate: data.endDate
  }];

  const isSingle = periodsToRender.length === 1;

  doc.text(`Fecha de expedición: ${today}`, contentMargin, y);
  y += 10;
  
  doc.text('A quien interese:', contentMargin, y);
  y += 10;

  if (isSingle) {
    const singlePeriod = periodsToRender[0];
    const isCurrentlyActive = !singlePeriod.endDate;

    const hireDateFormatted = singlePeriod.startDate
      ? format(new Date(singlePeriod.startDate + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
      : 'N/A';
    
    const termDateFormatted = singlePeriod.endDate
        ? format(new Date(singlePeriod.endDate + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
        : 'la fecha';

    const salaryFormatted = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(singlePeriod.salaryAmount);

    const p1 = `Por medio de la presente, ${companyName.toUpperCase()}, identificada con NIT ${companyNit}, certifica que el(la) señor(a) ${employeeName.toUpperCase()}, identificado(a) con ${docTypeLabel} No. ${employee.document_number}, labora${isCurrentlyActive ? '' : 'ó'} en esta compañía desde el ${hireDateFormatted} hasta ${termDateFormatted}.`;
    
    const linesP1 = doc.splitTextToSize(p1, contentWidth);
    doc.text(p1, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
    y += linesP1.length * 6 + 4;

    const p2 = `Durante dicho período se desempeñó en el cargo de ${singlePeriod.positionName.toUpperCase()}, adscrito al área de ${employee.department_id || 'Operaciones'}, desarrollando funciones de naturaleza operativa / administrativa.`;
    const linesP2 = doc.splitTextToSize(p2, contentWidth);
    doc.text(p2, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
    y += linesP2.length * 6 + 6;

    // Bullet points
    const lineHeight = 7;
    doc.setFont(PDF_FONT, 'bold');
    doc.text('Tipo de vinculación: ', contentMargin, y);
    doc.setFont(PDF_FONT, 'normal');
    doc.text(`${singlePeriod.contractType || 'N/A'}`, contentMargin + 40, y);
    y += lineHeight;

    doc.setFont(PDF_FONT, 'bold');
    doc.text('Jornada laboral: ', contentMargin, y);
    doc.setFont(PDF_FONT, 'normal');
    doc.text(`Tiempo completo`, contentMargin + 35, y);
    y += lineHeight;

    const showSalary = data.showSalary !== false;
    if (showSalary) {
      doc.setFont(PDF_FONT, 'bold');
      doc.text('Asignación salarial: ', contentMargin, y);
      doc.setFont(PDF_FONT, 'normal');
      doc.text(`Salario básico mensual de ${salaryFormatted}`, contentMargin + 42, y);
      y += lineHeight;
    }

    doc.setFont(PDF_FONT, 'bold');
    doc.text('Auxilio(s) o concepto(s): ', contentMargin, y);
    doc.setFont(PDF_FONT, 'normal');
    doc.text(`N/A`, contentMargin + 50, y);
    y += lineHeight + 6;

    const p3 = `A la fecha, su relación laboral se encuentra ${isCurrentlyActive ? 'vigente' : 'finalizada'}, y esta certificación se expide a solicitud del(la) interesado(a) para los fines que estime convenientes.`;
    const linesP3 = doc.splitTextToSize(p3, contentWidth);
    doc.text(p3, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
    y += linesP3.length * 6 + 10;
  } else {
    // Multi-period rendering
    const p1 = `Por medio de la presente, ${companyName.toUpperCase()}, identificada con NIT ${companyNit}, certifica que el(la) señor(a) ${employeeName.toUpperCase()}, identificado(a) con ${docTypeLabel} No. ${employee.document_number}, labora o ha laborado en nuestra compañía desempeñando los siguientes cargos y periodos de contratación:`;
    
    const linesP1 = doc.splitTextToSize(p1, contentWidth);
    doc.text(p1, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
    y += linesP1.length * 6 + 6;

    const showSalary = data.showSalary !== false;

    // Table settings
    doc.setFont(PDF_FONT, 'bold');
    doc.setFontSize(10);
    
    const colX = showSalary ? {
      cargo: contentMargin + 2,
      contrato: contentMargin + 48,
      periodo: contentMargin + 85,
      salario: contentMargin + 135
    } : {
      cargo: contentMargin + 2,
      contrato: contentMargin + 60,
      periodo: contentMargin + 115
    };

    // Draw header background
    doc.setFillColor(240, 244, 248);
    doc.rect(contentMargin, y, contentWidth, 8, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(contentMargin, y, contentWidth, 8, 'S');

    doc.setTextColor(50, 50, 50);
    doc.text('CARGO', colX.cargo, y + 5.5);
    doc.text('TIPO CONTRATO', colX.contrato, y + 5.5);
    doc.text('PERÍODO (INGRESO - FIN)', colX.periodo, y + 5.5);
    if (showSalary) {
      doc.text('SALARIO BÁSICO', (colX as any).salario, y + 5.5);
    }

    y += 8;

    doc.setFont(PDF_FONT, 'normal');
    doc.setTextColor(0);

    periodsToRender.forEach((p: any) => {
      const hireFormatted = p.startDate
        ? format(new Date(p.startDate + 'T12:00:00'), "dd/MM/yyyy")
        : 'N/A';
      const termFormatted = p.endDate
        ? format(new Date(p.endDate + 'T12:00:00'), "dd/MM/yyyy")
        : 'Vigente';

      const salFormatted = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(p.salaryAmount);

      // Row background
      doc.setFillColor(255, 255, 255);
      doc.rect(contentMargin, y, contentWidth, 10, 'F');
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.15);
      doc.rect(contentMargin, y, contentWidth, 10, 'S');

      // Alternating borders/lines
      const cargoText = p.positionName.toUpperCase();
      const truncatedCargo = cargoText.length > (showSalary ? 22 : 30) 
        ? cargoText.substring(0, showSalary ? 20 : 28) + '...' 
        : cargoText;

      doc.text(truncatedCargo, colX.cargo, y + 6);
      doc.text(p.contractType, colX.contrato, y + 6);
      doc.text(`${hireFormatted} - ${termFormatted}`, colX.periodo, y + 6);
      if (showSalary) {
        doc.text(salFormatted, (colX as any).salario, y + 6);
      }

      y += 10;
    });

    y += 8;

    doc.setFont(PDF_FONT, 'normal');
    doc.setFontSize(12);

    const isCurrentlyActive = periodsToRender.some((p: any) => !p.endDate);
    const p3 = `A la fecha, su relación laboral con la compañía se encuentra ${isCurrentlyActive ? 'vigente' : 'finalizada'}, y esta certificación se expide a solicitud del(la) interesado(a) para los fines que estime convenientes.`;
    const linesP3 = doc.splitTextToSize(p3, contentWidth);
    doc.text(p3, contentMargin, y, { maxWidth: contentWidth, align: 'justify' });
    y += linesP3.length * 6 + 10;
  }

  doc.text('Cordialmente,', contentMargin, y);
  y += 15;

  // Signature Block - Anchored above the footer
  let sigTextY = footerYStart - 5; // Bottom-most text line
  
  doc.setFont(PDF_FONT, 'normal');
  doc.text(`Teléfono: ${companyPhone}`, contentMargin, sigTextY);
  sigTextY -= 5;
  doc.text(`Correo corporativo: ${companyEmail}`, contentMargin, sigTextY);
  sigTextY -= 5;
  doc.text(signatureConfig?.signer_position || companyName, contentMargin, sigTextY);
  sigTextY -= 5;
  doc.setFont(PDF_FONT, 'bold');
  doc.text(signatureConfig?.signer_name || 'Departamento de Recursos Humanos', contentMargin, sigTextY);
  doc.setFont(PDF_FONT, 'normal');
  
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

  // Footer inspired by the attached template: clean white band, contact data, and legal verification text.
  doc.setFillColor(255, 255, 255);
  doc.rect(0, footerYStart - 2, pageWidth, footerHeight + 10, 'F');
  doc.setDrawColor(225, 229, 235);
  doc.setLineWidth(0.2);
  doc.line(contentMargin, footerYStart - 1, pageWidth - contentMargin, footerYStart - 1);

  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(FOOTER_PRIMARY);
  doc.text(`PBX: ${companyPhone}`, contentMargin, footerYStart + 6);
  doc.text(companyName.toUpperCase(), contentMargin + 78, footerYStart + 6);
  doc.text(companyEmail, contentMargin + 78, footerYStart + 12);

  doc.setDrawColor(45, 55, 75);
  doc.setLineWidth(0.45);
  doc.line(contentMargin + 68, footerYStart + 2, contentMargin + 68, footerYStart + 15);
  doc.line(pageWidth - contentMargin - 76, footerYStart + 2, pageWidth - contentMargin - 76, footerYStart + 15);

  doc.setFont(PDF_FONT, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(FOOTER_MUTED);
  doc.text(companyAddress, contentMargin + 78, footerYStart + 18, { maxWidth: 86 });
  doc.text(`${companyCity} - Colombia`, contentMargin + 78, footerYStart + 24);

  doc.setFont(PDF_FONT, 'bold');
  doc.setTextColor(FOOTER_PRIMARY);
  doc.text(`Verificación: ${folio}`, pageWidth - contentMargin, footerYStart + 6, { align: 'right' });
  doc.text(`FOLIO-${folio} | Página 1 de 1`, pageWidth - contentMargin, footerYStart + 12, { align: 'right' });

  doc.setFont(PDF_FONT, 'normal');
  doc.setTextColor(FOOTER_MUTED);
  doc.text('Documento oficial con validez legal', pageWidth - contentMargin, footerYStart + 18, { align: 'right' });

  doc.setFont(PDF_FONT, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(FOOTER_ACCENT);
  doc.text(company?.website || company?.web_site || 'www.petrocasinos.com', contentMargin, footerYStart + 24);

  return doc;
}
