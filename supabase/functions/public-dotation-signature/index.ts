import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.91.1';
import { decode as decodePng } from 'npm:fast-png@6.4.0';
import { getPublishableKey, getSecretKey } from '../_shared/apiKeys.ts';
import { hashIp, signToken, verifyToken } from './token.ts';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json', 'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const messages: Record<string, string> = {
  invalid_link: 'El enlace no es válido o venció. Solicita uno nuevo a Recursos Humanos.',
  expired: 'El enlace venció. Solicita uno nuevo a Recursos Humanos.',
  already_signed: 'Esta entrega ya tiene una firma registrada.',
  invalid_identity: 'La cédula no corresponde a esta entrega.',
  rate_limited: 'Demasiados intentos. Intenta nuevamente en 15 minutos.',
  changed: 'La entrega cambió. Vuelve a identificarte para revisar los artículos actualizados.',
};
const failure = (code: string) => reply({ code, error: messages[code] || 'No fue posible procesar la solicitud.' }, code === 'rate_limited' ? 429 : code === 'already_signed' || code === 'changed' ? 409 : 400);

function signatureBytes(value: unknown): Uint8Array | null {
  if (typeof value !== 'string' || value.length > 1400000 || !value.startsWith('data:image/png;base64,')) return null;
  try {
    const bytes = Uint8Array.from(atob(value.slice(22)), c => c.charCodeAt(0));
    if (bytes.length > 1048576 || bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((b,i) => bytes[i]===b)) return null;
    const view = new DataView(bytes.buffer);
    const width = view.getUint32(16), height = view.getUint32(20);
    if (width < 100 || height < 60 || width > 1600 || height > 800) return null;
    const png = decodePng(bytes);
    if (png.depth !== 8 || ![3,4].includes(png.channels)) return null;
    let ink = 0;
    for (let i=0; i<png.data.length; i+=png.channels) {
      if ((png.channels === 3 || png.data[i+3] > 32) && Math.min(png.data[i],png.data[i+1],png.data[i+2]) < 220) ink++;
      if (ink >= 12) return bytes;
    }
    return null;
  } catch { return null; }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply({ error: 'Método no permitido.' },405);
  // No request bodies, documents, signatures, or tokens are logged.
  let uploadedPath: string | null = null;
  let committed = false;
  let admin: SupabaseClient | null = null;
  try {
    const secret = Deno.env.get('DOTATION_SIGNATURE_SECRET');
    const url = Deno.env.get('SUPABASE_URL');
    if (!secret || secret.length < 32 || !url) return reply({ error: 'Firma móvil temporalmente no disponible.' },503);
    if (!req.headers.get('content-type')?.includes('application/json')) return reply({ error:'Contenido no válido.' },415);
    if (Number(req.headers.get('content-length')) > 1450000) return reply({ error:'Solicitud demasiado grande.' },413);
    // Bound the body before JSON parsing even when Content-Length is absent.
    const reader = req.body?.getReader();
    if (!reader) return reply({ error:'Contenido no válido.' },400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const {value,done} = await reader.read(); if (done) break;
      length += value.length;
      if (length > 1450000) { await reader.cancel(); return reply({error:'Solicitud demasiado grande.'},413); }
      chunks.push(value);
    }
    const raw = new Uint8Array(length); let offset=0;
    for (const chunk of chunks) { raw.set(chunk,offset); offset+=chunk.length; }
    const body = JSON.parse(new TextDecoder().decode(raw));
    if (!body || typeof body !== 'object') return reply({error:'Solicitud inválida.'},400);
    admin = createClient(url,getSecretKey(),{ auth:{persistSession:false,autoRefreshToken:false} });
    if (body.action === 'generate') {
      const authorization = req.headers.get('authorization') || '';
      const jwt = authorization.replace(/^Bearer\s+/i,'');
      const {data:{user},error} = await admin.auth.getUser(jwt);
      if (error || !user) return reply({error:'Inicia sesión para generar el enlace.'},401);
      const client = createClient(url,getPublishableKey(),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
      const {data:context,error:accessError} = await client.rpc('authorize_dotation_signature',{p_transaction_id:body.transaction_id});
      if (accessError || !context) return reply({error:'No tienes permiso para solicitar esta firma.'},403);
      if (context.signed) return failure('already_signed');
      const now = Math.floor(Date.now()/1000);
      const token = await signToken({v:1,purpose:'dotation-signature',transaction_id:context.id,company_id:context.company_id,employee_id:context.employee_id,iat:now,exp:now+86400},secret);
      return reply({token,expires_at:new Date((now+86400)*1000).toISOString()});
    }
    if (!['identify','submit'].includes(body.action)) return reply({error:'Operación no válida.'},400);
    const token = await verifyToken(body.token,secret);
    if (!token) return failure('invalid_link');
    if (typeof body.document !== 'string' || body.document.length > 30) return failure('invalid_identity');
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
    const args = {p_transaction_id:token.transaction_id,p_company_id:token.company_id,p_employee_id:token.employee_id,p_document:body.document,p_ip_hash:await hashIp(ip,secret)};
    const {data:context,error:identifyError} = await admin.rpc('identify_dotation_signature',args);
    if (identifyError || !context) return reply({error:'No fue posible verificar la entrega.'},500);
    if (context.code !== 'ok') return failure(context.code);
    if (body.action === 'identify') return reply(context);
    if (body.accepted !== true || body.acceptance_version !== 'dotation-received-v1') return reply({error:'Confirma que recibiste los artículos.'},400);
    if (typeof body.review_hash !== 'string' || body.review_hash !== context.review_hash) return failure('changed');
    const bytes = signatureBytes(body.signature);
    if (!bytes) return reply({error:'Dibuja una firma válida antes de confirmar.'},400);
    uploadedPath = `${token.company_id}/${token.transaction_id}/${crypto.randomUUID()}.png`;
    const {error:uploadError} = await admin.storage.from('dotation-signatures').upload(uploadedPath,bytes,{contentType:'image/png',upsert:false});
    if (uploadError) { uploadedPath=null; return reply({error:'No se pudo guardar la firma. Intenta nuevamente.'},500); }
    const {data:result,error:saveError} = await admin.rpc('accept_dotation_signature',{
      ...args,p_review_hash:body.review_hash,p_path:uploadedPath,p_expires_at:new Date(token.exp*1000).toISOString(),
    });
    if (saveError || !result) {
      // Resolve an ambiguous response before considering cleanup: never remove a committed signature.
      const {data:tx,error:readError} = await admin.from('dotation_delivery_transactions').select('signature_path,signed_at').eq('id',token.transaction_id).single();
      if (readError) { committed=true; return reply({error:'No se pudo confirmar el resultado. Vuelve a consultar la entrega.'},503); }
      if (tx.signature_path===uploadedPath) { committed=true; return reply({code:'ok',signed_at:tx.signed_at}); }
      return reply({error:'No fue posible registrar la aceptación. Intenta nuevamente.'},500);
    }
    if (result.code !== 'ok') return failure(result.code);
    committed=true;
    return reply({code:'ok',signed_at:result.signed_at});
  } catch {
    return reply({error:'No fue posible procesar la solicitud.'},400);
  } finally {
    if (uploadedPath && !committed && admin) {
      const {error} = await admin.storage.from('dotation-signatures').remove([uploadedPath]);
      if (error) console.error('Unattached dotation signature cleanup failed.');
    }
  }
});
