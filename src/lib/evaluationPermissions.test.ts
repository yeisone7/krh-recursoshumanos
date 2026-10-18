import { describe, expect, it } from 'vitest';
import { canTransitionEvaluation } from './evaluationPermissions';
import type { EvaluationStatus } from '@/types/evaluation';

describe('permisos de estados de evaluación', () => {
  it('separa revisión de aprobación y rechaza saltos o retrocesos', () => {
    const states: EvaluationStatus[] = ['pending', 'in_progress', 'submitted', 'reviewed', 'approved'];
    for (const canReview of [false, true]) for (const canApprove of [false, true]) {
      const allowed = states.flatMap(previous => states.filter(next =>
        canTransitionEvaluation(previous, next, { canReview, canApprove }),
      ).map(next => `${previous}:${next}`));
      expect(allowed).toEqual([
        ...(canReview ? ['submitted:reviewed'] : []),
        ...(canApprove ? ['reviewed:approved'] : []),
      ]);
    }
  });
});
