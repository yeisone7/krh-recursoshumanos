import type { EvaluationCriteria, EvaluationTemplate, RatingScaleItem } from '@/types/evaluation';

export function calculateEvaluationResult(
  criteria: Pick<EvaluationCriteria, 'id' | 'weight' | 'max_score'>[],
  scores: Record<string, { level: number | null }>,
  scale: RatingScaleItem[],
) {
  const answered = criteria.filter(c => Number.isInteger(scores[c.id]?.level)
    && scores[c.id].level! >= 1 && scores[c.id].level! <= (c.max_score ?? 4));
  const complete = criteria.length > 0 && answered.length === criteria.length;
  if (!complete) return { answered: answered.length, complete, percentage: null, average: null, rating: null };
  const weight = criteria.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  if (weight <= 0) return { answered: answered.length, complete: false, percentage: null, average: null, rating: null };
  const raw = criteria.reduce((sum, c) => sum + scores[c.id].level! / (c.max_score ?? 4) * (c.weight ?? 1), 0) / weight * 100;
  return {
    answered: answered.length,
    complete,
    percentage: Math.round(raw * 100) / 100,
    average: Math.round(criteria.reduce((sum, c) => sum + scores[c.id].level! * (c.weight ?? 1), 0) / weight * 100) / 100,
    rating: scale.find(r => Math.round(raw + 1e-10) >= r.min && Math.round(raw + 1e-10) <= r.max)?.label ?? null,
  };
}

export function templateAppliesToPosition(template: EvaluationTemplate | null | undefined, positionId?: string | null) {
  if (!template || !template.is_active) return false;
  // Excel templates must be configured explicitly; an empty assignment never means everyone.
  if (!template.positions?.length) return !template.preset_key;
  return !!positionId && template.positions.some(position => position.id === positionId);
}
