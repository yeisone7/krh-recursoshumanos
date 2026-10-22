import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { companyIdPattern, getCompanyBranding } from '../server/link-preview/branding.js';
import { moduleForPath } from '../server/link-preview/modules.js';
import { previewHead, replacePreviewHead } from '../server/link-preview/metadata.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
  const origin = process.env.PUBLIC_APP_URL || 'https://empatiq.portalpetrocasinos.com';
  const request = new URL(req.url || '/', origin);
  const module = moduleForPath(request.searchParams.get('previewPath') || request.pathname);
  const companyId = request.searchParams.get('company');
  const [brand, shell] = await Promise.all([
    getCompanyBranding(companyId),
    readFile(join(process.cwd(), 'dist', 'index.html'), 'utf8'),
  ]);
  const image = new URL('/api/link-preview-image', origin);
  image.searchParams.set('module', module.id);
  if (companyId && companyIdPattern.test(companyId)) image.searchParams.set('company', companyId);
  // This shell contains only compiled app assets, never SSR employee data.
  const html = replacePreviewHead(shell, previewHead(module, brand, image.href));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(req.method === 'HEAD' ? undefined : html);
}
