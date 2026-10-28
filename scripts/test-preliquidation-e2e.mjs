// Controlled browser E2E: real page, queries, Supabase HTTP client, engine,
// table and downloaded Excel. Auth identity and HTTP responses are fixtures.
// Run: node scripts/test-preliquidation-e2e.mjs
// Set PLAYWRIGHT_MODULE when Playwright is installed outside this repository.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import * as XLSXModule from 'xlsx';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch { playwright = require(path.join(homedir(), '.codex/skills/gstack/browse/node_modules/playwright')); }
const XLSX = XLSXModule.default || XLSXModule;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'outputs/preliquidacion-e2e');
await mkdir(out, { recursive: true });
const company = '00000000-0000-4000-8000-000000000001';
const day = '2026-10-27';
const cases = [
  { id: 'day', name: 'Diurno', start: '08:00', end: '18:00', expected: { 'Jornada (días)': 1, 'HEDO (hrs)': 3 } },
  { id: 'mixed', name: 'Mixto', start: '14:00', end: '23:00', expected: { 'Jornada (días)': 1, 'HENO (hrs)': 2, 'RN (hrs)': 2 } },
  { id: 'holiday', name: 'Festivo', start: '08:00', end: '18:00', date: '2026-10-28', expected: { 'Festivo Trabajado': 1, 'HEDF (hrs)': 3 } },
  { id: 'cross', name: 'Medianoche', start: '20:00', end: '06:00', expected: { 'Jornada (días)': 1, 'RN (hrs)': 4, 'RNF (hrs)': 3, 'HENF (hrs)': 3 } },
  { id: 'pause', name: 'Pausa', start: '14:00', end: '00:00', pause: 60, expected: { 'Jornada (días)': 1, 'HENO (hrs)': 2, 'RN (hrs)': 2.5 } },
  { id: 'manual', name: 'Conciliado', start: '08:00', end: '18:00', manual: true, expected: { 'Jornada (días)': 1, 'HEDO (hrs)': 3 } },
  { id: 'short', name: 'Parcial', start: '08:00', end: '11:30', expected: { 'Jornada (días)': 0.5 } },
  { id: 'rest', name: 'Descanso', start: '08:00', end: '18:00', rest: true, expected: { 'Descanso Remunerado': 1 } },
];
const uuid = i => `00000000-0000-4000-8000-${String(i + 10).padStart(12, '0')}`;
cases.forEach((c, i) => { c.employee = uuid(i); });
const fixtures = {
  payroll_labor_config: { daily_hours: 8, display_unit: 'hours', night_start: '19:00', night_end: '06:00', max_weekly_hours: 42 },
  operation_centers: [{ id: 'center', name: 'Centro E2E', company_id: company }],
  company_holidays: [{ holiday_date: '2026-10-28' }],
  employees_v2: cases.map(c => ({ id: c.employee, company_id: company, first_name: c.name, last_name: 'E2E', document_number: c.id, is_active: true,
    employee_work_info: [{ is_current: true, operation_center_id: 'center', operation_centers: { id: 'center', name: 'Centro E2E' } }], employee_employment_cycles: [], employee_contact: [] })),
  employee_schedule: cases.map(c => ({ id: `schedule-${c.id}`, employee_id: c.employee, valid_from: '2026-01-01', valid_to: null, rest_day: 'domingo',
    shift_types: { id: 'seven', name: 'Jornada 7 horas', start_time: '08:00', end_time: '16:00', break_duration_minutes: 60 } })),
  employee_shift_assignments: cases.map(c => ({ id: `assignment-${c.id}`, employee_id: c.employee, assignment_date: c.date || day,
    shifts: { name: c.name, start_time: c.start, end_time: c.end, break_minutes: c.pause || 0, crosses_midnight: c.end <= c.start, is_rest_day: !!c.rest } })),
  overtime_records: cases.filter(c => c.manual).map(c => ({ employee_id: c.employee, work_date: day, overtime_type: 'extra_diurna', total_hours: 3, status: 'aprobado' })),
};
const authCode = `export const useAuth = () => ({currentCompanyId: '${company}', user: {id:'e2e'}, assignedCenterIds: [], isAdmin: true, isSuperAdmin: true, canView:()=>true, canCreate:()=>true, canExport:()=>true});`;
const entry = `import React from 'react'; import {createRoot} from 'react-dom/client'; import {QueryClient,QueryClientProvider} from '@tanstack/react-query'; import Page from '/src/pages/PreLiquidacion.tsx'; import '/src/index.css'; createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},React.createElement(Page)));`;
const server = await createServer({
  optimizeDeps: { entries: [], include: ['react', 'react-dom/client', '@tanstack/react-query', 'xlsx'] },
  root, configFile: false, plugins: [react(), {
    name: 'payroll-e2e-fixtures',
    enforce: 'pre',
    resolveId(id) { if (id === '\0payroll-auth' || id === '@/contexts/AuthContext' || id.endsWith('/contexts/AuthContext')) return '\0payroll-auth'; if (id === '/__payroll_entry.js') return '\0payroll-entry'; },
    load(id) { if (id === '\0payroll-auth') return authCode; if (id === '\0payroll-entry') return entry; },
    configureServer(server) { server.middlewares.use('/__payroll_e2e', async (_req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml('/__payroll_e2e', '<html><head></head><body><div id="root"></div><script type="module" src="/__payroll_entry.js"></script></body></html>')); }); },
  }], resolve: { alias: [{ find: '@/contexts/AuthContext', replacement: '\0payroll-auth' }, { find: '@', replacement: path.join(root, 'src') }] },
  define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://payroll-e2e.invalid'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('controlled-public-test-key') },
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
try {
  await server.listen();
  browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  const errors = [], requests = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Browser error:', e.message); });
  page.on('console', message => { if (message.type() === 'error') console.error('Browser console:', message.text()); });
  await page.route('https://payroll-e2e.invalid/**', async route => {
    const request = route.request(), url = new URL(request.url());
    assert.equal(request.method(), 'GET', 'E2E must never mutate payroll records');
    const table = url.pathname.split('/').at(-1);
    requests.push({ table, query: Object.fromEntries(url.searchParams), assignmentBounds: url.searchParams.getAll('assignment_date') });
    if (table === 'employee_schedule') assert.match(url.searchParams.get('select'), /shift_types\(id,name,start_time,end_time,break_duration_minutes\)/);
    let data = structuredClone(fixtures[table] ?? []);
    if (Array.isArray(data)) {
      for (const [key, expr] of url.searchParams) {
        const match = /^(gte|lte)\.(.*)$/.exec(expr);
        if (match) data = data.filter(row => row[key] == null || (match[1] === 'gte' ? row[key] >= match[2] : row[key] <= match[2]));
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
  });
  const address = server.httpServer.address();
  await page.goto(`http://127.0.0.1:${address.port}/__payroll_e2e`);
  await page.getByLabel('Fecha inicio').fill(day);
  await page.getByLabel('Fecha fin').fill('2026-10-28');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await page.getByText('Diurno E2E', { exact: true }).waitFor();
  assert.equal(await page.locator('tbody tr').count(), cases.length);
  // General company daily_hours=8 must not turn this employee's Jornada into 8h.
  const diurno = page.locator('tbody tr').filter({ hasText: 'Diurno E2E' });
  assert.equal(await diurno.locator('td').nth(4).innerText(), '7');
  assert.equal(await diurno.locator('td').nth(10).innerText(), '3');
  const partial = page.locator('tbody tr').filter({ hasText: 'Parcial E2E' });
  assert.equal(await partial.locator('td').nth(4).innerText(), '3,5');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Excel' }).click();
  const download = await downloadPromise;
  const excelPath = path.join(out, download.suggestedFilename());
  await download.saveAs(excelPath);
  const wb = XLSX.readFile(excelPath), rows = XLSX.utils.sheet_to_json(wb.Sheets['Pre-Liquidación']);
  for (const c of cases) {
    const row = rows.find(r => r.Documento === c.id);
    assert.ok(row, `Missing Excel row ${c.id}`);
    for (const concept of ['HEDO (hrs)', 'HENO (hrs)', 'HEDF (hrs)', 'HENF (hrs)', 'RN (hrs)', 'RNF (hrs)']) {
      assert.equal(row[concept], c.expected[concept] || 0, `${c.id}: ${concept}`);
    }
    for (const [key, value] of Object.entries(c.expected)) assert.equal(row[key], value, `${c.id}: ${key}`);
    if (c.id === 'pause') assert.match(row.Alerta, /proporcionalmente/);
    if (c.manual) assert.match(row.Alerta, /sin duplicar/);
  }
  await page.screenshot({ path: path.join(out, 'results.png'), fullPage: true });
  // A one-day period must include prior-day shift tails, but not pay the day twice.
  await page.getByLabel('Fecha inicio').fill('2026-10-28');
  await page.getByRole('button', { name: 'Calcular', exact: true }).click();
  await page.getByText('Medianoche E2E', { exact: true }).waitFor();
  const cross = page.locator('tbody tr').filter({ hasText: 'Medianoche E2E' });
  await page.waitForFunction(() => [...document.querySelectorAll('tbody tr')].find(r => r.textContent.includes('Medianoche E2E'))?.querySelectorAll('td')[4].textContent === '0');
  assert.equal(await cross.locator('td').nth(13).innerText(), '3');
  assert.equal(await cross.locator('td').nth(15).innerText(), '3');
  assert.ok(requests.some(r => r.table === 'employee_shift_assignments' && r.assignmentBounds.includes('gte.2026-10-27') && r.assignmentBounds.includes('lte.2026-10-28')));
  assert.deepEqual(errors, []);
  const result = { status: 'PASS', scenarios: cases.length, checks: ['real HTTP queries', 'Jornada 7h despite company 8h', 'day/night/holiday/rest', 'midnight and period carry-in', 'proportional break alert', 'approved overtime reconciliation', 'partial Jornada', 'downloaded Excel'], browserErrors: errors, productionWrites: 0 };
  await writeFile(path.join(out, 'result.json'), JSON.stringify({ ...result, requests, rows }, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { if (browser) await browser.close(); await server.close(); }
