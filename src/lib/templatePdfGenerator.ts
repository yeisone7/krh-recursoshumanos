import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { EvaluationTemplate, RatingScaleItem } from '@/types/evaluation';
import { DEFAULT_RATING_SCALE } from '@/types/evaluation';

const LEVEL_LABELS: Record<number, string> = {
  4: 'Ampliamente Desarrollada',
  3: 'Bueno dentro del Estándar',
  2: 'Competencia en Desarrollo',
  1: 'Competencia No Desarrollada',
};

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
    img.onerror = () => reject(new Error('Failed to load watermark'));
    img.src = src;
  });
}

export async function generateTemplatePdf(template: EvaluationTemplate) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const criteria = template.criteria || [];
  const questions = (template.qualitative_questions as string[]) || [];
  const ratingScale: RatingScaleItem[] = (template.rating_scale as RatingScaleItem[]) || DEFAULT_RATING_SCALE;

  let y = 15;

  // Pre-load images
  let colorLogoDataUrl: string | null = null;
  try { colorLogoDataUrl = await loadImageAsDataUrl(COLOR_LOGO_PATH); } catch { /* skip */ }

  // ─── Header ─────────────────────────────────────────────
  doc.setFillColor(59, 58, 89); // #3b3a59
  doc.rect(0, 0, pageWidth, 30, 'F');

  if (colorLogoDataUrl) {
    try { doc.addImage(colorLogoDataUrl, 'PNG', pageWidth - margin - 38, 5, 36, 20); } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANTILLA DE EVALUACIÓN DE DESEMPEÑO', margin, 13);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(template.name, margin, 20);

  doc.setFontSize(7.5);
  doc.text(
    `Generado: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`,
    margin,
    26,
  );

  y = 36;
  doc.setTextColor(0, 0, 0);

  // ─── Info card ──────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'F');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(template.is_active ? 'Activa' : 'Inactiva', margin + 22, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text('Criterios:', margin + 4, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${criteria.length}`, margin + 26, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Preguntas:', contentWidth / 2 + margin, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${questions.length}`, contentWidth / 2 + margin + 26, y + 6);

  const positions = template.positions?.map(p => p.name).join(', ') || 'Todos los cargos';
  doc.setFont('helvetica', 'bold');
  doc.text('Cargos:', contentWidth / 2 + margin, y + 12);
  doc.setFont('helvetica', 'normal');
  const posLines = doc.splitTextToSize(positions, contentWidth / 2 - 30);
  doc.text(posLines[0] || '-', contentWidth / 2 + margin + 22, y + 12);

  y += 24;

  if (template.description) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const descLines = doc.splitTextToSize(template.description, contentWidth);
    doc.text(descLines, margin, y);
    y += descLines.length * 3.5 + 4;
    doc.setTextColor(0, 0, 0);
  }

  // ─── Criteria ───────────────────────────────────────────
  const totalWeight = criteria.reduce((s, c) => s + (c.weight || 1), 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(59, 58, 89);
  doc.text('COMPETENCIAS / CRITERIOS', margin, y);
  y += 6;

  for (let i = 0; i < criteria.length; i++) {
    const c = criteria[i];
    const weightPct = totalWeight > 0 ? Math.round(((c.weight || 1) / totalWeight) * 100) : 0;

    if (y > 235) { doc.addPage(); y = 20; }

    // Criterion header
    doc.setFillColor(240, 248, 245);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${i + 1}. ${c.name}`, margin + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Peso: ${weightPct}%  |  Máx: ${c.max_score || 4}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });
    y += 10;

    if (c.description) {
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      const dLines = doc.splitTextToSize(c.description, contentWidth - 8);
      doc.text(dLines, margin + 4, y);
      y += dLines.length * 3.5 + 2;
      doc.setTextColor(0, 0, 0);
    }

    // Rubric levels
    const hasRubric = c.level_4_description || c.level_3_description || c.level_2_description || c.level_1_description;
    if (hasRubric) {
      for (let lvl = 4; lvl >= 1; lvl--) {
        const desc = (c as any)[`level_${lvl}_description`] as string | null;
        if (!desc) continue;
        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text(`(${lvl}) ${LEVEL_LABELS[lvl]}:`, margin + 6, y);
        doc.setFont('helvetica', 'normal');
        const rLines = doc.splitTextToSize(desc, contentWidth - 60);
        doc.text(rLines, margin + 50, y);
        y += Math.max(rLines.length * 3, 4) + 1;
      }
    }

    y += 3;
  }

  // ─── Qualitative questions ─────────────────────────────
  if (questions.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    y += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 58, 89);
    doc.text('PREGUNTAS CUALITATIVAS', margin, y);
    y += 6;
    doc.setTextColor(0, 0, 0);

    for (let i = 0; i < questions.length; i++) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const qLines = doc.splitTextToSize(`${i + 1}. ${questions[i]}`, contentWidth - 4);
      doc.text(qLines, margin + 2, y);
      y += qLines.length * 3.5 + 4;
    }
  }

  // ─── Rating scale ──────────────────────────────────────
  if (ratingScale.length > 0) {
    if (y > 230) { doc.addPage(); y = 20; }
    y += 2;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 58, 89);
    doc.text('TABLA DE CALIFICACIÓN', margin, y);
    y += 6;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Nivel', margin + 3, y + 5);
    doc.text('Rango %', margin + 60, y + 5);
    doc.text('Acción Requerida', margin + 90, y + 5);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    for (const r of ratingScale) {
      doc.setFontSize(7.5);
      doc.text(r.label, margin + 3, y + 4);
      doc.text(`${r.min}% – ${r.max}%`, margin + 60, y + 4);
      doc.text(r.description, margin + 90, y + 4);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);
      y += 7;
    }
  }

  // ─── Watermark + Footer ─────────────────────────────────
  let watermarkDataUrl: string | null = null;
  try {
    watermarkDataUrl = await loadImageAsDataUrl(WATERMARK_LOGO_PATH);
  } catch {
    // silently skip watermark if logo can't load
  }

  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Watermark: centered, large, very low opacity
    if (watermarkDataUrl) {
      const wmWidth = 90;
      const wmX = (pageWidth - wmWidth) / 2;
      const wmY = (pageHeight - wmWidth) / 2;
      doc.saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.06 }));
      doc.addImage(watermarkDataUrl, 'PNG', wmX, wmY, wmWidth, wmWidth);
      doc.restoreGraphicsState();
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' },
    );
  }

  doc.save(`Plantilla_${template.name.replace(/\s+/g, '_')}.pdf`);
}
