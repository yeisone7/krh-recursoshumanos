import type { CompanyBranding } from './branding';
import type { PreviewModule } from './modules';

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function previewHead(module: PreviewModule, brand: CompanyBranding | null, imageUrl: string): string {
  const title = `${module.title} | ${brand?.name || 'EmpatiQ'}`;
  const meta = (key: string, value: string, property = false) => `<meta ${property ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}" />`;
  return [
    `<title>${escapeHtml(title)}</title>`,
    meta('description', module.description),
    meta('robots', 'noindex, nofollow, noarchive'),
    meta('referrer', 'no-referrer'),
    meta('og:type', 'website', true),
    meta('og:locale', 'es_CO', true),
    meta('og:site_name', brand?.name || 'EmpatiQ', true),
    meta('og:title', title, true),
    meta('og:description', module.description, true),
    meta('og:image', imageUrl, true),
    meta('og:image:type', 'image/png', true),
    meta('og:image:width', '1200', true),
    meta('og:image:height', '630', true),
    meta('og:image:alt', title, true),
    meta('twitter:card', 'summary_large_image'),
    meta('twitter:title', title),
    meta('twitter:description', module.description),
    meta('twitter:image', imageUrl),
    meta('twitter:image:alt', title),
  ].join('\n    ');
}

export function replacePreviewHead(html: string, head: string): string {
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|referrer|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi, '')
    .replace('</head>', `${head}\n  </head>`);
}
