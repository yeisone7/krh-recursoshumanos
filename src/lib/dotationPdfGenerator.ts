import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DeliveryForPdf {
  id: string;
  employee_id: string;
  item_name: string;
  item_type: string;
  quantity: number;
  size?: string | null;
  delivery_date: string;
  expiration_date: string;
  delivered_by?: string | null;
  observations?: string | null;
  signature_url?: string | null;
  employees?: {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    second_last_name?: string | null;
    document_number: string;
    operation_centers?: { name: string } | null;
  } | null;
}

interface ActaOptions {
  companyName: string;
  companyNit: string;
  deliveries: DeliveryForPdf[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function generateActaEntregaPdf(options: ActaOptions): Promise<void> {
  const { companyName, companyNit, deliveries } = options;
  if (deliveries.length === 0) return;

  const first = deliveries[0];
  const employee = first.employees;
  if (!employee) return;

  const employeeName = [employee.first_name, employee.middle_name, employee.last_name, employee.second_last_name]
    .filter(Boolean).join(' ');
  const centerName = employee.operation_centers?.name || 'N/A';

  const doc = new jsPDF('p', 'mm', 'letter');
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Try to load watermark
  try {
    const wmImg = await loadImage('/images/petrocasinos-watermark.png');
    const wmW = 97;
    const wmH = 54;
    doc.saveGraphicsState();
    (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
    doc.addImage(wmImg, 'PNG', (pageW - wmW) / 2, 120, wmW, wmH);
    doc.restoreGraphicsState();
  } catch { /* watermark optional */ }

  // Try to load logo
  try {
    const logoImg = await loadImage('/images/petrocasinos-logo-white.png');
    doc.addImage(logoImg, 'PNG', margin, y, 36, 16);
  } catch { /* logo optional */ }

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ACTA DE ENTREGA DE DOTACIÓN', pageW / 2, y + 8, { align: 'center' });
  y += 20;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyName} — NIT: ${companyNit}`, pageW / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Fecha: ${format(new Date(first.delivery_date), 'PPP', { locale: es })}`, pageW / 2, y, { align: 'center' });
  y += 10;

  // Line separator
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
  const infoLines = [
    ['Nombre:', employeeName],
    ['Documento:', employee.document_number],
    ['Centro de Operación:', centerName],
  ];
  for (const [label, value] of infoLines) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 45, y);
    y += 5;
  }
  y += 6;

  // Items table header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ARTÍCULOS ENTREGADOS', margin, y);
  y += 6;

  // Table
  const colWidths = [10, contentW * 0.35, 20, 20, contentW * 0.2 - 5, contentW * 0.2 - 5];
  const headers = ['#', 'Artículo', 'Cant.', 'Talla', 'Entrega', 'Vencimiento'];

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
  deliveries.forEach((d, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 3.5, contentW, 6, 'F');
    }
    xPos = margin + 2;
    const row = [
      String(idx + 1),
      d.item_name,
      String(d.quantity),
      d.size || '—',
      format(new Date(d.delivery_date), 'dd/MM/yyyy'),
      format(new Date(d.expiration_date), 'dd/MM/yyyy'),
    ];
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i].substring(0, 30), xPos, y);
      xPos += colWidths[i];
    }
    y += 6;
  });

  y += 6;

  // Observations
  if (first.observations) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVACIONES:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(first.observations, contentW);
    doc.text(obsLines, margin, y);
    y += obsLines.length * 4 + 6;
  }

  // Legal text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  const legalText = 'El empleado declara haber recibido en buen estado los artículos descritos y se compromete a darles uso adecuado conforme al Artículo 230 del Código Sustantivo del Trabajo de Colombia.';
  const legalLines = doc.splitTextToSize(legalText, contentW);
  doc.text(legalLines, margin, y);
  doc.setTextColor(0, 0, 0);
  y += legalLines.length * 3 + 10;

  // Signatures section
  const sigY = Math.max(y, 200);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);

  // Employee signature
  const sig1X = margin;
  const sig2X = pageW / 2 + 10;

  // If there's a digital signature, render it
  if (first.signature_url) {
    try {
      const sigImg = await loadImage(first.signature_url);
      doc.addImage(sigImg, 'PNG', sig1X, sigY - 25, 60, 22);
    } catch { /* signature load optional */ }
  }

  doc.line(sig1X, sigY, sig1X + 70, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Firma del Empleado', sig1X, sigY + 5);
  doc.text(employeeName, sig1X, sigY + 9);
  doc.text(`C.C. ${employee.document_number}`, sig1X, sigY + 13);

  // Deliverer signature
  doc.line(sig2X, sigY, sig2X + 70, sigY);
  doc.text('Firma de quien entrega', sig2X, sigY + 5);
  doc.text(first.delivered_by || '', sig2X, sigY + 9);

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${format(new Date(), 'PPP', { locale: es })} — ${companyName}`, pageW / 2, footerY, { align: 'center' });

  doc.save(`Acta_Entrega_Dotacion_${employee.document_number}_${format(new Date(first.delivery_date), 'yyyyMMdd')}.pdf`);
}
