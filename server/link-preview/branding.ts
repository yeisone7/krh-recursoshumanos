export interface CompanyBranding { name: string; logoUrl: string | null }
export const companyIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function safeLogoUrl(value: unknown, supabaseUrl: string): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.origin !== new URL(supabaseUrl).origin || url.username || url.password) return null;
    if (!url.pathname.startsWith('/storage/v1/object/public/company_logos/')) return null;
    return url.href;
  } catch { return null; }
}

/** Public brand fields only. No service key, employee lookup or token validation. */
export async function getCompanyBranding(companyId: string | null): Promise<CompanyBranding | null> {
  if (!companyId || !companyIdPattern.test(companyId)) return null;
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_API_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return null;
  try {
    const url = new URL('/rest/v1/companies', base);
    url.search = new URLSearchParams({ select: 'name,logo_url,horizontal_logo_url', id: `eq.${companyId}`, limit: '1' }).toString();
    const response = await fetch(url, { headers: { apikey: key }, signal: AbortSignal.timeout(2500), redirect: 'error' });
    if (!response.ok) return null;
    const [company] = await response.json();
    if (!company || typeof company.name !== 'string') return null;
    return {
      name: company.name.slice(0, 100),
      logoUrl: safeLogoUrl(company.horizontal_logo_url, base) || safeLogoUrl(company.logo_url, base),
    };
  } catch { return null; }
}

/** Embed validated image bytes: the image renderer never fetches arbitrary URLs. */
export async function loadLogoData(brand: CompanyBranding | null): Promise<string | null> {
  if (!brand?.logoUrl) return null;
  try {
    const response = await fetch(brand.logoUrl, { redirect: 'error', signal: AbortSignal.timeout(2500) });
    const type = response.headers.get('content-type')?.split(';')[0];
    if (!response.ok || !['image/png', 'image/jpeg', 'image/webp'].includes(type ?? '')) return null;
    const limit = 3 * 1024 * 1024;
    if (Number(response.headers.get('content-length')) > limit || !response.body) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
  } catch { return null; }
}
