import type { EvaluationStatus } from '@/types/evaluation';

export const EVALUATION_PERMISSION_CODES = {
  base: 'evaluaciones',
  review: 'evaluaciones_review',
  approve: 'evaluaciones_approve',
} as const;

export function canTransitionEvaluation(
  previous: EvaluationStatus,
  next: EvaluationStatus,
  permissions: { canReview: boolean; canApprove: boolean },
) {
  return (previous === 'submitted' && next === 'reviewed' && permissions.canReview)
    || (previous === 'reviewed' && next === 'approved' && permissions.canApprove);
}
