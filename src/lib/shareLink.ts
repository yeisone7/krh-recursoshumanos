/** Company is presentation context only; it never grants access to a resource. */
export function buildShareLink(path: string, companyId?: string | null, origin = window.location.origin): string {
  const url = new URL(path, origin);
  if (url.origin !== new URL(origin).origin) throw new Error('El enlace debe pertenecer a la aplicación.');
  if (companyId) url.searchParams.set('company', companyId);
  return url.toString();
}
