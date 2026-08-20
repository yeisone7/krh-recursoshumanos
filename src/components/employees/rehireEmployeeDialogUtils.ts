export const REHIRE_DIALOG_CONTENT_CLASSNAME =
  'flex max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden border-border/70 p-0 shadow-2xl sm:max-w-[820px] sm:rounded-2xl';

export function getAvailableDirectRehirePositions<
  T extends { is_active?: boolean | null },
>(positions: T[]) {
  return positions.filter((position) => position.is_active ?? true);
}
