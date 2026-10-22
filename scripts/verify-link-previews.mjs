// Reads public company branding only; never consumes a real access token.
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer, loadEnv } from 'vite';

Object.assign(process.env, loadEnv('production', process.cwd(), 'VITE_'));
const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true } });
const { previewModules, moduleForPath } = await vite.ssrLoadModule('/server/link-preview/modules.ts');
let server;
const live = process.argv.find(arg => arg.startsWith('--origin='))?.slice(9);
let origin = live;
try {
  if (!origin) {
    const { default: html } = await vite.ssrLoadModule('/api/link-preview.ts');
    const { default: image } = await vite.ssrLoadModule('/api/link-preview-image.ts');
    server = createHttpServer(async (req, res) => {
      try { await (req.url.startsWith('/api/link-preview-image') ? image : html)(req, res); }
      catch (error) { console.error(error); res.statusCode = 500; res.end('Preview failed'); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
    process.env.PUBLIC_APP_URL = origin;
  }
  const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/companies?select=id,name&order=name`, {
    headers: { apikey: process.env.VITE_SUPABASE_PUBLISHABLE_API_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  assert.equal(response.status, 200);
  const companies = await response.json();
  assert.ok(companies.length >= 2, 'Need two brands to check isolation');
  const home = await fetch(new URL(`/?company=${companies[0].id}`, origin));
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes(`Gestión de talento humano | ${companies[0].name}`), 'Home must retain company branding');
  const output = 'tmp/link-preview-verification';
  await mkdir(output, { recursive: true });
  let appAsset;
  for (const company of companies) {
    const url = new URL('/dotacion/firma', origin);
    url.searchParams.set('company', company.id);
    url.hash = 'token=PRIVATE_TEST_TOKEN';
    const response = await fetch(url, { headers: { 'User-Agent': 'WhatsApp/2.0' } });
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.ok(html.includes(`Dotación | ${company.name}`), company.name);
    assert.ok(!html.includes('PRIVATE_TEST_TOKEN'));
    assert.ok(html.includes('id="root"'));
    assert.ok(html.includes('/assets/'));
    appAsset = html.match(/src="(\/assets\/[^\"]+)"/)[1];
    const imageUrl = html.match(/property="og:image" content="([^"]+)"/)[1].replaceAll('&amp;', '&');
    assert.deepEqual([...new URL(imageUrl).searchParams.keys()].sort(), ['company', 'module']);
    const image = await fetch(imageUrl);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    // Vercel consumes s-maxage at the CDN and strips it from the browser response.
    assert.ok(image.headers.get('cache-control').includes('public, max-age=300'), 'Company logo must have loaded');
    const bytes = Buffer.from(await image.arrayBuffer());
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1200);
    assert.equal(bytes.readUInt32BE(20), 630);
    await writeFile(`${output}/${company.id}.png`, bytes);
    console.log(`Company preview OK: ${company.name}`);
  }
  for (const module of previewModules) {
    const path = module.paths[0] === '/' ? '/unknown-module' : `${module.paths[0]}/PRIVATE_TEST_TOKEN`;
    const response = await fetch(new URL(`${path}?employee=PRIVATE_TEST_EMPLOYEE`, origin));
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes(`content="${moduleForPath(path).title} | EmpatiQ"`), path);
    assert.ok(!html.includes('PRIVATE_TEST_TOKEN') && !html.includes('PRIVATE_TEST_EMPLOYEE'));
  }
  if (live) {
    const response = await fetch(new URL(appAsset, origin));
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-type').includes('javascript'));
  }
  console.log(`${previewModules.length} modules verified; PNGs saved in ${output}`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await vite.close();
}
