// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { moduleForPath, previewModules } from '../../server/link-preview/modules';
import { getCompanyBranding, loadLogoData, safeLogoUrl } from '../../server/link-preview/branding';
import { previewHead, replacePreviewHead } from '../../server/link-preview/metadata';

const company = '0a1a781e-e8ad-4ae6-a475-1f717c100304';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('private-by-design link previews', () => {
  it.each([
    ['/registro?token=secret', 'registro'], ['/capacitacion/grupo?token=secret', 'capacitaciones'],
    ['/solicitud-permiso?token=secret', 'permisos'], ['/dotacion/firma#token=secret', 'dotacion'],
    ['/asistencia/secret', 'asistencia'], ['/asistencia/dinamico?point=id&token=secret', 'asistencia'],
    ['/descargos?token=secret', 'disciplinarios'], ['/copasst/votar?token=secret', 'copasst'],
    ['/verificar-certificado/secret', 'certificados'], ['/reporte-diario/secret', 'reporte-diario'],
    ['/nomina/reporte-diario', 'reporte-diario'], ['/requisiciones?id=secret', 'requisiciones'],
  ])('maps %s to fixed module copy', (path, id) => {
    const module = moduleForPath(path);
    expect(module.id).toBe(id);
    expect(JSON.stringify(module)).not.toContain('secret');
  });

  it('covers every declared public and workspace route', () => {
    for (const file of ['src/App.tsx', 'src/routes/workspaceRoutes.tsx']) {
      const source = readFileSync(file, 'utf8');
      const paths = [...source.matchAll(/path(?:=|:\s*)["']([^"']+)["']/g)].map(match => match[1]);
      for (const path of paths.filter(path => path !== '/' && path !== '/*')) {
        expect(moduleForPath(path).id, path).not.toBe('general');
      }
    }
    expect(new Set(previewModules.map(module => module.id)).size).toBe(previewModules.length);
  });

  it('never reflects employee identifiers, access tokens, or arbitrary text in HTML', () => {
    const module = moduleForPath('/empleados/123456789/360?name=PersonaPrivada&token=secret');
    const head = previewHead(module, { name: 'Empresa <script>&"', logoUrl: null }, 'https://app.example/api/link-preview-image?company=a&module=empleados');
    const html = replacePreviewHead(readFileSync('index.html', 'utf8'), head);
    expect(html).not.toMatch(/123456789|PersonaPrivada|secret|<script>&/);
    expect(html).toContain('Empresa &lt;script&gt;&amp;&quot;');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html.match(/property="og:image"/g)).toHaveLength(1);
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('/src/main.tsx');
  });

  it('rejects lookalike routes and uses a neutral fallback without a company', () => {
    expect(moduleForPath('/registro-privado')).toEqual(moduleForPath('/'));
    const head = previewHead(moduleForPath('/dotacion/firma'), null, 'https://app.example/image');
    expect(head).toContain('Dotación | EmpatiQ');
    expect(head).not.toContain('KRH');
  });

  it('only queries public branding columns for the requested company', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_API_KEY', 'sb_publishable_test');
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ name: 'Empresa A', horizontal_logo_url: 'https://project.supabase.co/storage/v1/object/public/company_logos/a.png' }])));
    vi.stubGlobal('fetch', fetcher);
    const result = await getCompanyBranding(company);
    expect(result?.name).toBe('Empresa A');
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.pathname).toBe('/rest/v1/companies');
    expect(url.searchParams.get('select')).toBe('name,logo_url,horizontal_logo_url');
    expect(url.searchParams.get('id')).toBe(`eq.${company}`);
    expect(fetcher.mock.calls[0][1].headers).toEqual({ apikey: 'sb_publishable_test' });
    await getCompanyBranding('not-a-uuid');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('blocks arbitrary image fetches, private storage, and redirected logos', async () => {
    const base = 'https://project.supabase.co';
    for (const url of ['http://127.0.0.1/logo.png', `${base}.evil.test/storage/v1/object/public/company_logos/x.png`, `${base}/storage/v1/object/public/documents/personal.png`, `${base}/storage/v1/object/sign/company_logos/x.png`]) {
      expect(safeLogoUrl(url, base)).toBeNull();
    }
    const fetcher = vi.fn().mockRejectedValue(new Error('redirect blocked'));
    vi.stubGlobal('fetch', fetcher);
    expect(await loadLogoData({ name: 'A', logoUrl: `${base}/storage/v1/object/public/company_logos/x.png` })).toBeNull();
    expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  });

  it('fails safely if company branding is unavailable', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_API_KEY', 'sb_publishable_test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await getCompanyBranding(company)).toBeNull();
  });
});
