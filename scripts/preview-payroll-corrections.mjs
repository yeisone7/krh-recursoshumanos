// Isolated visual fixture. No credentials, real employees or database writes.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'node:path';

const fixture = `
const future=new Date(Date.now()+6*3600000).toISOString();
const base={company_id:'test',employee_id:'employee',employee_name:'Yeison Escobar',operation_center_id:'north',center_name:'Centro Norte',requested_by:'operator',requested_by_name:'Ana Rodríguez',start_date:'2026-09-05',end_date:'2026-09-10',expires_at:future,actions:['jornadas:update','jornadas:approve','novedades:create','novedades:approve'],reason:'Corregir turnos del 5 al 10 de septiembre y registrar horas pendientes.',created_at:new Date().toISOString()};
const tickets=[{...base,id:'request',number:1042,status:'requested'},{...base,id:'active',number:1041,status:'active',authorized_by:'reviewer',authorized_at:new Date().toISOString()},{...base,id:'expired',number:1040,status:'active',expires_at:'2026-09-01T20:00:00Z'}];
const events=[{id:'event',company_id:'test',employee_id:'employee',employee_name:'Yeison Escobar',ticket_id:'active',module:'jornadas',action:'update',work_date:'2026-09-05',actor_name:'Ana Rodríguez',occurred_at:new Date().toISOString(),old_values:{turno:'08:00–16:00'},new_values:{turno:'10:00–18:00'},cuts:[{level:1,cutoff_date:'2026-09-15'},{level:2,cutoff_date:'2026-09-10'}]}];
const days=Array.from({length:6},(_,i)=>({employee_id:'employee',work_date:'2026-09-'+String(i+5).padStart(2,'0'),status:i===0?'pending':i===1?'rejected':i===2?'historical':'approved',snapshot:{kind:'shift',name:'Turno de día',start_time:'08:00',end_time:'16:00',is_rest_day:i===1},review:null}));
export const supabase={rpc:async(name,p)=>{
 if(name==='payroll_schedule_days')return{data:days,error:null};
 if(name==='payroll_schedule_cut_summary')return{data:{pending:1,rejected:1,historical:1,approved:3},error:null};
 if(name==='payroll_correction_write'){
  if(p.p_preview)return{data:{requires_ticket:true,operations:p.p_operations,tickets:tickets.filter(t=>t.status==='active'&&new Date(t.expires_at)>new Date())},error:null};
  for(const op of p.p_operations){const d=days.find(d=>d.work_date===op.values.work_date);if(d)d.status=op.values.status;}
  return{data:[],error:null};
 }
 if(name==='payroll_ticket_request'){tickets.unshift({...base,id:crypto.randomUUID(),number:1043,status:'requested',requested_by:'reviewer',start_date:p.p_start,end_date:p.p_end,expires_at:p.p_expires,actions:p.p_actions,reason:p.p_reason});return{data:'new',error:null};}
 if(name==='payroll_ticket_transition'){const t=tickets.find(t=>t.id===p.p_id);t.status=({authorize:'active',reject:'rejected',revoke:'revoked',finish:'finished',cancel:'finished'})[p.p_action];if(p.p_start)t.start_date=p.p_start;if(p.p_end)t.end_date=p.p_end;if(p.p_actions)t.actions=p.p_actions;if(p.p_expires)t.expires_at=p.p_expires;return{data:null,error:null};}
 return{data:[],error:null};
},from:(table)=>{const filters=[];let from=0,to=499;const q={select:()=>q,eq:(k,v)=>{filters.push([k,v]);return q;},order:()=>q,range:(a,b)=>{from=a;to=b;return q;},then:fn=>Promise.resolve({data:(table==='payroll_correction_tickets'?tickets:events).filter(r=>filters.every(([k,v])=>r[k]===v)).slice(from,to+1),error:null}).then(fn)};return q;}};`;
const server = await createServer({ configFile: false, appType: 'custom', optimizeDeps: { entries: [] }, root: process.cwd(), resolve: { alias: { '@': resolve('src') } },
  plugins: [{ name: 'correction-fixture', enforce: 'pre', resolveId(id) {
    if (/contexts\/AuthContext(?:\.tsx)?$/.test(id)) return '\0correction-auth';
    if (/integrations\/supabase\/client(?:\.ts)?$/.test(id)) return '\0correction-client';
    if (/hooks\/useEmployees(?:\.ts)?$/.test(id)) return '\0correction-employees';
    if (/hooks\/useCompanies(?:\.ts)?$/.test(id)) return '\0correction-centers';
    if (id === 'correction-preview') return '\0correction-preview';
  }, load(id) {
    if (id === '\0correction-auth') return `export const useAuth=()=>({currentCompanyId:'test',user:{id:location.search.includes('operator')?'operator':'reviewer'},hasPermission:()=>!location.search.includes('readonly')});`;
    if (id === '\0correction-client') return fixture;
    if (id === '\0correction-employees') return `export const useEmployees=()=>({data:[{id:'employee',first_name:'Yeison',last_name:'Escobar',document_number:'123456'}]});`;
    if (id === '\0correction-centers') return `export const useOperationCenters=()=>({data:[{id:'north',name:'Centro Norte'}]});`;
    if (id === '\0correction-preview') return `import React from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter} from 'react-router-dom';import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';import {Toaster} from 'sonner';import Tickets from '/src/pages/PermisosCorreccion.tsx';import {ScheduleReviewControl} from '/src/components/schedules/ScheduleReviewControl.tsx';import {fetchScheduleDays} from '/src/lib/payrollCorrections.ts';import '/src/index.css';
    function App(){const r=useQuery({queryKey:['schedule-reviews'],queryFn:()=>fetchScheduleDays('test',['employee'],'2026-09-05','2026-09-10')});return React.createElement(React.Fragment,null,React.createElement('nav',{className:'flex gap-4 border-b p-4'},React.createElement('a',{href:'/'},'Tickets'),React.createElement('a',{href:'/?calendar'},'Calendario')),location.search.includes('calendar')?React.createElement('div',{className:'p-6'},React.createElement('h1',{className:'mb-4 text-2xl font-semibold'},'Jornadas · Centro Norte'),React.createElement(ScheduleReviewControl,{employees:[{id:'employee',first_name:'Yeison',last_name:'Escobar'}],start:'2026-09-05',end:'2026-09-10',selection:[],days:r.data,loading:r.isLoading,error:r.error})):React.createElement(Tickets),React.createElement(Toaster));}
    createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider,{client:new QueryClient()},React.createElement(MemoryRouter,null,React.createElement(App))));`;
  } }, react()], server: { host: '127.0.0.1', port: 5201, strictPort: true } });
server.middlewares.use(async (req, res, next) => {
  if (req.url?.split('?')[0] !== '/') return next();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(await server.transformIndexHtml('/', '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Jornadas y permisos · Prueba visual</title></head><body><div id="root"></div><script type="module" src="/@id/__x00__correction-preview"></script></body></html>'));
});
await server.listen();
console.log('Visual fixture: http://127.0.0.1:5201 (simulated data only; ?calendar, ?operator, ?readonly)');
