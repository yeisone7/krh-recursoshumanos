import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LaborCertificateData {
  employeeName: string;
  documentType: string;
  documentNumber: string;
  position: string;
  hireDate: string;
  salary: number;
  contractType: string;
  companyName: string;
  companyNit: string;
  isActive: boolean;
  terminationDate?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  TI: 'Tarjeta de Identidad',
  PA: 'Pasaporte',
  PEP: 'Permiso Especial de Permanencia',
  PPT: 'Permiso por Protección Temporal',
};

export async function generateLaborCertificatePdf(data: LaborCertificateData) {
  const doc = new jsPDF('p', 'mm', 'letter');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = 40;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.companyName.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIT: ${data.companyNit}`, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CERTIFICACIÓN LABORAL', pageWidth / 2, y, { align: 'center' });
  y += 25;

  // Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  const today = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  const hireDateFormatted = data.hireDate
    ? format(new Date(data.hireDate + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
    : 'N/A';
  const salaryFormatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(data.salary);
  const docTypeLabel = DOCUMENT_TYPE_LABELS[data.documentType] || data.documentType;

  const text1 = `El suscrito representante legal de ${data.companyName.toUpperCase()}, identificada con NIT ${data.companyNit}, certifica que:`;
  const lines1 = doc.splitTextToSize(text1, contentWidth);
  doc.text(lines1, margin, y);
  y += lines1.length * 6 + 10;

  const employeeInfo = `${data.employeeName.toUpperCase()}, identificado(a) con ${docTypeLabel} No. ${data.documentNumber}`;
  doc.setFont('helvetica', 'bold');
  const linesName = doc.splitTextToSize(employeeInfo, contentWidth);
  doc.text(linesName, margin, y);
  y += linesName.length * 6 + 10;

  doc.setFont('helvetica', 'normal');

  let statusText: string;
  if (data.isActive) {
    statusText = `Se encuentra vinculado(a) a nuestra empresa desde el ${hireDateFormatted}, desempeñando el cargo de ${data.position.toUpperCase()}, con contrato de tipo ${data.contractType}, devengando un salario mensual de ${salaryFormatted}.`;
  } else {
    const termDate = data.terminationDate
      ? format(new Date(data.terminationDate + 'T12:00:00'), "d 'de' MMMM 'de' yyyy", { locale: es })
      : 'N/A';
    statusText = `Estuvo vinculado(a) a nuestra empresa desde el ${hireDateFormatted} hasta el ${termDate}, desempeñando el cargo de ${data.position.toUpperCase()}, con contrato de tipo ${data.contractType}, devengando un último salario mensual de ${salaryFormatted}.`;
  }

  const linesStatus = doc.splitTextToSize(statusText, contentWidth);
  doc.text(linesStatus, margin, y);
  y += linesStatus.length * 6 + 15;

  const text3 = `La presente certificación se expide a solicitud del interesado(a), en la ciudad de Bogotá D.C., a los ${today}.`;
  const lines3 = doc.splitTextToSize(text3, contentWidth);
  doc.text(lines3, margin, y);
  y += lines3.length * 6 + 30;

  // Signature
  doc.text('Atentamente,', margin, y);
  y += 25;
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + 70, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Departamento de Recursos Humanos', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName, margin, y);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Este documento fue generado electrónicamente y no requiere firma física.', pageWidth / 2, footerY, {
    align: 'center',
  });

  doc.save(`Certificado_Laboral_${data.employeeName.replace(/\s+/g, '_')}.pdf`);
}
