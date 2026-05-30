import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateOnly } from '@/lib/dateOnly';
import type { ExamTransaction } from '@/hooks/useExamTransactions';
import { examTypeLabels } from '@/types/medicalExam';
import type { ExamType } from '@/types/medicalExam';

const resultLabels: Record<string, string> = {
  apto: 'Apto',
  apto_restricciones: 'Apto c/ Restricciones',
  no_apto: 'No Apto',
  pendiente: 'Pendiente',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

interface ExamOrderOptions {
  companyName: string;
  companyNit: string;
  logoUrl?: string | null;
  transaction: ExamTransaction;
  signatureDataUrl?: string | null;
}

export async function generateExamOrderPdf(options: ExamOrderOptions): Promise<void> {
  const { companyName, companyNit, transaction, signatureDataUrl, logoUrl } = options;
  const employee = transaction.employees;
  if (!employee) return;

  const employeeName = [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name]
    .filter(Boolean).join(' ');
  const centerName = employee.operation_centers?.name || 'N/A';

  const doc = new jsPDF('p', 'mm', 'letter');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Watermark
  try {
    const wmImg = await loadImage('/images/petrocasinos-watermark.png');
    const wmW = 97;
    const wmH = 54;
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.addImage(wmImg, 'PNG', (pageW - wmW) / 2, 120, wmW, wmH);
    doc.restoreGraphicsState();
  } catch { /* optional */ }

  // Header logo
  if (logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl);
      doc.addImage(logoImg, 'PNG', margin, y, 36, 18);
    } catch { /* optional */ }
  }

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEN DE EXÁMENES MÉDICOS', pageW / 2, y + 8, { align: 'center' });
  y += 22;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyName} — NIT: ${companyNit}`, pageW / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Fecha: ${formatDateOnly(transaction.exam_date, 'PPP', { locale: es })}`, pageW / 2, y, { align: 'center' });
  y += 10;

  // Separator
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // Employee info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL EMPLEADO', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const docTypeLabel = (employee as any).identification_types?.name || employee.document_type || 'C.C.';
  const leftInfoLines = [
    ['Nombre:', employeeName],
    ['Documento:', `${docTypeLabel} ${employee.document_number}`],
    ['Centro de Operación:', centerName],
  ];
  const infoStartY = y;
  for (const [label, value] of leftInfoLines) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, y);
    y += 5;
  }

  // Right column
  const rightX = pageW / 2 + 15;
  let rightY = infoStartY;
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Examen:', rightX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(examTypeLabels[transaction.exam_type as ExamType] || transaction.exam_type, rightX + 35, rightY);
  rightY += 5;
  if (transaction.provider) {
    doc.setFont('helvetica', 'bold');
    doc.text('Proveedor / IPS:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.provider, rightX + 35, rightY);
    rightY += 5;
  }
  if (transaction.doctor_name) {
    doc.setFont('helvetica', 'bold');
    doc.text('Médico:', rightX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(transaction.doctor_name, rightX + 35, rightY);
  }

  y += 6;

  // Items table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('EXÁMENES REALIZADOS', margin, y);
  y += 6;

  const colWidths = [10, contentW * 0.5, contentW * 0.3];
  const headers = ['#', 'Examen', 'Resultado'];

  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y - 4, contentW, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  let xPos = margin + 2;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], xPos, y);
    xPos += colWidths[i];
  }
  doc.setTextColor(0, 0, 0);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  transaction.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 3.5, contentW, 6, 'F');
    }
    xPos = margin + 2;
    const row = [
      String(idx + 1),
      item.exam_name.substring(0, 45),
      resultLabels[item.result] || item.result,
    ];
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], xPos, y);
      xPos += colWidths[i];
    }
    y += 6;

    // Restrictions / concept
    if (item.concept || item.restrictions) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      if (item.concept) {
        doc.text(`  Concepto: ${item.concept}`, margin + 12, y);
        y += 4;
      }
      if (item.restrictions) {
        doc.text(`  Restricciones: ${item.restrictions}`, margin + 12, y);
        y += 4;
      }
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
    }
  });

  y += 6;

  // Observations
  if (transaction.observations) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(transaction.observations, contentW);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 4 + 6;
  }

  // Legal text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const legalText = 'El empleado declara haber sido informado sobre los exámenes médicos ocupacionales realizados conforme a la Resolución 2346 de 2007 del Ministerio de la Protección Social de Colombia.';
  const legalLines = doc.splitTextToSize(legalText, contentW);
  doc.text(legalLines, margin, y);
  doc.setTextColor(0, 0, 0);
  y += legalLines.length * 3 + 10;

  // Signatures
  const sigY = Math.max(y, 200);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);

  const sig1X = margin;
  const sig2X = pageW / 2 + 10;

  const sigUrl = signatureDataUrl || transaction.signature_url;
  if (sigUrl) {
    try {
      const sigImg = await loadImage(sigUrl);
      doc.addImage(sigImg, 'PNG', sig1X, sigY - 25, 60, 22);
    } catch { /* optional */ }
  }

  doc.line(sig1X, sigY, sig1X + 70, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma del Empleado', sig1X, sigY + 5);
  doc.text(employeeName, sig1X, sigY + 9);
  doc.text(`C.C. ${employee.document_number}`, sig1X, sigY + 13);

  doc.line(sig2X, sigY, sig2X + 70, sigY);
  doc.text('Firma de quien aplica', sig2X, sigY + 5);
  doc.text(transaction.doctor_name || '', sig2X, sigY + 9);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${format(new Date(), 'PPP', { locale: es })} — ${companyName}`, pageW / 2, footerY, { align: 'center' });

  doc.save(`Orden_Examenes_${employee.document_number}_${formatDateOnly(transaction.exam_date, 'yyyyMMdd')}.pdf`);
}
