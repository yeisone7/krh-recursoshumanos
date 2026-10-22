import { supabase } from '@/integrations/supabase/client';

export const DOTATION_ACCEPTANCE_VERSION = 'dotation-received-v1';
export const DOTATION_ACCEPTANCE_TEXT = 'Confirmo haber recibido los artículos relacionados';

export class DotationSignatureError extends Error {
  constructor(message: string, public code?: string) { super(message); }
}

export async function callDotationSignature<T>(body: Record<string, unknown>, publicRequest = false): Promise<T> {
  // Public requests deliberately do not read or persist an employee session.
  const jwt = publicRequest ? undefined : (await supabase.auth.getSession()).data.session?.access_token;
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-dotation-signature`, {
      method: 'POST', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new DotationSignatureError('No fue posible conectar. Revisa tu conexión e intenta nuevamente.');
  }
  const data = await response.json().catch(() => ({ error: 'El servicio no está disponible. Intenta nuevamente.' }));
  if (!data || !response.ok || data.error) throw new DotationSignatureError(data?.error || 'No fue posible procesar la firma.', data?.code);
  return data as T;
}

export async function getDotationSignatureUrl(transaction: { signature_path?: string | null; signature_url?: string | null }): Promise<string | null> {
  if (!transaction.signature_path) return transaction.signature_url || null;
  const { data, error } = await supabase.storage.from('dotation-signatures').createSignedUrl(transaction.signature_path, 300);
  if (error || !data?.signedUrl) throw error || new Error('No fue posible cargar la firma.');
  return data.signedUrl;
}
