export interface SignatureToken {
  v: 1;
  purpose: 'dotation-signature';
  transaction_id: string;
  company_id: string;
  employee_id: string;
  iat: number;
  exp: number;
}

const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const key = (secret: string) => crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

export async function signToken(payload: SignatureToken, secret: string): Promise<string> {
  const body = encode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(body));
  return `${body}.${encode(new Uint8Array(signature))}`;
}

export async function verifyToken(token: unknown, secret: string, now = Math.floor(Date.now() / 1000)): Promise<SignatureToken | null> {
  if (typeof token !== 'string' || token.length > 2048) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))) return null;
    if (!(await crypto.subtle.verify('HMAC', await key(secret), decode(parts[1]), new TextEncoder().encode(parts[0])))) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[0]))) as SignatureToken;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (payload.v !== 1 || payload.purpose !== 'dotation-signature'
      || ![payload.transaction_id, payload.company_id, payload.employee_id].every(id => typeof id === 'string' && uuid.test(id))
      || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)
      || payload.iat > now || payload.exp <= now || payload.exp - payload.iat !== 86400) return null;
    return payload;
  } catch { return null; }
}

export async function hashIp(ip: string, secret: string): Promise<string> {
  const digest = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(`dotation-ip:${ip}`));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
