import { supabase } from "@/integrations/supabase/client";
import { clockErrors } from "./timeClock";

// Isolate new RPC typing until the generated database types are updated.
const rpcClient = supabase as unknown as {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};
export async function clockRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await rpcClient.rpc(name, args);
  if (error) throw new Error(clockErrors[error.message] || error.message);
  return data as T;
}
export async function publicClock<T>(
  operation: string,
  payload: Record<string, unknown>,
): Promise<T> {
  if (!navigator.onLine)
    throw new Error(
      "Sin conexión. Conéctate y reintenta, o solicita una marcación supervisada.",
    );
  const { data, error } = await supabase.functions.invoke("public-time-clock", {
    body: { operation, payload },
  });
  let code = data?.error;
  if (error && "context" in error && error.context instanceof Response) {
    const body = await error.context.json().catch(() => null);
    code = body?.error;
  }
  if (error || code)
    throw new Error(clockErrors[code] || clockErrors.SERVICE_UNAVAILABLE);
  return data as T;
}
