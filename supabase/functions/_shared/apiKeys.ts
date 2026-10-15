// Supabase injects these JSON maps into Edge Functions. Do not fall back to
// JWT-based API keys: deployments must keep working after legacy keys are revoked.
function defaultKey(variable: string, prefix: string): string {
  const raw = Deno.env.get(variable);
  let keys: unknown;
  try {
    keys = JSON.parse(raw || "{}");
  } catch {
    throw new Error(`Invalid ${variable} configuration`);
  }
  const key = keys && typeof keys === "object" && !Array.isArray(keys)
    ? (keys as Record<string, unknown>).default
    : undefined;
  if (typeof key !== "string" || !key.startsWith(prefix) || key.length <= prefix.length) {
    throw new Error(`Missing default modern API key in ${variable}`);
  }
  return key;
}

export function getPublishableKey(): string {
  return defaultKey("SUPABASE_PUBLISHABLE_KEYS", "sb_publishable_");
}

export function getSecretKey(): string {
  return defaultKey("SUPABASE_SECRET_KEYS", "sb_secret_");
}
