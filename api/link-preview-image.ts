import type { IncomingMessage, ServerResponse } from 'node:http';
import { createElement as h } from 'react';
import { ImageResponse } from '@vercel/og';
import { getCompanyBranding, loadLogoData } from '../server/link-preview/branding.js';
import { moduleById } from '../server/link-preview/modules.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
  const url = new URL(req.url || '/', 'https://preview.invalid');
  const module = moduleById(url.searchParams.get('module') || 'general');
  const brand = await getCompanyBranding(url.searchParams.get('company'));
  const logo = await loadLogoData(brand);
  const card = (logo: string | null) => h('div', { style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f5f7fb', color: '#182c44', padding: '54px 68px', fontFamily: 'sans-serif', borderLeft: '16px solid #2398ba' } },
    h('div', { style: { display: 'flex', height: 152, alignItems: 'center', justifyContent: 'space-between' } },
      logo ? h('img', { src: logo, width: 340, height: 132, style: { objectFit: 'contain', objectPosition: 'left center' } })
        : h('div', { style: { fontSize: 32, maxWidth: 700 } }, brand?.name || 'EmpatiQ'),
      h('div', { style: { display: 'flex', fontSize: 18, color: '#52677c', letterSpacing: '2px' } }, 'TALENTO HUMANO')),
    h('div', { style: { display: 'flex', marginTop: 34, fontSize: 58, fontWeight: 700, lineHeight: 1.1 } }, module.title),
    h('div', { style: { display: 'flex', marginTop: 24, fontSize: 28, lineHeight: 1.4, maxWidth: 990, color: '#52677c' } }, module.description),
    h('div', { style: { display: 'flex', marginTop: 'auto', fontSize: 20, color: '#52677c' } }, brand?.name || 'Gestión de talento humano'));
  const render = async (data: string | null) => Buffer.from(await new ImageResponse(card(data), { width: 1200, height: 630 }).arrayBuffer());
  let bytes: Buffer;
  let hasLogo = Boolean(logo);
  try { bytes = await render(logo); }
  catch { bytes = await render(null); hasLogo = false; }
  res.setHeader('Content-Type', 'image/png');
  // Short shared cache, isolated by company + module; failed branding is never cached.
  res.setHeader('Cache-Control', brand && hasLogo ? 'public, max-age=300, s-maxage=300' : 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(req.method === 'HEAD' ? undefined : bytes);
}
