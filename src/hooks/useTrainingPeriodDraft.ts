import { useState } from 'react';
import { useTrainingCoursePeriodAssignments } from './useTraining';
import type { TrainingPeriodInput } from '@/lib/trainingPeriods';

const EMPTY_PERIODS: TrainingPeriodInput[] = [];

/** A fetched value may initialize an editor, but must never replace a local edit. */
export function useTrainingPeriodDraft(courseId: string | null) {
  const query = useTrainingCoursePeriodAssignments(courseId);
  const [draft, setDraft] = useState<{ courseId: string | null; periods: TrainingPeriodInput[] } | null>(null);
  const ownsDraft = draft !== null && draft.courseId === courseId;
  const periods = ownsDraft ? draft.periods : (query.data ?? EMPTY_PERIODS);
  const isReady = !courseId || ownsDraft || query.isSuccess;

  return {
    periods,
    isReady,
    isError: !isReady && query.isError,
    retry: query.refetch,
    setPeriods: (next: TrainingPeriodInput[]) => {
      if (isReady) setDraft({ courseId, periods: next });
    },
    // Retain the new course's selection even if its first read returns no rows.
    adoptCreatedCourse: (id: string) => setDraft({ courseId: id, periods }),
  };
}
