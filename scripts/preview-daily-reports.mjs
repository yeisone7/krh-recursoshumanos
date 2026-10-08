// Real screens with synthetic in-memory responses. No credentials or database writes.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

const fixture = `
export * from '/src/lib/dailyReports.ts';
const publication={id:'pub',company_id:'qa',center_id:'center',center_name:'Centro de Operación Principal',start_date:'2026-09-01',end_date:'2026-09-30',supervisor_id:'supervisor',supervisor_name:'Ana Rodríguez',company_name:'Empresa de Prueba',format_code:'GH FO 121',format_version:'01',expires_at:'2030-01-01T00:00:00Z',revoked:false};
const services={breakfast:false,lunch:false,meal:false,dinner:false,transport:false};
const employee={id:'employee',name:'María Fernanda Rodríguez Martínez',document:'1234567890',document_type:'CC',gender:'F',age:44,position:'PROFESIONAL EN SEGURIDAD Y SALUD EN EL TRABAJO'};
const rows=Array.from({length:30},(_,i)=>({key:'day-'+i,employee_id:'employee',date:'2026-09-'+String(i+1).padStart(2,'0'),version:'v1-'+i,status:i<2?'pending':i===2?'internal_pending':'signed',can_sign:i<2,services:{...services},snapshot:{employee,cycle_id:'cycle',center_id:'center',date:'2026-09-'+String(i+1).padStart(2,'0'),ready:i!==2,internally_approved:i!==2,special_day:i%7===5,schedule:{name:i%7===5?'Descanso':'Horario administrativo',kind:'administrative',start_time:'07:30:00',end_time:'17:00:00',break_minutes:60,is_rest_day:i%7===5},extras:i===0?[{id:'extra',code:'HED',hours:2,valid:true,label:'Extra diurna'}]:[],novelties:i===0?[{id:'novelty',code:'RN',hours:1.5,valid:true,label:'Recargo nocturno'}]:[],absences:[]},evidence:null}));
const signatureCanvas=document.createElement('canvas');signatureCanvas.width=800;signatureCanvas.height=260;
const ctx=signatureCanvas.getContext('2d');ctx.strokeStyle='#132039';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(50,180);ctx.bezierCurveTo(160,5,60,240,280,90);ctx.bezierCurveTo(400,25,190,210,580,100);ctx.stroke();const png=signatureCanvas.toDataURL();
rows.slice(3).forEach(r=>r.evidence={employee_signature_url:png,employee_signed_at:'2026-10-08T15:00:00Z'});
let saved=null;let pendingImage=png;
window.dailyFixture={publication,rows,png};
export async function dailyRequest(action,body){
 if(action==='options')return{centers:[{id:'center',name:publication.center_name}],supervisors:[{id:'supervisor',name:'Ana Rodríguez',center_id:'center'}],settings:publication};
 if(action==='list')return[publication];
 if(action==='context')return{publication};
 if(action==='identify')return{session:'qa-session',expires_in_seconds:1800};
 if(action==='rows'||action==='export')return{publication,rows:structuredClone(rows),has_more:false,saved_signature:saved};
 if(action==='upload_signature'){pendingImage=body.image;if(body.save)saved={id:'sig',signature_url:body.image};return{signature_id:'sig'};}
 if(action==='signed'||action==='approved'||action==='returned'||action==='disagreed'){
  for(const item of body.days){const r=rows.find(r=>r.date===item.date);r.status=action;r.can_sign=['returned','disagreed'].includes(action);if(item.services)r.services=item.services;r.version+='x';r.reason=body.reason;
   if(action==='signed')r.evidence={employee_signature_url:pendingImage,employee_signed_at:new Date().toISOString()};
   if(action==='approved')r.evidence={...r.evidence,supervisor_signature_url:pendingImage,supervisor_signed_at:new Date().toISOString(),supervisor_name:'Ana Rodríguez'};
  }return{decision_ids:[1]};
 }
 if(action==='history'||action==='export_history'){const r=rows.find(r=>r.date===body.date);return r.evidence?[{id:1,day_key:r.key,employee_id:r.employee_id,work_date:r.date,action:r.status,snapshot:r.snapshot,services:r.services,evidence:r.evidence,actor_name:employee.name,occurred_at:'2026-10-08T15:00:00Z'}]:[];}
 if(action==='link')return{token:'demo'};
 if(action==='create')return{...publication,token:'demo'};
 if(action==='forget_signature'){saved=null;return{};}
 if(action==='audit')return[];
 return{};
}
`;
const server = await createServer({ configFile: false, appType: 'custom', optimizeDeps: { entries: [] }, resolve: { alias: { '@': resolve('src') } }, plugins: [{ name: 'daily-fixture', enforce: 'pre', resolveId(id) {
  if (/contexts\/AuthContext(?:\.tsx)?$/.test(id)) return '\0daily-auth';
  if (/integrations\/supabase\/client(?:\.ts)?$/.test(id)) return '\0daily-client';
  if (/[\\/]lib[\\/]dailyReports$/.test(id)) return '\0daily-api';
  if (id === 'daily-preview') return '\0daily-preview';
}, load(id) {
  if (id === '\0daily-auth') return `export const useAuth=()=>({currentCompanyId:'qa',user:{id:'supervisor'},hasPermission:()=>!location.search.includes('readonly')});`;
  if (id === '\0daily-client') return 'export const supabase={};';
  if (id === '\0daily-api') return fixture;
  if (id === '\0daily-preview') return `import React from 'react';import{createRoot}from'react-dom/client';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';import{MemoryRouter,Routes,Route}from'react-router-dom';import{Toaster}from'sonner';import Admin from '/src/pages/ReporteDiario.tsx';import Public from '/src/pages/PublicDailyReport.tsx';import{buildDailyReportPdf}from'/src/lib/dailyReportPdf.ts';import'/src/index.css';window.buildDailyReportPdf=buildDailyReportPdf;createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(MemoryRouter,{initialEntries:[location.search.includes('employee')?'/reporte-diario/demo':'/']},React.createElement(Routes,null,React.createElement(Route,{path:'/',element:React.createElement(Admin)}),React.createElement(Route,{path:'/reporte-diario/:token',element:React.createElement(Public)})),React.createElement(Toaster))));`;
} }, react()], server: { host: '127.0.0.1', port: 5208, strictPort: true } });
server.middlewares.use(async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/') return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(await server.transformIndexHtml('/', '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reporte Diario · QA</title></head><body><div id="root"></div><script type="module" src="/@id/__x00__daily-preview"></script></body></html>'));
});
await server.listen();
console.log('Synthetic preview: http://127.0.0.1:5208/ (?employee, ?readonly)');
