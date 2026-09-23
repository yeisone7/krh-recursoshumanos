// Isolated visual fixture: uses the real page and styles, no real identity or database.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

const fixture = `
const cuts=[{id:'cut-1',company_id:'test',operation_center_id:'north',level:1,cutoff_date:'2026-09-15',active:true,reason:'Revisión de novedades de la primera quincena',created_by_name:'María Gómez',created_at:'2026-09-16T14:00:00Z'},{id:'cut-2',company_id:'test',operation_center_id:'north',level:2,cutoff_date:'2026-09-10',active:true,reason:'Validación superior',created_by_name:'Carlos Pérez',created_at:'2026-09-16T15:00:00Z'}];
const events=[];
export const supabase={rpc:async(name,p)=>{
 if(name==='payroll_cut_centers')return{data:[{id:'north',name:'Centro Norte'},{id:'south',name:'Centro Sur'}],error:null};
 if(name==='payroll_cut_resolve_centers')return{data:[],error:null};
 if(name==='payroll_cut_change'){
  if(p.p_reason==='Error de prueba')return{data:null,error:{message:'No se pudo guardar. Intente nuevamente.'}};
  let c=cuts.find(c=>c.id===p.p_cut_id);const old=c?.cutoff_date||null;
  if(p.p_action==='create'){c={id:crypto.randomUUID(),operation_center_id:p.p_center_id,level:p.p_level,active:true,created_by_name:'Usuario de prueba'};cuts.push(c);}
  if(p.p_action==='reopen')c.active=false;else c.cutoff_date=p.p_date;
  c.reason=p.p_reason;events.unshift({id:crypto.randomUUID(),operation_center_id:p.p_center_id,level:p.p_level,action:p.p_action,old_date:old,new_date:p.p_date,reason:p.p_reason,actor_name:'Usuario de prueba',occurred_at:new Date().toISOString()});return{data:c.id,error:null};
 }return{data:[],error:null};
},from:(table)=>{const filters=[];const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},order:()=>q,range:()=>q,then:(fn)=>Promise.resolve({data:(table==='payroll_control_cuts'?cuts:events).filter(r=>filters.every(([k,v])=>k==='company_id'||r[k]===v)),error:null}).then(fn)};return q;}};`;
const server = await createServer({ configFile: false, appType: 'custom', optimizeDeps: { entries: [] }, root: process.cwd(),
  resolve: { alias: { '@': resolve('src') } }, plugins: [{ name: 'payroll-cut-fixture', enforce: 'pre',
    resolveId(id) {
      if (/contexts\/AuthContext(?:\.tsx)?$/.test(id)) return '\0cut-auth';
      if (/integrations\/supabase\/client(?:\.ts)?$/.test(id)) return '\0cut-client';
      if (id === 'payroll-preview') return '\0payroll-preview';
    },
    load(id) {
      if (id === '\0cut-auth') return `export const useAuth=()=>({currentCompanyId:'test',hasPermission:(m,a)=>!location.search.includes('view')&&(location.search.includes('level1')?!m.endsWith('nivel_dos'):true)});`;
      if (id === '\0cut-client') return fixture;
      if (id === '\0payroll-preview') return `import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import CortesControl from '/src/pages/CortesControl.tsx';import '/src/index.css';createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(CortesControl)));`;
    },
  }, react()], server: { host: '127.0.0.1', port: 5199, strictPort: true } });
server.middlewares.use(async (req,res,next) => {
  if (req.url?.split('?')[0] !== '/') return next();
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(await server.transformIndexHtml('/', '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cortes de control · Prueba visual</title></head><body><div id="root"></div><script type="module" src="/@id/__x00__payroll-preview"></script></body></html>'));
});
await server.listen();
console.log('Visual fixture: http://127.0.0.1:5199 (mock data only; ?level1 or ?view for role checks)');
