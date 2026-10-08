import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { formatDateOnly } from '@/lib/dateOnly';
import { NOVELTY_TYPE_LABELS, type PayrollNovelty } from '@/types/payroll';

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo cargar el logotipo'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const generateNoveltyPDF = async (novelty: PayrollNovelty, userName: string, logoUrl?: string) => {
  const pageWidth = 80 * 2.83465;
  const margin = 17;
  const contentWidth = pageWidth - margin * 2;
  const employee = novelty.employees_v2;
  const employeeName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ') || 'Sin información';
  const reporterName = userName || 'Sin información';
  const printedAt = new Date();
  const reportDate = formatDateOnly(novelty.novelty_date, 'dd/MM/yyyy') || 'Sin información';
  const generatedAt = novelty.created_at ? new Date(novelty.created_at) : printedAt;
  const generatedDate = Number.isNaN(generatedAt.getTime())
    ? 'Sin información'
    : format(generatedAt, 'dd/MM/yyyy HH:mm:ss');
  const typeLabel = NOVELTY_TYPE_LABELS[novelty.novelty_type] || novelty.novelty_type || 'Sin información';
  const specificReason = novelty.novelty_reasons?.name || novelty.notes || 'N/A';
  let logo: string | undefined;
  if (logoUrl) {
    try {
      logo = await loadImage(logoUrl);
    } catch {
      // El comprobante sigue disponible si el logotipo no se puede cargar.
    }
  }

  const createDocument = (height: number) => new jsPDF({ unit: 'pt', format: [pageWidth, height] });

  // Medir y dibujar con las mismas reglas mantiene el alto del papel acorde al contenido.
  const render = (doc: jsPDF) => {
    let y = 18;
    const rule = (weight = 0.5, color = 190) => {
      doc.setDrawColor(color);
      doc.setLineWidth(weight);
      doc.line(margin, y, pageWidth - margin, y);
    };
    const text = (value: string, size = 8.5, bold = false, color = 35) => {
      doc.setFont('courier', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(color);
      const lines: string[] = doc.splitTextToSize(value, contentWidth);
      doc.text(lines, margin, y, { lineHeightFactor: 1.35 });
      y += lines.length * size * 1.35;
    };
    const field = (label: string, value: string, bold = false) => {
      text(label, 7, false, 85);
      y += 1;
      text(value, 8.5, bold);
      y += 7;
    };
    const section = (title: string) => {
      rule();
      y += 15;
      text(title, 7, true, 65);
      y += 7;
    };

    if (logo) {
      const properties = doc.getImageProperties(logo);
      const scale = Math.min(112 / properties.width, 36 / properties.height);
      const width = properties.width * scale;
      const height = properties.height * scale;
      doc.addImage(logo, 'PNG', (pageWidth - width) / 2, y, width, height);
      y += height + 17;
    }

    text('NÓMINA', 7, true, 85);
    y += 3;
    text('Soporte de novedad laboral', 10.5, true);
    y += 7;
    rule(1, 65);
    y += 17;

    field('COLABORADOR', employeeName.toUpperCase(), true);
    if (employee?.document_number) field('Documento de identidad', employee.document_number);
    field('Fecha de reporte', reportDate);
    field('Fecha de generación', generatedDate);

    section('DETALLE DE LA NOVEDAD');
    field('Novedad reportada', typeLabel, true);
    field('Motivo específico', specificReason);

    rule();
    y += 24;
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(35);
    doc.text('Horas reportadas', margin, y);
    const hours = String(novelty.hours ?? 0);
    doc.setFontSize(18);
    if (doc.getTextWidth(hours) <= contentWidth - 100) {
      doc.text(hours, pageWidth - margin, y + 2, { align: 'right' });
      y += 17;
    } else {
      y += 23;
      text(hours, 18, true);
      y += 7;
    }

    section('REGISTRO DEL SOPORTE');
    field('Reportó', reporterName.toUpperCase(), true);
    rule();
    y += 15;
    field('Fecha de impresión', format(printedAt, 'dd/MM/yyyy HH:mm:ss'));
    field('Imprimió', reporterName.toUpperCase());
    return y + 9;
  };

  const measurement = createDocument(400 * 2.83465);
  const pageHeight = Math.max(340, render(measurement));
  const doc = createDocument(pageHeight);
  render(doc);
  return { doc, fileName: `NOVEDAD_${employee?.document_number}_${novelty.novelty_date}.pdf` };
};

export const exportNoveltyToPDF = async (novelty: PayrollNovelty, userName: string, logoUrl?: string) => {
  const { doc, fileName } = await generateNoveltyPDF(novelty, userName, logoUrl);
  doc.save(fileName);
};

export const printNoveltyTicket = async (novelty: PayrollNovelty, userName: string, logoUrl?: string) => {
  const { doc } = await generateNoveltyPDF(novelty, userName, logoUrl);
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
};
