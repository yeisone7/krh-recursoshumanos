import type { EvaluationTemplate } from '@/types/evaluation';
import { createEvaluationPdf } from './evaluationPdfDocument';

export async function generateTemplatePdf(template: EvaluationTemplate) {
  createEvaluationPdf(template).save(`Plantilla_${template.name.replace(/\s+/g, '_')}.pdf`);
}
