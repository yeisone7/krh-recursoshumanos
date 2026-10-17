import type { PerformanceEvaluation, EvaluationTemplate, EvaluationScore } from '@/types/evaluation';
import { createEvaluationPdf } from './evaluationPdfDocument';

export async function generateEvaluationPdf(data: { evaluation: PerformanceEvaluation; template: EvaluationTemplate | null; scores: EvaluationScore[]; companyName?: string }) {
  const { evaluation, template, scores, companyName } = data;
  const doc = createEvaluationPdf(template, evaluation, scores, companyName);
  const name = `${evaluation.employee?.first_name || ''}_${evaluation.employee?.last_name || ''}`.replace(/\s+/g, '_');
  doc.save(`Evaluacion_${name}.pdf`);
}
