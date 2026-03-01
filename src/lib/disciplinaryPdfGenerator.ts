import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DisciplinaryProcessWithEmployee,
  disciplinaryStatusLabels,
  faultTypeLabels,
  sanctionTypeLabels,
  DisciplinaryStatus,
  FaultType,
  SanctionType,
} from '@/types/disciplinary';

const WATERMARK_LOGO_PATH = '/images/petrocasinos-watermark.png';
const COLOR_LOGO_PATH = '/images/petrocasinos-logo-white.png';

function loadImageAsDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

interface DisciplinaryPdfData {
  process: DisciplinaryProcessWithEmployee;
  companyName?: string;
}

const HEADER_HEIGHT = 32;
const PAGE_WIDTH = 215.9; // Letter
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(date: string | null): string {
  if (!date) return '-';
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: es });
}

function formatDateShort(date: string | null): string {
  if (!date) return '-';
  return format(new Date(date), 'dd/MM/yyyy');
}

export async function generateDisciplinaryPdf(data: DisciplinaryPdfData) {
  const { process, companyName } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageHeight = doc.internal.pageSize.getHeight();

  // Pre-load images
  let colorLogoDataUrl: string | null = null;
  let watermarkDataUrl: string | null = null;
  try {
    [colorLogoDataUrl, watermarkDataUrl] = await Promise.all([
      loadImageAsDataUrl(COLOR_LOGO_PATH),
      loadImageAsDataUrl(WATERMARK_LOGO_PATH),
    ]);
  } catch {
    // continue without images
  }

  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const headerCompanyName = (companyName || 'PETROCASINOS S.A.').toUpperCase();

  // ─── Helpers ────────────────────────────────────────────
  function drawHeader(d: jsPDF) {
    d.setFillColor(27, 38, 59); // Navy
    d.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, 'F');
    if (colorLogoDataUrl) {
      try { d.addImage(colorLogoDataUrl, 'PNG', PAGE_WIDTH - MARGIN - 38, 6, 36, 16); } catch { /* skip */ }
    }
    d.setTextColor(255, 255, 255);
    d.setFontSize(16);
    d.setFont('helvetica', 'bold');
    d.text(headerCompanyName, MARGIN, 14);
    d.setFontSize(10);
    d.setFont('helvetica', 'normal');
    d.text('INFORME DE PROCESO DISCIPLINARIO', MARGIN, 21);
    d.setFontSize(8);
    d.text(`Generado: ${dateStr}`, MARGIN, 27);
  }

  function drawWatermark(d: jsPDF) {
    if (!watermarkDataUrl) return;
    try {
      const wmW = 97, wmH = 54;
      d.addImage(
        watermarkDataUrl, 'PNG',
        (PAGE_WIDTH - wmW) / 2, (pageHeight - wmH) / 2,
        wmW, wmH, undefined, undefined, 0
      );
      // Set opacity via GState
      const gState = (d as any).GState({ opacity: 0.06 });
      (d as any).setGState(gState);
    } catch { /* skip */ }
  }

  function drawFooter(d: jsPDF, pageNum: number, totalPages: number) {
    d.setFontSize(7);
    d.setTextColor(150, 150, 150);
    d.text(`Página ${pageNum} de ${totalPages}`, PAGE_WIDTH / 2, pageHeight - 8, { align: 'center' });
    d.text('Documento confidencial - Solo para uso interno', PAGE_WIDTH / 2, pageHeight - 4, { align: 'center' });
    d.setTextColor(0, 0, 0);
  }

  function checkNewPage(currentY: number, needed: number): number {
    if (currentY + needed > pageHeight - 20) {
      doc.addPage();
      drawHeader(doc);
      doc.setTextColor(0, 0, 0);
      return HEADER_HEIGHT + 10;
    }
    return currentY;
  }

  function sectionTitle(title: string, y: number): number {
    y = checkNewPage(y, 14);
    doc.setFillColor(27, 38, 59);
    doc.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), MARGIN + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    return y + 12;
  }

  function infoRow(label: string, value: string, y: number, col2?: { label: string; value: string }): number {
    y = checkNewPage(y, 7);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(label, MARGIN + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, MARGIN + 50, y);
    if (col2) {
      doc.setFont('helvetica', 'bold');
      doc.text(col2.label, CONTENT_WIDTH / 2 + MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.text(col2.value, CONTENT_WIDTH / 2 + MARGIN + 40, y);
    }
    return y + 6;
  }

  // ─── Page 1: Header ─────────────────────────────────────
  drawHeader(doc);
  doc.setTextColor(0, 0, 0);
  let y = HEADER_HEIGHT + 10;

  // ─── Case identification card ──────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 28, 2, 2, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(process.case_number, MARGIN + 4, y + 8);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const employeeName = `${process.employee?.first_name || ''} ${process.employee?.last_name || ''}`.trim();
  doc.text(`Empleado: ${employeeName}`, MARGIN + 4, y + 15);
  doc.text(`Documento: ${process.employee?.document_number || '-'}`, MARGIN + 4, y + 21);

  // Status & Fault badges (right side)
  const statusText = disciplinaryStatusLabels[process.status];
  const faultText = faultTypeLabels[process.fault_type];

  // Status pill
  doc.setFillColor(27, 38, 59);
  const statusW = doc.getTextWidth(statusText) + 8;
  doc.roundedRect(PAGE_WIDTH - MARGIN - statusW - 2, y + 3, statusW, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, PAGE_WIDTH - MARGIN - statusW / 2 - 2, y + 7.5, { align: 'center' });

  // Fault pill
  const faultColors: Record<FaultType, [number, number, number]> = {
    leve: [234, 179, 8],
    grave: [234, 88, 12],
    gravisima: [220, 38, 38],
  };
  const fc = faultColors[process.fault_type] || [100, 100, 100];
  doc.setFillColor(fc[0], fc[1], fc[2]);
  const faultW = doc.getTextWidth(faultText) + 8;
  doc.roundedRect(PAGE_WIDTH - MARGIN - faultW - 2, y + 13, faultW, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(faultText, PAGE_WIDTH - MARGIN - faultW / 2 - 2, y + 17.5, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  y += 34;

  // ─── Section: Información General ──────────────────────
  y = sectionTitle('Información General', y);
  y = infoRow('Fecha de los Hechos:', formatDateShort(process.fault_date), y, { label: 'Apertura:', value: formatDateShort(process.opening_date) });
  y = infoRow('Notificación:', formatDateShort(process.notification_date), y, { label: 'Audiencia:', value: process.hearing_date ? formatDateShort(process.hearing_date) : '-' });
  y = infoRow('Investigador:', process.investigator_name || '-', y, { label: 'Testigos:', value: process.witnesses || '-' });

  if (process.article_violated) {
    y = infoRow('Artículos Violados:', process.article_violated, y);
  }
  if (process.observations) {
    y = infoRow('Observaciones:', '', y);
    doc.setFontSize(9);
    const obsLines = doc.splitTextToSize(process.observations, CONTENT_WIDTH - 4);
    y = checkNewPage(y, obsLines.length * 4 + 2);
    doc.text(obsLines, MARGIN + 2, y);
    y += obsLines.length * 4 + 4;
  }

  // ─── Section: Descripción de los Hechos ────────────────
  y = sectionTitle('Descripción de los Hechos', y);
  doc.setFontSize(9);
  const factsLines = doc.splitTextToSize(process.facts_description, CONTENT_WIDTH - 4);
  y = checkNewPage(y, factsLines.length * 4 + 4);
  doc.text(factsLines, MARGIN + 2, y);
  y += factsLines.length * 4 + 6;

  // ─── Section: Evidencias ───────────────────────────────
  if (process.evidence && process.evidence.length > 0) {
    y = sectionTitle(`Evidencias (${process.evidence.length})`, y);
    for (const ev of process.evidence) {
      y = checkNewPage(y, 16);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 1, 1, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 14, 1, 1, 'S');
      doc.setDrawColor(0, 0, 0);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(ev.evidence_type, MARGIN + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Fecha: ${formatDateShort(ev.collected_date)}${ev.collected_by ? ` | Por: ${ev.collected_by}` : ''}`, MARGIN + 3, y + 10);

      const descLines = doc.splitTextToSize(ev.description, CONTENT_WIDTH - 60);
      doc.text(descLines[0] || '', MARGIN + 60, y + 5);
      if (descLines[1]) doc.text(descLines[1], MARGIN + 60, y + 10);
      y += 17;
    }
    y += 2;
  }

  // ─── Section: Descargos ────────────────────────────────
  if (process.defenses && process.defenses.length > 0) {
    y = sectionTitle(`Descargos del Empleado (${process.defenses.length})`, y);
    for (const def of process.defenses) {
      const contentLines = doc.splitTextToSize(def.content, CONTENT_WIDTH - 6);
      const cardH = Math.max(16, contentLines.length * 4 + 10);
      y = checkNewPage(y, cardH + 4);

      doc.setFillColor(250, 250, 250);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 1, 1, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(MARGIN, y, CONTENT_WIDTH, cardH, 1, 1, 'S');
      doc.setDrawColor(0, 0, 0);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${def.defense_type === 'escrito' ? 'Escrito' : 'Oral'} — ${formatDateShort(def.defense_date)}`, MARGIN + 3, y + 5);
      if (def.received_by) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Recibido por: ${def.received_by}`, CONTENT_WIDTH - 20, y + 5);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(contentLines, MARGIN + 3, y + 11);
      y += cardH + 4;
    }
    y += 2;
  }

  // ─── Section: Decisión ─────────────────────────────────
  if (process.sanction_type) {
    y = sectionTitle('Decisión', y);
    y = infoRow('Sanción:', sanctionTypeLabels[process.sanction_type as SanctionType] || process.sanction_type, y, { label: 'Fecha Decisión:', value: formatDateShort(process.decision_date) });
    if (process.sanction_days && process.sanction_days > 0) {
      y = infoRow('Días de Suspensión:', `${process.sanction_days} días`, y, { label: 'Período:', value: `${formatDateShort(process.sanction_start_date)} - ${formatDateShort(process.sanction_end_date)}` });
    }
    y = infoRow('Decidido por:', process.decision_maker_name || '-', y);

    if (process.decision_summary) {
      y += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen de la Decisión:', MARGIN + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const summaryLines = doc.splitTextToSize(process.decision_summary, CONTENT_WIDTH - 4);
      y = checkNewPage(y, summaryLines.length * 4 + 4);
      doc.text(summaryLines, MARGIN + 2, y);
      y += summaryLines.length * 4 + 6;
    }
  }

  // ─── Section: Apelación ────────────────────────────────
  if (process.has_appeal) {
    y = sectionTitle('Apelación', y);
    y = infoRow('Fecha de Apelación:', formatDateShort(process.appeal_date), y, { label: 'Decisión Apelación:', value: formatDateShort(process.appeal_decision_date) });
    if (process.appeal_resolution) {
      y += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Resolución:', MARGIN + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const appealLines = doc.splitTextToSize(process.appeal_resolution, CONTENT_WIDTH - 4);
      y = checkNewPage(y, appealLines.length * 4 + 4);
      doc.text(appealLines, MARGIN + 2, y);
      y += appealLines.length * 4 + 6;
    }
  }

  // ─── Section: Línea de Tiempo ──────────────────────────
  if (process.timeline && process.timeline.length > 0) {
    y = sectionTitle('Línea de Tiempo', y);
    for (const entry of process.timeline) {
      y = checkNewPage(y, 14);

      // Dot
      doc.setFillColor(27, 38, 59);
      doc.circle(MARGIN + 4, y + 1, 1.5, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const statusLabel = entry.new_status ? disciplinaryStatusLabels[entry.new_status as DisciplinaryStatus] || entry.action_type : entry.action_type;
      doc.text(statusLabel, MARGIN + 9, y + 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(formatDateShort(entry.action_date), CONTENT_WIDTH + MARGIN - 2, y + 2, { align: 'right' });

      const descLines = doc.splitTextToSize(entry.description, CONTENT_WIDTH - 14);
      doc.setFontSize(8);
      doc.text(descLines, MARGIN + 9, y + 6);
      y += 6 + descLines.length * 3.5 + 3;
    }
  }

  // ─── Watermark & Footers ───────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawWatermark(doc);
    drawFooter(doc, i, totalPages);
  }

  // Save
  doc.save(`Proceso_Disciplinario_${process.case_number}.pdf`);
}
