import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  PerformanceEvaluation,
  EvaluationTemplate,
  EvaluationCriteria,
  EvaluationScore,
  RatingScaleItem,
} from '@/types/evaluation';
import { DEFAULT_RATING_SCALE } from '@/types/evaluation';

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

interface EvaluationPdfData {
  evaluation: PerformanceEvaluation;
  template: EvaluationTemplate | null;
  scores: EvaluationScore[];
  companyName?: string;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'No Desarrollada',
  2: 'En Desarrollo',
  3: 'Bueno',
  4: 'Ampliamente Desarrollada',
};

export async function generateEvaluationPdf(data: EvaluationPdfData) {
  const { evaluation, template, scores, companyName } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const criteria = template?.criteria || [];
  const ratingScale: RatingScaleItem[] = template?.rating_scale || DEFAULT_RATING_SCALE;

  const HEADER_HEIGHT = 32;
  const CONTENT_START_Y = HEADER_HEIGHT + 8;
  let y = CONTENT_START_Y;

  // Pre-load images
  let colorLogoDataUrl: string | null = null;
  let watermarkDataUrl: string | null = null;
  try {
    [colorLogoDataUrl, watermarkDataUrl] = await Promise.all([
      loadImageAsDataUrl(COLOR_LOGO_PATH),
      loadImageAsDataUrl(WATERMARK_LOGO_PATH),
    ]);
  } catch {
    // silently continue without images
  }

  const dateStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const headerCompanyName = (companyName || 'PETROCASINOS S.A.').toUpperCase();

  function drawHeader(d: jsPDF) {
    d.setFillColor(27, 38, 59);
    d.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F');
    if (colorLogoDataUrl) {
      try { d.addImage(colorLogoDataUrl, 'PNG', pageWidth - margin - 38, 6, 36, 18); } catch { /* skip */ }
    }
    d.setTextColor(255, 255, 255);
    d.setFontSize(16);
    d.setFont('helvetica', 'bold');
    d.text(headerCompanyName, margin, 14);
    d.setFontSize(10);
    d.setFont('helvetica', 'normal');
    d.text('EVALUACIÓN DE DESEMPEÑO', margin, 21);
    d.setFontSize(8);
    d.text(`Fecha: ${dateStr}`, margin, 27);
  }

  drawHeader(doc);
  doc.setTextColor(0, 0, 0);

  // ─── Employee info card ─────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Empleado:', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${evaluation.employee?.first_name || ''} ${evaluation.employee?.last_name || ''}`,
    margin + 28,
    y + 7
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Cédula:', margin + 4, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(evaluation.employee?.document_number || '-', margin + 24, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Ciclo:', contentWidth / 2 + margin, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(evaluation.cycle?.name || '-', contentWidth / 2 + margin + 16, y + 7);

  if (template) {
    doc.setFont('helvetica', 'bold');
    doc.text('Plantilla:', contentWidth / 2 + margin, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(template.name, contentWidth / 2 + margin + 24, y + 14);
  }

  y += 28;

  // ─── Overall score ──────────────────────────────────────
  const overallScore = evaluation.overall_score ?? 0;
  const overallRating = evaluation.overall_rating || '-';

  doc.setFillColor(230, 90, 10); // orange accent
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Puntaje Total: ${overallScore}/100`, margin + 4, y + 9);
  doc.text(`Calificación: ${overallRating}`, pageWidth - margin - 4, y + 9, {
    align: 'right',
  });

  y += 20;
  doc.setTextColor(0, 0, 0);

  // ─── Criteria scores ───────────────────────────────────
  // Group by category
  const groups: Record<string, EvaluationCriteria[]> = {};
  const sorted = [...criteria].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  sorted.forEach((c) => {
    const cat = c.category || 'General';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(c);
  });

  for (const [category, items] of Object.entries(groups)) {
    // Check page break
    if (y > 240) {
      doc.addPage();
      drawHeader(doc);
      y = CONTENT_START_Y;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 38, 59);
    doc.text(category.toUpperCase(), margin, y);
    y += 6;

    for (const c of items) {
      if (y > 245) {
        doc.addPage();
        drawHeader(doc);
        y = CONTENT_START_Y;
      }

      const score = scores.find((s) => s.criteria_id === c.id);
      const level = score?.score ?? 0;
      const maxScore = c.max_score || 4;
      const pct = typeof level === 'number' ? (level / maxScore) * 100 : 0;
      const levelLabel = typeof level === 'number' ? LEVEL_LABELS[level] || `${level}` : '-';

      // Criteria name + score text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(50, 50, 50);
      doc.text(c.name, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`${level}/${maxScore} — ${levelLabel}`, pageWidth - margin, y, { align: 'right' });
      y += 3;

      // Progress bar background
      const barHeight = 4;
      const barWidth = contentWidth;
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(margin, y, barWidth, barHeight, 1.5, 1.5, 'F');

      // Progress bar fill – color based on percentage
      const fillWidth = (pct / 100) * barWidth;
      if (fillWidth > 0) {
        if (pct >= 75) {
          doc.setFillColor(34, 139, 34); // green
        } else if (pct >= 50) {
          doc.setFillColor(30, 100, 180); // blue
        } else if (pct >= 25) {
          doc.setFillColor(230, 160, 0); // amber
        } else {
          doc.setFillColor(200, 50, 50); // red
        }
        doc.roundedRect(margin, y, Math.max(fillWidth, 3), barHeight, 1.5, 1.5, 'F');
      }

      y += barHeight + 1.5;

      // Comment if any
      const comment = score?.comments || '';
      if (comment) {
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        const commentLines = doc.splitTextToSize(comment, contentWidth - 4);
        doc.text(commentLines.slice(0, 2), margin + 2, y + 2.5);
        y += commentLines.slice(0, 2).length * 3 + 2;
      }

      y += 4;
    }

    y += 2;
  }

  // ─── Qualitative questions ─────────────────────────────
  const questions = template?.qualitative_questions || [];
  let answers: string[] = [];
  try {
    answers = evaluation.employee_comments ? JSON.parse(evaluation.employee_comments) : [];
  } catch {
    answers = [];
  }

  if (questions.length > 0 && answers.some((a) => a)) {
    if (y > 220) {
      doc.addPage();
      drawHeader(doc);
      y = CONTENT_START_Y;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 38, 59);
    doc.text('PREGUNTAS CUALITATIVAS', margin, y);
    y += 6;

    doc.setTextColor(0, 0, 0);
    for (let i = 0; i < questions.length; i++) {
      if (y > 245) {
        doc.addPage();
        drawHeader(doc);
        y = CONTENT_START_Y;
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}. ${questions[i]}`, margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const ansLines = doc.splitTextToSize(answers[i] || 'Sin respuesta', contentWidth - 4);
      doc.text(ansLines, margin + 2, y);
      y += ansLines.length * 3.5 + 4;
    }
  }

  // ─── Summary section ───────────────────────────────────
  const summaryItems = [
    { label: 'Fortalezas', value: evaluation.strengths },
    { label: 'Áreas de Mejora', value: evaluation.areas_to_improve },
    { label: 'Plan de Desarrollo', value: evaluation.development_plan },
  ].filter((s) => s.value);

  if (summaryItems.length > 0) {
    if (y > 220) {
      doc.addPage();
      drawHeader(doc);
      y = CONTENT_START_Y;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 38, 59);
    doc.text('RESUMEN', margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);

    for (const item of summaryItems) {
      if (y > 245) {
        doc.addPage();
        drawHeader(doc);
        y = CONTENT_START_Y;
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.label}:`, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(item.value!, contentWidth - 4);
      doc.text(lines, margin + 2, y);
      y += lines.length * 3.5 + 4;
    }
  }

  // ─── Rating scale legend ───────────────────────────────
  if (y > 235) {
    doc.addPage();
    drawHeader(doc);
    y = CONTENT_START_Y;
  }
  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(120, 120, 120);
  doc.text('Escala de Calificación:', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  for (const r of ratingScale) {
    doc.text(`${r.label} (${r.min}-${r.max}%): ${r.description}`, margin + 2, y);
    y += 3.5;
  }

  // ─── Watermark + Header (pages 2+) + Footer ─────────────
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Watermark
    if (watermarkDataUrl) {
      const wmWidth = 108;
      const wmHeight = 60;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmHeight) / 2;
      doc.saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
      doc.addImage(watermarkDataUrl, 'PNG', wmX, wmY, wmWidth, wmHeight);
      doc.restoreGraphicsState();
    }

    // Footer with pagination
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `${p} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save
  const empName = `${evaluation.employee?.first_name || ''}_${evaluation.employee?.last_name || ''}`.replace(/\s+/g, '_');
  doc.save(`Evaluacion_${empName}_${evaluation.cycle?.name || 'ciclo'}.pdf`);
}
