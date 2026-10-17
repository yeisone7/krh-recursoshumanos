import { jsPDF } from 'jspdf';
import type { EvaluationTemplate, PerformanceEvaluation, EvaluationScore } from '@/types/evaluation';
import { DEFAULT_RATING_SCALE } from '@/types/evaluation';

/** Flowing text keeps long Excel criteria and observations intact across pages. */
export function createEvaluationPdf(template: EvaluationTemplate | null, evaluation?: PerformanceEvaluation, scores: EvaluationScore[] = [], companyName?: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const width = 174;
  let y = 0;
  const newPage = () => {
    if (y) doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(35, 35, 35);
    doc.text(companyName || 'Empatiq', margin, 15);
    doc.setFontSize(9); doc.text('EVALUACIÓN DE DESEMPEÑO', margin, 22);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(template?.preset_key ? 'GH-FO-05-DR · Versión 01' : 'Evaluación por competencias', margin, 28);
    y = 37;
  };
  newPage();
  const text = (value: string, bold = false, size = 9) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(value, width);
    for (const line of lines) {
      if (y > 275) { newPage(); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); }
      doc.text(line, margin, y); y += size * 0.45;
    }
    y += 2;
  };
  const section = (title: string) => { if (y > 252) newPage(); y += 3; text(title, true, 10); };

  text(template?.name || 'Evaluación', true, 12);
  if (evaluation) {
    text(`Nombre: ${evaluation.employee?.first_name || ''} ${evaluation.employee?.last_name || ''}`);
    text(`Documento: ${evaluation.employee?.document_number || '—'}`);
    text(`Cargo: ${evaluation.position_name || '—'}    Campo: ${evaluation.field_name || '—'}`);
    text(`Jefe inmediato: ${evaluation.manager_name || '—'}`);
    text(`Fecha: ${evaluation.evaluation_date || '—'}    Ciclo: ${evaluation.cycle?.name || '—'}`);
    section(evaluation.overall_score == null ? 'Evaluación incompleta' : `Resultado: ${evaluation.overall_score.toFixed(2)} % · ${evaluation.overall_rating || ''}`);
  } else {
    text('Nombre: ____________________________________    Fecha: ______________');
    text('Cargo: ________________________    Campo: __________________________');
    text('Jefe inmediato: __________________________________________________');
    text(`Cargos aplicables: ${template?.positions?.map(p => p.name).join(', ') || (template?.preset_key ? 'Por configurar' : 'Todos')}`);
  }
  section('Valoraciones');
  text('4: Grado alto, competencia plenamente desarrollada.\n3: Grado apropiado, competencia dentro del estándar.\n2: Grado mínimo necesario para el puesto, competencia en desarrollo.\n1: Grado insatisfactorio, competencia no desarrollada.');
  let previousCategory = '';
  for (const criterion of [...(template?.criteria || [])].sort((a,b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    if (criterion.category !== previousCategory) {
      section(criterion.category || 'General');
      if (criterion.competency_description) text(criterion.competency_description, false, 8);
      previousCategory = criterion.category || '';
    }
    if (y > 250) newPage();
    if (criterion.dimension) text(`Dimensión: ${criterion.dimension}`, true, 8);
    text(criterion.name, true);
    if (criterion.description) text(criterion.description, false, 8);
    const score = scores.find(s => s.criteria_id === criterion.id);
    text(`Valoración: ${score ? `${score.score} / ${criterion.max_score ?? 4}` : '____ / 4'}`);
    text(`Observación: ${score?.comments || '____________________________________________________'}`, false, 8);
  }
  section('Aspectos a destacar');
  text(evaluation?.strengths || '________________________________________________________________');
  if (evaluation?.areas_to_improve) { section('Áreas de mejora'); text(evaluation.areas_to_improve); }
  if (evaluation?.development_plan) { section('Plan de desarrollo'); text(evaluation.development_plan); }
  let answers: string[] = [];
  try { const parsed = JSON.parse(evaluation?.employee_comments || '[]'); if (Array.isArray(parsed)) answers = parsed; } catch { /* Legacy text. */ }
  for (const [i, question] of (template?.qualitative_questions || []).entries()) {
    text(question, true); text(answers[i] || '____________________________________________________');
  }
  section('Tabla de valores');
  for (const rating of template?.rating_scale || DEFAULT_RATING_SCALE) {
    text(`${rating.label} (${rating.min}–${rating.max} %): ${rating.description}`, false, 8);
  }
  text('Porcentaje = promedio de las valoraciones / 4 × 100 (criterios con el mismo peso). La categoría usa el porcentaje redondeado al entero.', false, 8);
  if (y > 225) newPage();
  section('Firmas');
  text(`Evaluado por: ${evaluation?.evaluator_name || '____________________________________'}`);
  const signatureY = y;
  if (evaluation?.evaluator_signature) doc.addImage(evaluation.evaluator_signature, 'PNG', margin, signatureY, 70, 24);
  if (evaluation?.employee_signature) doc.addImage(evaluation.employee_signature, 'PNG', margin + 92, signatureY, 70, 24);
  y += 28;
  text('Firma del evaluador                                          Firma del colaborador', false, 8);
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`${page} / ${pages}`, 192, 288, { align: 'right' });
  }
  return doc;
}
