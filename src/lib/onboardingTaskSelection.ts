export function selectOnboardingTasks<T>(
  positionTasks: readonly T[] | null | undefined,
  predefinedTasks: readonly T[],
): readonly T[] {
  return positionTasks?.length ? positionTasks : predefinedTasks;
}
