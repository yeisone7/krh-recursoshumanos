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

export function generateEvaluationPdf(data: EvaluationPdfData) {
  const { evaluation, template, scores, companyName } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const criteria = template?.criteria || [];
  const ratingScale: RatingScaleItem[] = template?.rating_scale || DEFAULT_RATING_SCALE;

  let y = 15;

  // ─── Header ─────────────────────────────────────────────
  doc.setFillColor(27, 38, 59); // navy
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text((companyName || 'PETROCASINOS S.A.').toUpperCase(), margin, 14);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('EVALUACIÓN DE DESEMPEÑO', margin, 21);

  doc.setFontSize(8);
  doc.text(
    `Fecha: ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es })}`,
    margin,
    27
  );

  y = 40;
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
      y = 20;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 38, 59);
    doc.text(category.toUpperCase(), margin, y);
    y += 2;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Criterio', margin + 2, y + 5);
    doc.text('Peso', margin + 90, y + 5);
    doc.text('Nivel', margin + 108, y + 5);
    doc.text('Calificación', margin + 125, y + 5);
    doc.text('Comentarios', margin + 148, y + 5);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    for (const c of items) {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }

      const score = scores.find((s) => s.criteria_id === c.id);
      const level = score?.score ?? '-';
      const levelLabel = typeof level === 'number' ? LEVEL_LABELS[level] || `${level}` : '-';
      const comment = score?.comments || '';

      doc.setFontSize(7.5);
      doc.text(c.name.substring(0, 45), margin + 2, y + 4);
      doc.text(`${c.weight || 1}`, margin + 92, y + 4);
      doc.text(`${level}/${c.max_score || 4}`, margin + 108, y + 4);
      doc.text(levelLabel.substring(0, 18), margin + 125, y + 4);

      // Wrap comments
      const commentLines = doc.splitTextToSize(comment, 30);
      doc.setFontSize(6.5);
      doc.text(commentLines.slice(0, 2), margin + 148, y + 4);

      const rowHeight = Math.max(7, commentLines.length * 3.5);
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y + rowHeight, margin + contentWidth, y + rowHeight);
      y += rowHeight + 1;
    }

    y += 4;
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
      y = 20;
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
        y = 20;
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
      y = 20;
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
        y = 20;
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
    y = 20;
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

  // ─── Footer ────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  // Save
  const empName = `${evaluation.employee?.first_name || ''}_${evaluation.employee?.last_name || ''}`.replace(/\s+/g, '_');
  doc.save(`Evaluacion_${empName}_${evaluation.cycle?.name || 'ciclo'}.pdf`);
}
