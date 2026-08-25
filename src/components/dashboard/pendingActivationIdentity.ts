export function resolvePendingUserLabel(
  fullName: string | null | undefined,
  displayName: string | null | undefined,
) {
  return fullName?.trim()
    || displayName?.trim()
    || 'Usuario sin identificar';
}
